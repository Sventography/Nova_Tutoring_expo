import React, { useEffect, useMemo, useRef, useState } from "react";
import { brainteaserSolved, awardCoins } from "../utils/achievements-api";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";

function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string) {
  return norm(s)
    .split(" ")
    .filter(Boolean);
}
function lev(a: string, b: string) {
  a = norm(a);
  b = norm(b);
  const m = a.length,
    n = b.length;
  if (!m || !n) return Math.max(m, n);
  const dp = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}
const ALIASES: Record<string, string[]> = {
  "pencil lead": ["graphite", "lead", "pencil", "pencil graphite", "pencil tip"],
  piano: ["keyboard", "musical keyboard"],
  towel: ["a towel"],
  bottle: ["a bottle"],
  egg: ["an egg"],
  echo: ["an echo"],
  comb: ["a comb"],
  stamp: ["a stamp", "postage stamp"],
  artichoke: ["an artichoke"],
  light: ["a light", "sunlight", "lamp light"],
  future: ["the future"],
  river: ["a river", "the river"],
  bank: ["a bank"],
  mirror: ["a mirror"],
  book: ["a book"],
  library: ["a library"],
  "rubber band": ["a rubber band"],
  dictionary: ["the dictionary"],
  secret: ["a secret"],
  hole: ["a hole"],
  coffin: ["a coffin"],
  map: ["a map"],
  cold: ["a cold"],
  teapot: ["a teapot"],
  needle: ["a needle"],
  tree: ["a tree"],
  "your name": ["name"],
  footsteps: ["steps", "foot steps"],
  clock: ["a clock"],
  penny: ["a penny", "coin"],
  age: ["your age"],
  seven: ["7"],
  edam: [],
  silence: [],
  "letter m": ["the letter m", "m"],
  candle: ["a candle"],
};
function aliasOK(user: string, real: string) {
  const r = norm(real),
    u = norm(user);
  const arr = ALIASES[r] || [];
  if (arr.map(norm).includes(u)) return true;
  for (const [canon, list] of Object.entries(ALIASES)) {
    if (norm(canon) === u && list.map(norm).includes(r)) return true;
  }
  return false;
}
function isFuzzyCorrect(user: string, real: string) {
  const u = norm(user),
    r = norm(real);
  if (!u) return false;
  if (u === r) return true;
  const uTok = new Set(tokens(u)),
    rTok = new Set(tokens(r));
  if ([...rTok].every((t) => uTok.has(t)) || [...uTok].every((t) => rTok.has(t)))
    return true;
  if (aliasOK(u, r)) return true;
  const d = lev(u, r),
    L = Math.max(u.length, r.length);
  if ((L <= 5 && d <= 1) || (L <= 9 && d <= 2) || (L > 9 && d <= 3)) return true;
  const inter = [...uTok].filter((t) => rTok.has(t)).length;
  const uni = uTok.size + rTok.size - inter;
  if (uni ? inter / uni >= 0.6 : true) return true;
  return false;
}

