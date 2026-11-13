import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addCoins } from "../lib/wallet";
import bus from "../lib/bus";
import { useThemeColors } from "../providers/ThemeBridge";

const K_LAST = "daily.last_checkin";
const K_STREAK = "daily.streak";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DailyCheckin() {
  const palette = useThemeColors();
  const [streak, setStreak] = useState(0);
  const [claimed, setClaimed] = useState(false);

  async function load() {
    const lastStr = await AsyncStorage.getItem(K_LAST);
    const s = parseInt((await AsyncStorage.getItem(K_STREAK)) || "0", 10) || 0;
    const today = new Date();
    if (lastStr) {
      const last = new Date(lastStr);
      setClaimed(sameDay(last, today));
    } else {
      setClaimed(false);
    }
    setStreak(s);
  }

  useEffect(() => {
    load();
  }, []);

  async function claim() {
    if (claimed) return;
    const today = new Date();
    const lastStr = await AsyncStorage.getItem(K_LAST);
    let s = parseInt((await AsyncStorage.getItem(K_STREAK)) || "0", 10) || 0;

    if (lastStr) {
      const last = new Date(lastStr);
      const diff = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (diff === 1) s += 1;
      else if (!sameDay(last, today)) s = 1;
    } else {
      s = 1;
    }

    let reward = 25;
    if (s > 0 && s % 7 === 0) reward += 50;

    await addCoins(reward);
    await AsyncStorage.setItem(K_LAST, today.toISOString());
    await AsyncStorage.setItem(K_STREAK, String(s));
    setStreak(s);
    setClaimed(true);
    bus.emit("wallet_changed");
  }

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: palette.card,
        borderColor: palette.border,
        borderWidth: 1,
      }}
    >
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>
        Daily Check-In
      </Text>
      <Text style={{ color: palette.subtext, marginTop: 6 }}>
        Streak: {streak} day{streak === 1 ? "" : "s"} • +25 coins daily
        {streak > 0 && streak % 7 === 0 ? " +50 bonus!" : ""}
      </Text>
      <View style={{ height: 10 }} />
      <Pressable
        disabled={claimed}
        onPress={claim}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: claimed ? "#334155" : palette.accent,
          backgroundColor: pressed ? "#07131d" : "#06121a",
          opacity: claimed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: claimed ? "#94a3b8" : palette.accent,
            fontWeight: "800",
          }}
        >
          {claimed ? "Already Claimed Today" : "Claim +25 Coins"}
        </Text>
      </Pressable>
    </View>
  );
}
