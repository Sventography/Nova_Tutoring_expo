import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ========== FUZZY MATCHING (inline) ========== */
function norm(s: string) {
  return (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string) { return norm(s).split(" ").filter(Boolean); }
function lev(a: string, b: string) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  const dp = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}
const ALIASES: Record<string,string[]> = {
  "pencil lead": ["graphite","lead","pencil","pencil graphite","pencil tip"],
  "piano": ["keyboard","musical keyboard"],
  "towel": ["a towel"], "bottle": ["a bottle"], "egg": ["an egg"], "echo": ["an echo"],
  "comb": ["a comb"], "stamp": ["a stamp","postage stamp"],
  "artichoke": ["an artichoke"], "light": ["a light","sunlight","lamp light"],
};
function aliasOK(user: string, real: string) {
  const r = norm(real), u = norm(user);
  const arr = ALIASES[r] || [];
  if (arr.map(norm).includes(u)) return true;
  // reverse: user typed a canonical term while real is in alias list
  for (const [canon, list] of Object.entries(ALIASES)) {
    if (norm(canon) === u && list.map(norm).includes(r)) return true;
  }
  return false;
}
function isFuzzyCorrect(user: string, real: string) {
  const u = norm(user), r = norm(real);
  if (!u) return false;
  if (u === r) return true;
  const uTok = new Set(tokens(u)), rTok = new Set(tokens(r));
  if ([...rTok].every(t => uTok.has(t)) || [...uTok].every(t => rTok.has(t))) return true;
  if (aliasOK(u, r)) return true;
  const d = lev(u, r), L = Math.max(u.length, r.length);
  if ((L <= 5 && d <= 1) || (L <= 9 && d <= 2) || (L > 9 && d <= 3)) return true;
  // token jaccard
  const inter = [...uTok].filter(t=>rTok.has(t)).length;
  const uni = uTok.size + rTok.size - inter;
  if (uni ? inter/uni >= 0.6 : true) return true;
  return false;
}

/* ========== OPTIONAL COINS / TOAST (safe) ========== */
function useCoinsSafe(): { addCoins?: (n:number)=>void } | null {
  try { return require("../context/CoinsContext").useCoins?.(); } catch { return null; }
}
function useToastSafe(): { show:(m:string)=>void, success:(m:string)=>void } {
  try {
    const t = require("../context/ToastContext").useToast?.();
    return {
      show: (m)=> (t?.show ?? ((x:string)=>Alert.alert("Notice", x)))(m),
      success: (m)=> (t?.success ?? t?.show ?? ((x:string)=>Alert.alert("Success", x)))(m),
    };
  } catch {
    return { show:(m)=>Alert.alert("Notice", m), success:(m)=>Alert.alert("Success", m) };
  }
}

/* ========== DAILY COUNTER (local, simple) ========== */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `riddles:${y}-${m}-${day}:count`;
}
async function getCount() { return parseInt((await AsyncStorage.getItem(todayKey())) || "0", 10) || 0; }
async function incrCount() { const n = await getCount(); await AsyncStorage.setItem(todayKey(), String(n+1)); return n+1; }

/* ========== RIDDLES SOURCE ========== */
type Riddle = { q: string; a: string };
function useRiddles(): Riddle[] {
  try { const mod = require("../_lib/riddles"); return (mod.RIDDLES ?? mod.default ?? []) as Riddle[]; }
  catch {
    return [
      { q: "I’m taken from a mine, and shut up in a wooden case, from which I am never released, yet used by almost everyone. What am I?", a: "pencil lead" },
      { q: "What has keys but can’t open locks?", a: "piano" },
      { q: "What gets wetter the more it dries?", a: "towel" },
      { q: "What has a neck but no head?", a: "bottle" },
      { q: "What has to be broken before you can use it?", a: "egg" },
      { q: "I speak without a mouth and hear without ears. What am I?", a: "echo" },
      { q: "What has many teeth but cannot bite?", a: "comb" },
      { q: "What can travel around the world while staying in the corner?", a: "stamp" },
      { q: "What has a heart that doesn’t beat?", a: "artichoke" },
      { q: "What can fill a room but takes up no space?", a: "light" },
    ];
  }
}

