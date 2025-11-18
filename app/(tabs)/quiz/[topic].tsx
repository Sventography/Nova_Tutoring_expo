import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildQuiz } from "../../_lib/quiz";
import { getCardsById, toQA } from "../../_lib/flashcards";
// 🔹 History bridge – we’ll use safeLogQuiz / logQuizToHistory
import * as quizHistoryBridge from "../../utils/quiz-history-bridge";

type QItem = { question: string; choices: string[]; answer: string };

const QUIZ_LEN = 20;
const TOTAL_TIME = 300; // 5 min
const ADVANCE_DELAY = 650;
const CYAN = "#00E5FF";
const BLUE = "#0B2239";
const BLACK = "#000000";
const NEON = "#39FF14"; // neon green

export default function TopicQuiz() {
  const { id = "", title = "" } =
    useLocalSearchParams<{ id?: string; title?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [noData, setNoData] = useState(false);

  const [totalLeft, setTotalLeft] = useState(TOTAL_TIME);
  const [done, setDone] = useState(false);

  const autoRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loggedRef = useRef(false); // 🔹 avoid double-logging

  const current = items[idx];
  const total = items.length;
  const headerTitle = useMemo(
    () => (title ? String(title) : "Quiz"),
    [title]
  );

  // ─────────────────────────────
  // Load quiz data for this topic
  // ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = getCardsById(String(id));
        const hasQA = raw
          .map(toQA)
          .filter(Boolean) as { question: string; answer: string }[];

        if (!hasQA.length) {
          if (mounted) {
            setNoData(true);
          }
          return;
        }

        const built = buildQuiz(raw as any, QUIZ_LEN);
        if (mounted) {
          setItems(built);
          setIdx(0);
          setCorrect(0);
          setSelected(null);
          setLocked(false);
          setDone(false);
          setTotalLeft(TOTAL_TIME);
          setNoData(false);
          loggedRef.current = false; // new run, allow logging
        }
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ─────────────────────────────
  // Total 5-minute timer
  // ─────────────────────────────
  useEffect(() => {
    if (loading || done || noData) return;
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);

    totalTimerRef.current = setInterval(() => {
      setTotalLeft((t) => {
        if (t <= 1) {
          clearInterval(totalTimerRef.current as any);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [loading, done, noData]);

  // ─────────────────────────────
  // Quiz controls
  // ─────────────────────────────
  function next() {
    if (idx + 1 >= total) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setLocked(false);
  }

  function onPick(i: number) {
    if (locked || !current) return;
    setSelected(i);
    setLocked(true);

    if (current.choices[i] === current.answer) {
      setCorrect((c) => c + 1);
    }

    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(next, ADVANCE_DELAY);
  }

  function finishNow() {
    setDone(true);
  }

  const mm = Math.floor(totalLeft / 60);
  const ss = String(totalLeft % 60).padStart(2, "0");

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LinearGradient colors={[BLACK, BLUE]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.container}>{children}</ScrollView>
    </LinearGradient>
  );

  // ─────────────────────────────
  // Log to History when quiz is done (ONCE per run)
  // ─────────────────────────────
  useEffect(() => {
    if (!done) return;
    if (!total) return;
    if (loggedRef.current) return;

    const pct = total ? Math.round((correct / total) * 100) : 0;

    loggedRef.current = true;

    const payload = {
      topicId: String(id),
      title: headerTitle,
      total,
      correct,
      percent: pct,
    };

    const anyBridge = quizHistoryBridge as any;
    const fn =
      typeof anyBridge.safeLogQuiz === "function"
        ? anyBridge.safeLogQuiz
        : typeof anyBridge.logQuizToHistory === "function"
        ? anyBridge.logQuizToHistory
        : null;

    if (!fn) {
      console.log(
        "[topic-quiz] quiz-history-bridge has no usable logger; payload & module:",
        payload,
        quizHistoryBridge
      );
      return;
    }

    console.log("[topic-quiz] logging quiz result → history", payload);
    void fn(payload);
  }, [done, total, correct, headerTitle, id]);

  // ─────────────────────────────
  // Render states
  // ─────────────────────────────
  if (loading) {
    return (
      <Shell>
        <View style={S.center}>
          <ActivityIndicator color={CYAN} />
          <Text style={[S.dim, { color: CYAN }]}>
            Loading {headerTitle}…
          </Text>
        </View>
      </Shell>
    );
  }

  if (noData) {
    return (
      <Shell>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={S.result}>
          No questions are available for this topic yet.
        </Text>
        <View style={{ height: 12 }} />
        <Pressable
          style={[S.btn, S.outline]}
          onPress={() => router.replace("/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
      </Shell>
    );
  }

  // Finished screen
  if (done || !current) {
    const pct = total ? Math.round((correct / total) * 100) : 0;

    return (
      <Shell>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={S.result}>
          Score: {correct} / {total} ({pct}%).
        </Text>
        <View style={{ height: 12 }} />
        <View style={S.row}>
          <Pressable
            style={[S.btn, S.outline]}
            onPress={() => router.replace("/quiz")}
          >
            <Text style={S.btnTxt}>Topics</Text>
          </Pressable>
          <View style={{ width: 10 }} />
          {/* 🔹 Start Over — same look as Topics button now */}
          <Pressable
            style={[S.btn, S.outline]}
            onPress={() => {
              setIdx(0);
              setCorrect(0);
              setSelected(null);
              setLocked(false);
              setDone(false);
              setTotalLeft(TOTAL_TIME);
              loggedRef.current = false; // allow a new history entry next time
            }}
          >
            <Text style={S.btnTxt}>Start Over</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  // Active question
  return (
    <Shell>
      <View style={S.headerRow}>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={[S.meta, totalLeft <= 20 ? S.danger : undefined]}>
          ⏳ {mm}:{ss}
        </Text>
      </View>

      <Text style={S.meta}>
        Question {idx + 1} / {total}
      </Text>
      <Text style={S.qText}>{current.question}</Text>

      <View style={{ height: 8 }} />
      {current.choices.map((opt, i) => {
        const isPicked = selected === i;
        const isRight = locked && opt === current.answer;
        const isWrong = locked && isPicked && !isRight;
        return (
          <Pressable
            key={i}
            disabled={locked}
            onPress={() => onPick(i)}
            style={[
              S.choice,
              isPicked && S.choicePicked,
              isRight && S.choiceRight,
              isWrong && S.choiceWrong,
            ]}
          >
            <Text style={[S.choiceTxt, isRight && S.choiceTxtRight]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}

      <View style={{ height: 10 }} />
      <View style={S.headerRow}>
        <Text style={S.meta}>Correct: {correct}</Text>
        <Text style={S.meta}>
          Remaining: {total - (idx + 1)}
        </Text>
      </View>

      <View style={{ height: 12 }} />
      <View style={S.row}>
        <Pressable
          style={[S.btn, S.outline]}
          onPress={() => router.replace("/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
        <View style={{ width: 10 }} />
        {/* FIRST Finish — ends the quiz wherever they are */}
        <Pressable style={[S.btn, S.solid]} onPress={finishNow}>
          <Text style={S.btnTxt}>Finish</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

export const S = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.8 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: CYAN,
    marginBottom: 4,
  },
  qText: { fontSize: 18, color: CYAN, marginTop: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: { fontSize: 14, color: CYAN, opacity: 0.9 },
  danger: { color: "#ff6b6b", fontWeight: "800" },

  choice: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CYAN,
    marginVertical: 6,
    backgroundColor: "rgba(0, 229, 255, 0.06)",
  },
  choicePicked: {
    backgroundColor: "rgba(0, 229, 255, 0.14)",
  },

  // ✅ NEON GREEN for correct answers
  choiceRight: {
    backgroundColor: "rgba(57, 255, 20, 0.22)",
    borderColor: NEON,
    shadowColor: NEON,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  choiceTxtRight: { color: NEON, fontWeight: "800" },

  // Wrong = red
  choiceWrong: {
    backgroundColor: "rgba(255, 107, 107, 0.18)",
    borderColor: "#ff6b6b",
  },

  choiceTxt: { fontSize: 16, color: CYAN },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  btnTxt: {
    color: CYAN,
    fontWeight: "800",
    textAlign: "center",
  },
  solid: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: CYAN,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: CYAN,
  },
  result: { fontSize: 18, color: CYAN, marginTop: 6 },
});
