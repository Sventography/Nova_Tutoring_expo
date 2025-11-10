import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Alert, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function todayKey(k: string) { return `riddles:${todayISO()}:${k}`; }

function useToastSafe(): { info:(t:string,m?:string)=>void, success:(t:string,m?:string)=>void } {
  try {
    const t = require("../context/ToastContext").useToast?.();
    return {
      info: (title, msg) => (t?.show ?? ((x:string)=>Alert.alert("Notice", x)))(msg ?? title),
      success: (title, msg) => (t?.success ?? t?.show ?? ((x:string)=>Alert.alert("Success", x)))(msg ?? title),
    };
  } catch {
    return { info:(t,m)=>Alert.alert("Notice", m ?? t), success:(t,m)=>Alert.alert("Success", m ?? t) };
  }
}

export default function DevTest() {
  const toast = useToastSafe();
  const coinsCtx = (() => {
    try { return require("../context/CoinsContext").useCoins?.(); } catch { return null; }
  })();
  const achCtx = (() => {
    try { return require("../context/AchievementsContext").useAchievements?.(); } catch { return null; }
  })();

  const [balance, setBalance] = useState<number>(0);
  const [achState, setAchState] = useState<any>(null);

  async function refresh() {
    try {
      const b = Number(coinsCtx?.balance ?? 0);
      setBalance(b);
    } catch {}
    try {
      const s = achCtx?.state ?? null;
      setAchState(s);
    } catch {}
  }

  useEffect(() => {
    const id = setInterval(refresh, 500);
    return () => clearInterval(id);
  }, []);

  async function resetBrainteasersToday() {
    await AsyncStorage.multiRemove([
      todayKey("count"),
      todayKey("correct"),
      todayKey("bonus"),
      todayKey("done")
    ]);
    toast.success("Brainteasers reset", "Daily state cleared");
  }

  function grantCoins(n: number, reason?: string) {
    if (typeof coinsCtx?.addCoins === "function") coinsCtx.addCoins(n, reason);
    else if (typeof coinsCtx?.add === "function") coinsCtx.add(n, reason);
    else if (typeof coinsCtx?.grant === "function") coinsCtx.grant(n, reason);
    else if (typeof coinsCtx?.credit === "function") coinsCtx.credit(n, reason);
    else if (typeof coinsCtx?.setBalance === "function") {
      const cur = Number(coinsCtx?.balance ?? 0);
      coinsCtx.setBalance(cur + n);
    }
    toast.success(`+${n} coins`, reason ?? "manual grant");
  }

  async function simulateRiddleCorrect() {
    grantCoins(2, "Brainteasers");
  }

  async function simulateRiddleBothCorrect() {
    grantCoins(2, "Brainteasers");
    grantCoins(2, "Brainteasers");
    grantCoins(10, "Brainteasers bonus");
    await AsyncStorage.setItem(todayKey("bonus"), "1");
    await AsyncStorage.setItem(todayKey("done"), "1");
    toast.success("Both correct", "+10 bonus");
  }

  async function triggerQuizAchievement90() {
    try {
      if (typeof achCtx?.onQuizFinished === "function") {
        await achCtx.onQuizFinished(95, "Algebra");
        toast.success("Quiz achievement", "onQuizFinished(95, Algebra)");
      } else {
        toast.info("No onQuizFinished", "Hook not exposed; using emitter");
        const E = require("react-native").DeviceEventEmitter;
        E.emit("ACHIEVEMENT_EVENT", { type: "quizFinished", scorePct: 95, subject: "Algebra" });
      }
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  async function triggerLoginStreakAchievement() {
    try {
      if (typeof achCtx?.checkDailyLogin === "function") {
        await achCtx.checkDailyLogin();
        toast.success("Streak check", "checkDailyLogin()");
      } else {
        toast.info("No checkDailyLogin", "Implement in AchievementsContext");
      }
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={S.wrap}>
      <Text style={S.h1}>Dev Test</Text>
      <View style={S.card}>
        <Text style={S.label}>Coins</Text>
        <Text style={S.value}>{balance}</Text>
        <View style={S.row}>
          <Pressable style={S.btn} onPress={()=>grantCoins(2,"Manual test")}><Text style={S.btnt}>+2</Text></Pressable>
          <Pressable style={S.btn} onPress={()=>grantCoins(10,"Manual test")}><Text style={S.btnt}>+10</Text></Pressable>
          <Pressable style={S.btn} onPress={()=>grantCoins(100,"Manual test")}><Text style={S.btnt}>+100</Text></Pressable>
        </View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Brainteasers</Text>
        <View style={S.row}>
          <Pressable style={S.btn} onPress={resetBrainteasersToday}><Text style={S.btnt}>Reset today</Text></Pressable>
          <Pressable style={S.btn} onPress={simulateRiddleCorrect}><Text style={S.btnt}>Simulate +2</Text></Pressable>
          <Pressable style={S.btn} onPress={simulateRiddleBothCorrect}><Text style={S.btnt}>Simulate perfect</Text></Pressable>
        </View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Achievements</Text>
        <View style={S.row}>
          <Pressable style={S.btn} onPress={triggerQuizAchievement90}><Text style={S.btnt}>Quiz 95%</Text></Pressable>
          <Pressable style={S.btn} onPress={triggerLoginStreakAchievement}><Text style={S.btnt}>Login streak</Text></Pressable>
        </View>
        <Text style={S.small}>State preview:</Text>
        <Text style={S.mono}>{JSON.stringify(achState ?? {}, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

export const S = StyleSheet.create({
  wrap: { padding: 16, gap: 14, backgroundColor: "#000" },
  h1: { color: "#00E5FF", fontWeight: "800", fontSize: 22 },
  card: { backgroundColor: "#0A0F14", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: "#123" },
  label: { color: "#9fe", marginBottom: 8, fontWeight: "700" },
  value: { color: "#fff", fontSize: 20, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#00E5FF", backgroundColor: "rgba(0,229,255,0.12)" },
  btnt: { color: "#e6f7ff", fontWeight: "800" },
  small: { color: "#9fe", marginTop: 10 },
  mono: { marginTop: 6, color: "#cfe", fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 12 }
});