function useCoinsSafe(): { addCoins?: (n: number) => void } | null {
  try {
    return require("../context/CoinsContext").useCoins?.();
  } catch {
    return null;
  }
}
function useToastSafe(): { show: (m: string) => void; success: (m: string) => void } {
  try {
    const t = require("../context/ToastContext").useToast?.();
    return {
      show: (m) => (t?.show ?? ((x: string) => Alert.alert("Notice", x)))(m),
      success: (m) =>
        (t?.success ?? t?.show ?? ((x: string) => Alert.alert("Success", x)))(m),
    };
  } catch {
    return {
      show: (m) => Alert.alert("Notice", m),
      success: (m) => Alert.alert("Success", m),
    };
  }
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayKey(k: string) {
  return `riddles:${todayISO()}:${k}`;
}
async function getCount() {
  return parseInt((await AsyncStorage.getItem(todayKey("count"))) || "0", 10) || 0;
}
async function incrCount() {
  const n = await getCount();
  await AsyncStorage.setItem(todayKey("count"), String(n + 1));
  return n + 1;
}

type Riddle = { q: string; a: string };
const R: Riddle[] = [
  { q: "What has to be broken before you can use it?", a: "egg" },
  { q: "I’m tall when I’m young, and I’m short when I’m old. What am I?", a: "candle" },
  { q: "What month of the year has 28 days?", a: "all" },
  { q: "What is full of holes but still holds water?", a: "sponge" },
  { q: "What question can you never answer yes to?", a: "are you asleep" },
  { q: "What is always in front of you but can’t be seen?", a: "future" },
  {
    q: "There’s a one-story house in which everything is yellow. What color are the stairs?",
    a: "no stairs",
  },
  { q: "What can you break, even if you never pick it up or touch it?", a: "promise" },
  { q: "What goes up but never comes down?", a: "age" },
  {
    q: "A man who was outside in the rain without an umbrella or hat didn’t get a single hair on his head wet. Why?",
    a: "bald",
  },
  { q: "What gets wet while drying?", a: "towel" },
  { q: "I shave every day, but my beard stays the same. Who am I?", a: "barber" },
  { q: "You see me once in June, twice in November, and not at all in May. What am I?", a: "letter e" },
  { q: "I have branches, but no fruit, trunk, or leaves. What am I?", a: "bank" },
  { q: "What can’t talk but will reply when spoken to?", a: "echo" },
  { q: "The more of this there is, the less you see. What is it?", a: "darkness" },
  {
    q: "I’m light as a feather, yet the strongest person can’t hold me for much more than a minute. What am I?",
    a: "breath",
  },
  {
    q: "I have keys but no locks. I have space but no rooms. You can enter, but you can’t go outside. What am I?",
    a: "keyboard",
  },
  { q: "What runs around the whole yard without moving?", a: "fence" },
  { q: "What has many teeth but can’t bite?", a: "comb" },
  { q: "What can travel all around the world without leaving its corner?", a: "stamp" },
  { q: "What has a head, a tail, is brown, and has no legs?", a: "penny" },
  { q: "What invention lets you look right through a wall?", a: "window" },
  {
    q: "If you drop me I’m sure to crack, but give me a smile and I’ll always smile back. What am I?",
    a: "mirror",
  },
  { q: "What has words, but never speaks?", a: "book" },
  { q: "What building has the most stories?", a: "library" },
  { q: "What kind of band never plays music?", a: "rubber band" },
  { q: "Where does today come before yesterday?", a: "dictionary" },
  { q: "What can fill a room but takes up no space?", a: "light" },
  {
    q: "If you have me, you want to share me. If you share me, you don’t have me. What am I?",
    a: "secret",
  },
  { q: "What gets bigger the more you take away?", a: "hole" },
  {
    q: "The person who makes it sells it. The person who buys it never uses it. The person who uses it never knows it. What is it?",
    a: "coffin",
  },
  { q: "What can you keep after giving to someone?", a: "your word" },
  {
    q: "I have cities, but no houses; forests, but no trees; and water, but no fish. What am I?",
    a: "map",
  },
  { q: "What can you catch but not throw?", a: "cold" },
  { q: "What begins with T, ends with T, and has T in it?", a: "teapot" },
  { q: "What five-letter word becomes shorter when you add two letters to it?", a: "short" },
  { q: "What has one eye but can’t see?", a: "needle" },
  { q: "What has many rings but no fingers?", a: "tree" },
  {
    q: "What belongs to you, but other people use it more than you do?",
    a: "your name",
  },
  { q: "The more you take, the more you leave behind. What are they?", a: "footsteps" },
  { q: "I am an odd number. Take away a letter and I become even. What number am I?", a: "seven" },
  { q: "What has a neck but no head?", a: "bottle" },
  { q: "What type of cheese is made backwards?", a: "edam" },
  { q: "What is so fragile that saying its name breaks it?", a: "silence" },
  { q: "What has hands, but can’t clap?", a: "clock" },
  {
    q: "What comes once in a minute, twice in a moment, but never in a thousand years?",
    a: "letter m",
  },
  { q: "What has four wheels and flies?", a: "garbage truck" },
  { q: "What has a face and two hands but no arms or legs?", a: "clock" },
  {
    q: "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?",
    a: "river",
  },
  {
    q: "I’m taken from a mine, and shut up in a wooden case, from which I am never released, yet used by almost everyone. What am I?",
    a: "pencil lead",
  },
];

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86400000);
}
function todayPair() {
  const n = R.length;
  const doy = dayOfYear(new Date());
  const i1 = doy % n;
  const i2 = (doy * 37 + 11) % n;
  const j = i1 === i2 ? (i2 + 1) % n : i2;
  return [R[i1], R[j]];
}

