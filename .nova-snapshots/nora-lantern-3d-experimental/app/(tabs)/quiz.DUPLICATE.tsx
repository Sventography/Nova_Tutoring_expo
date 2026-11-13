import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { listTopics, getCardsById } from "../_lib/flashcards";
import { useTheme } from "../context/ThemeContext";

// Optional app hooks (safe if missing)
let useCoins: any = null;
let showToast: any = null;
let reportQuizFinished: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useCoins = require("../context/CoinsContext").useCoins;
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  showToast = require("../utils/toast").showToast;
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  reportQuizFinished = require("../utils/reportQuizFinished").reportQuizFinished;
} catch {}

type QA = { id: string; front: string; back: string };
type QuizResult = {
  id: string;
  ts: number;
  topic: string;
  total: number;
  correct: number;
  seconds: number;
};

const HISTORY_KEY = "quizHistory.v1";

function nowId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick20(cards: QA[]) {
  if (cards.length <= 20) return cards;
  return shuffle(cards).slice(0, 20);
}

function fmtTime(s: number) {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(mm)}:${pad(ss)}`;
}

export default function QuizScreen() {
  const { tokens } = useTheme();

  const coinsApi = typeof useCoins === "function" ? useCoins() : null;
  const addCoins = coinsApi?.addCoins;

  const topics = useMemo(() => {
    try {
      return listTopics();
    } catch {
      return [];
    }
  }, []);

  const [topic, setTopic] = useState<string | null>(null);
  const [cards, setCards] = useState<QA[]>([]);
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  // 5 min timer
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const startTsRef = useRef<number | null>(null);

  const current = cards[idx];

  const pct = cards.length ? Math.round((correct / cards.length) * 100) : 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0 && !done) {
      finishQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  useEffect(() => {
    if (!current) return;

    // Build 4 choices: correct back + 3 distractors
    const correctAns = current.back;

    const pool = cards
      .map((c) => c.back)
      .filter((b) => b && b !== correctAns);

    const distractors = shuffle(pool).slice(0, 3);

    const opts = shuffle([correctAns, ...distractors]);
    setChoices(opts);
    setPicked(null);
  }, [idx, current, cards]);

  function resetSession() {
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
    setSecondsLeft(5 * 60);
    setRunning(false);
    startTsRef.current = null;
  }

  function startTopic(t: string) {
    try {
      const raw = getCardsById(t) as any[];
      const normalized: QA[] = (raw || [])
        .map((x: any, i: number) => ({
          id: String(x?.id ?? `${t}_${i}`),
          front: String(x?.front ?? x?.q ?? x?.question ?? ""),
          back: String(x?.back ?? x?.a ?? x?.answer ?? ""),
        }))
        .filter((c) => c.front && c.back);

      const twenty = pick20(normalized);

      if (!twenty.length) {
        Alert.alert("No questions", "This topic doesn't have any cards yet.");
        return;
      }

      setTopic(t);
      setCards(twenty);
      resetSession();

      // start timer
      setRunning(true);
      startTsRef.current = Date.now();
    } catch (e: any) {
      Alert.alert("Quiz error", String(e?.message ?? e));
    }
  }

  function choose(ans: string) {
    if (done) return;
    if (picked) return; // prevent double-tap

    setPicked(ans);

    const isRight = ans === current?.back;
    if (isRight) setCorrect((c) => c + 1);

    // brief delay then advance
    setTimeout(() => {
      if (idx + 1 >= cards.length) {
        finishQuiz(isRight ? 1 : 0);
      } else {
        setIdx((i) => i + 1);
      }
    }, 350);
  }

  async function appendHistory(entry: QuizResult) {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const arr: QuizResult[] = raw ? JSON.parse(raw) : [];
      arr.unshift(entry);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 200)));
    } catch {}
  }

  async function finishQuiz(lastIncrement: number = 0) {
    setDone(true);
    setRunning(false);

    const startedAt = startTsRef.current ?? Date.now();
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    const finalCorrect = Math.min(cards.length, correct + lastIncrement);
    const result: QuizResult = {
      id: nowId(),
      ts: Date.now(),
      topic: topic ?? "Unknown",
      total: cards.length,
      correct: finalCorrect,
      seconds: elapsed,
    };

    await appendHistory(result);

    // Optional coin reward (small + safe)
    try {
      const earned = finalCorrect >= Math.ceil(cards.length * 0.8) ? 25 : 10;
      if (typeof addCoins === "function") addCoins(earned);
      if (typeof showToast === "function") showToast(`+${earned} coins`);
    } catch {}

    // Optional: existing certificate/achievement pipeline
    try {
      if (typeof reportQuizFinished === "function") {
        await reportQuizFinished({
          topic: result.topic,
          total: result.total,
          correct: result.correct,
          seconds: result.seconds,
        });
      }
    } catch {}
  }

  function exitToTopics() {
    setTopic(null);
    setCards([]);
    resetSession();
  }

  const bg = tokens?.gradient ?? ["#000000", "#06121a"];
  const cardBg = tokens?.card ?? "rgba(0,0,0,0.35)";
  const border = tokens?.border ?? "rgba(255,255,255,0.15)";
  const text = tokens?.text ?? "#e8fbff";
  const sub = tokens?.cardText ?? "rgba(232,251,255,0.78)";
  const accent = tokens?.accent ?? "#5cfcc8";

  return (
    <LinearGradient colors={bg} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.wrap}>
        {!topic ? (
          <View style={[S.panel, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[S.h1, { color: accent }]}>Quiz</Text>
            <Text style={[S.p, { color: sub }]}>
              Pick a topic to start a 20-question quiz. You have 5 minutes.
            </Text>

            <View style={{ height: 10 }} />

            {topics.map((t) => (
              <Pressable
                key={t}
                onPress={() => startTopic(t)}
                style={[S.topicBtn, { borderColor: border, backgroundColor: "rgba(0,0,0,0.25)" }]}
              >
                <Text style={[S.topicText, { color: text }]} numberOfLines={1}>
                  {t}
                </Text>
                <Text style={[S.topicHint, { color: sub }]}>Start</Text>
              </Pressable>
            ))}

            {!topics.length ? (
              <Text style={[S.p, { color: sub, marginTop: 12 }]}>
                No topics found. Check your flashcards data source.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[S.panel, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={S.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[S.h1, { color: accent }]} numberOfLines={1}>
                  {topic}
                </Text>
                <Text style={[S.p, { color: sub }]}>
                  Q {Math.min(idx + 1, cards.length)} / {cards.length} • Time{" "}
                  {fmtTime(secondsLeft)}
                </Text>
              </View>

              <Pressable onPress={exitToTopics} style={[S.smallBtn, { borderColor: border }]}>
                <Text style={[S.smallBtnText, { color: text }]}>Topics</Text>
              </Pressable>
            </View>

            {!done ? (
              <>
                <View style={[S.qCard, { borderColor: border, backgroundColor: "rgba(0,0,0,0.22)" }]}>
                  <Text style={[S.qText, { color: text }]}>{current?.front}</Text>
                </View>

                <View style={{ height: 10 }} />

                {choices.map((c) => {
                  const isPicked = picked === c;
                  const isRight = picked && c === current?.back;
                  const isWrong = picked && isPicked && c !== current?.back;

                  const bgc = isRight
                    ? "rgba(120,255,170,0.18)"
                    : isWrong
                    ? "rgba(255,120,120,0.18)"
                    : "rgba(0,0,0,0.22)";

                  const bc = isRight
                    ? "rgba(120,255,170,0.35)"
                    : isWrong
                    ? "rgba(255,120,120,0.35)"
                    : border;

                  return (
                    <Pressable
                      key={c}
                      onPress={() => choose(c)}
                      disabled={!!picked}
                      style={[S.choiceBtn, { backgroundColor: bgc, borderColor: bc }]}
                    >
                      <Text style={[S.choiceText, { color: text }]}>{c}</Text>
                    </Pressable>
                  );
                })}

                <View style={S.footerRow}>
                  <Text style={[S.p, { color: sub }]}>
                    Correct: {correct}
                  </Text>
                  <Text style={[S.p, { color: sub }]}>
                    Score: {cards.length ? Math.round((correct / cards.length) * 100) : 0}%
                  </Text>
                </View>
              </>
            ) : (
              <View style={[S.doneBox, { borderColor: border }]}>
                <Text style={[S.h2, { color: text }]}>Done ✨</Text>
                <Text style={[S.p, { color: sub }]}>
                  Score: {pct}% ({correct} / {cards.length})
                </Text>

                <View style={{ height: 10 }} />

                <Pressable
                  onPress={() => startTopic(topic)}
                  style={[S.primaryBtn, { backgroundColor: "rgba(0,0,0,0.25)", borderColor: border }]}
                >
                  <Text style={[S.primaryText, { color: text }]}>Restart</Text>
                </Pressable>

                <View style={{ height: 8 }} />

                <Pressable
                  onPress={exitToTopics}
                  style={[S.primaryBtn, { backgroundColor: "rgba(0,0,0,0.18)", borderColor: border }]}
                >
                  <Text style={[S.primaryText, { color: text }]}>Back to Topics</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
        <Text style={[S.foot, { color: "rgba(232,251,255,0.55)" }]}>
          {Platform.OS === "web"
            ? "Web + Mobile compatible"
            : "Mobile compatible"}
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  wrap: { padding: 14, paddingBottom: 30 },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  h1: { fontSize: 22, fontWeight: "900" },
  h2: { fontSize: 18, fontWeight: "900" },
  p: { marginTop: 6, fontSize: 14, fontWeight: "600" },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  smallBtnText: { fontWeight: "900" },

  topicBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicText: { fontWeight: "900", fontSize: 15, flex: 1, paddingRight: 12 },
  topicHint: { fontWeight: "900", opacity: 0.85 },

  qCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  qText: { fontSize: 16, fontWeight: "900", lineHeight: 22 },

  choiceBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  choiceText: { fontSize: 14, fontWeight: "800", lineHeight: 20 },

  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  doneBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { fontWeight: "900", fontSize: 14 },

  foot: { textAlign: "center", fontSize: 12, fontWeight: "700" },
});