/* ========== COMPONENT ========== */
export default function BrainteasersTab() {
  const riddles = useRiddles();
  const coins = useCoinsSafe();
  const toast = useToastSafe();

  // choose 2 per session
  const pair = useMemo(() => {
    const a = [...riddles]; a.sort(()=>Math.random()-0.5); return a.slice(0,2);
  }, [riddles]);

  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [banner, setBanner] = useState("");
  const [locked, setLocked] = useState(false);
  const [leftToday, setLeftToday] = useState<number | null>(null);
  const [debug, setDebug] = useState(false);

  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    (async () => {
      const used = await getCount();
      setLeftToday(Math.max(0, 2 - used));
      if (used >= 2) setBanner("You’ve done today’s 2 riddles. Come back tomorrow ✨");
    })();
  }, []);

  function show(msg: string, ms = 1400) {
    setBanner(msg);
    if (ms > 0) setTimeout(()=>setBanner(""), ms);
  }

  async function submit() {
    if (locked) return;
    const used = await getCount();
    if (used >= 2) { show("Daily limit reached. See you tomorrow ✨", 1800); return; }

    const cur = pair[idx];
    if (!cur) return;

    setLocked(true);
    const ok = isFuzzyCorrect(answer, cur.a);
    const newUsed = await incrCount();
    setLeftToday(Math.max(0, 2 - newUsed));

    if (ok) {
      coins?.addCoins?.(2);
      toast.success("Correct! +2 coins");
      show("Correct! +2 coins");
    } else {
      show(`Close! Answer: ${cur.a}`, 1600);
    }
    setResults(prev => [...prev, !!ok]);

    setTimeout(async () => {
      if (idx === 0) {
        setIdx(1);
        setAnswer("");
        setLocked(false);
        setTimeout(()=>inputRef.current?.focus?.(), 50);
      } else {
        const allCorrect = [...results, !!ok].every(Boolean);
        if (allCorrect) {
          coins?.addCoins?.(10);
          toast.success("Perfect! +10 bonus");
          show("Perfect! +10 bonus ✨", 1800);
        } else {
          show("Nice try! See you tomorrow ✨", 1800);
        }
        setLocked(true);
      }
    }, 900);
  }

  const cur = pair[idx];
  const left = leftToday ?? 2;

  return (
    <LinearGradient colors={["#000000", "#0B2239"]} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <View style={S.header}>
          <Pressable onLongPress={()=>setDebug(d=>!d)}><Text style={S.title}>Brainteasers</Text></Pressable>
          <Text style={S.subtle}>{results.length}/2 answered</Text>
        </View>

        {banner ? <View style={S.banner}><Text style={S.bannerTxt}>{banner}</Text></View> : null}

        {left <= 0 && results.length >= 2 ? (
          <View style={S.center}><Text style={S.locked}>You’ve completed today’s riddles.</Text></View>
        ) : (
          <>
            <Text style={S.qMeta}>Question {idx + 1} / 2</Text>
            <Text style={S.qText}>{cur?.q}</Text>

            <TextInput
              ref={(r)=> (inputRef.current = r)}
              style={S.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Type your answer…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none" autoCorrect={false}
              returnKeyType="done" onSubmitEditing={submit}
              editable={!locked && left > 0}
            />

            <Pressable style={[S.btn, answer ? S.btnReady : S.btnDisabled]} onPress={submit} disabled={!answer || locked}>
              <Text style={S.btnTxt}>{locked ? "…" : "Submit"}</Text>
            </Pressable>

            <Text style={S.left}>{Math.max(0, left - (results.length ? 1 : 0))} left today</Text>
          </>
        )}

        {debug && (
          <View style={S.debug}>
            <Text style={S.debugTxt}>idx={idx} leftToday={leftToday} locked={String(locked)}</Text>
            <Text style={S.debugTxt}>results=[{results.join(",")}] answer="{answer}"</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: "#00E5FF", fontWeight: "800", fontSize: 20 },
  subtle: { color: "rgba(255,255,255,0.7)" },
  qMeta: { color: "#9fe", marginTop: 6, marginBottom: 4 },
  qText: { color: "#fff", fontSize: 18, lineHeight: 24, marginBottom: 10 },

  input: { borderWidth: 1.5, borderColor: "rgba(0,229,255,0.35)", borderRadius: 12,
           paddingHorizontal: 12, paddingVertical: 10, color: "#fff", backgroundColor: "rgba(0,0,0,0.35)" },

  btn: { marginTop: 10, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1.5 },
  btnReady: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.15)" },
  btnDisabled: { borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)" },
  btnTxt: { color: "#fff", fontWeight: "800" },

  banner: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
            backgroundColor: "rgba(0,229,255,0.12)", borderWidth: 1, borderColor: "#00E5FF" },
  bannerTxt: { color: "#00E5FF", fontWeight: "700" },

  left: { marginTop: 8, color: "#9fe" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  locked: { color: "#fff", fontSize: 16, opacity: 0.85 },

  debug: { marginTop: 14, padding: 8, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.35)", borderColor: "#0ff", borderWidth: 1 },
  debugTxt: { color: "#9fe", fontSize: 12 },
});