export default function BrainteasersTab() {
  const coins = useCoinsSafe();
  const toast = useToastSafe();
  const { tokens } = useTheme();

  const pairRef = useRef<Riddle[]>(todayPair());
  const pair = pairRef.current;

  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [banner, setBanner] = useState("");
  const [locked, setLocked] = useState(false);
  const [leftToday, setLeftToday] = useState<number | null>(null);
  const [correctMap, setCorrectMap] = useState<{ [k: string]: boolean }>({});

  const STORAGE_CORRECT = useMemo(() => todayKey("correct"), []);
  const STORAGE_BONUS = useMemo(() => todayKey("bonus"), []);
  const STORAGE_DONE = useMemo(() => todayKey("done"), []);

  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    (async () => {
      const used = await getCount();
      setLeftToday(Math.max(0, 2 - used));
      const cm = JSON.parse((await AsyncStorage.getItem(STORAGE_CORRECT)) || "{}");
      setCorrectMap(cm);
      if (used >= 2 || (cm[pair[0].q] && cm[pair[1].q])) {
        setBanner("You’ve done today’s 2 riddles. Come back tomorrow ✨");
        setLocked(true);
      }
    })();
  }, [STORAGE_CORRECT, pair, pair[0].q, pair[1].q]);

  function show(msg: string, ms = 1400) {
    setBanner(msg);
    if (ms > 0) setTimeout(() => setBanner(""), ms);
  }

  async function submit() {
    if (locked) return;
    const used = await getCount();
    if (used >= 2) {
      show("Daily limit reached. See you tomorrow ✨", 1800);
      return;
    }

    const cur = pair[idx];
    if (!cur) return;

    setLocked(true);
    const alreadyCorrect = !!correctMap[cur.q];
    const ok = alreadyCorrect || isFuzzyCorrect(answer, cur.a);
    const newUsed = await incrCount();
    setLeftToday(Math.max(0, 2 - newUsed));

    if (ok && !alreadyCorrect) {
      coins?.addCoins?.(2);
      toast.success("Correct! +2 coins");
      show("Correct! +2 coins");
      const nextMap = { ...correctMap, [cur.q]: true };

      try {
        const totalSolvedToday = Object.keys(nextMap).length;
        brainteaserSolved(totalSolvedToday);
        awardCoins(25, "brainteaser:solve");
      } catch {}
      setCorrectMap(nextMap);
      await AsyncStorage.setItem(STORAGE_CORRECT, JSON.stringify(nextMap));
    } else if (!ok) {
      show(`Close! Answer: ${cur.a}`, 1600);
    }

    setResults((prev) => {
      const arr = [...prev];
      if (arr.length === idx) arr.push(!!ok);
      else arr[idx] = !!ok;
      return arr;
    });

    setTimeout(async () => {
      if (idx === 0) {
        setIdx(1);
        setAnswer("");
        setLocked(false);
        setTimeout(() => inputRef.current?.focus?.(), 50);
      } else {
        const c1 = !!(correctMap[pair[0].q] || (idx === 0 && ok));
        const c2 = !!(correctMap[pair[1].q] || (idx === 1 && ok));
        const both =
          (c1 && c2) || (ok && (correctMap[pair[0].q] || correctMap[pair[1].q]));
        const bonusGiven = (await AsyncStorage.getItem(STORAGE_BONUS)) === "1";
        if (both && !bonusGiven) {
          coins?.addCoins?.(10);
          await AsyncStorage.setItem(STORAGE_BONUS, "1");
          toast.success("Perfect! +10 bonus");
          show("Perfect! +10 bonus ✨", 1800);
        } else {
          show("Nice try! See you tomorrow ✨", 1800);
        }
        await AsyncStorage.setItem(STORAGE_DONE, "1");
        setLocked(true);
      }
    }, 900);
  }

  const cur = pair[idx];
  const left = leftToday ?? 2;

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <View style={S.header}>
          <Text style={[S.title, { color: tokens.text }]}>Brainteasers</Text>
          <Text style={[S.subtle, { color: tokens.cardText }]}>
            {results.length}/2 answered
          </Text>
        </View>
        {banner ? (
          <View
            style={[
              S.banner,
              { backgroundColor: tokens.card, borderColor: tokens.accent },
            ]}
          >
            <Text style={[S.bannerTxt, { color: tokens.accent }]}>{banner}</Text>
          </View>
        ) : null}
        {left <= 0 && results.length >= 2 ? (
          <View style={S.center}>
            <Text style={[S.locked, { color: tokens.text }]}>
              You’ve completed today’s riddles.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[S.qMeta, { color: tokens.cardText }]}>
              Question {idx + 1} / 2
            </Text>
            <Text style={[S.qText, { color: tokens.text }]}>{cur?.q}</Text>
            <TextInput
              ref={(r) => (inputRef.current = r)}
              style={[
                S.input,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                  color: tokens.text,
                },
              ]}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Type your answer…"
              placeholderTextColor={tokens.isDark ? "#678a94" : "#6b7685"}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
              editable={!locked && left > 0}
            />
            <Pressable
              style={[
                S.btn,
                answer
                  ? {
                      borderColor: tokens.accent,
                      backgroundColor: tokens.isDark
                        ? "rgba(0,255,170,0.20)"
                        : "rgba(0,200,140,0.15)",
                    }
                  : {
                      borderColor: tokens.isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.12)",
                      backgroundColor: tokens.isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
              ]}
              onPress={submit}
              disabled={!answer || locked}
            >
              <Text style={[S.btnTxt, { color: tokens.text }]}>
                {locked ? "…" : "Submit"}
              </Text>
            </Pressable>
            <Text style={[S.left, { color: tokens.cardText }]}>
              {Math.max(0, left - (results.length ? 1 : 0))} left today
            </Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontWeight: "800", fontSize: 20 },
  subtle: {},
  qMeta: { marginTop: 6, marginBottom: 4 },
  qText: { fontSize: 18, lineHeight: 24, marginBottom: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  btnTxt: { fontWeight: "800" },
  banner: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerTxt: { fontWeight: "700" },
  left: { marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  locked: { fontSize: 16, opacity: 0.85 },
});
