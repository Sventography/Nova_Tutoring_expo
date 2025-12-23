// app/(tabs)/quiz/[topic].tsx
import { reportQuizFinished } from "../../utils/report-quiz-finish";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildQuiz } from "../../_lib/quiz";
import { getCardsById, toQA } from "../../_lib/flashcards";
import { add as addQuizHistory } from "../../_lib/quizHistory"; // ✅ direct history logger
import { safeLogQuiz } from "../../utils/quiz-history-bridge"; // ✅ bridge logger
import { quizFinished } from "../../utils/achievements-bridge"; // ✅ achievements bridge
import {
  useAchievements,
  AchieveEmitter,
} from "../../context/AchievementsContext"; // ✅ achievements context / emitter

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
  const ach = useAchievements();

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

  // ✅ guards so history + achievements + modal only fire once per run
  const loggedRef = useRef(false);
  const notifiedRef = useRef(false);

  // ✅ for in-screen modal overlay
  const [showCongrats, setShowCongrats] = useState(false);

  const current = items[idx];
  const total = items.length;
  const headerTitle = useMemo(
    () => (title ? String(title) : "Quiz"),
    [title]
  );

  // 🔹 Load questions for this topic
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
          loggedRef.current = false;
          notifiedRef.current = false;
          setShowCongrats(false);
        }
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (autoRef.current) clearTimeout(autoRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current as any);
    };
  }, [id]);

  // 🔹 Total 5-min timer
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
      if (totalTimerRef.current) clearInterval(totalTimerRef.current as any);
    };
  }, [loading, done, noData]);

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

  function restart() {
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setLocked(false);
    setDone(false);
    setTotalLeft(TOTAL_TIME);
    loggedRef.current = false;
    notifiedRef.current = false;
    setShowCongrats(false);
  }

  const mm = Math.floor(totalLeft / 60);
  const ss = String(totalLeft % 60).padStart(2, "0");

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LinearGradient colors={[BLACK, BLUE]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.container}>{children}</ScrollView>
    </LinearGradient>
  );

  // ✅ When quiz is finished, log to History + fire achievements + show modal (ONCE)
  useEffect(() => {
    if (!done) return;
    if (!total) return;
    if (loggedRef.current) return;

    const pct = total ? Math.round((correct / total) * 100) : 0;

    reportQuizFinished(pct, headerTitle ?? topicTitle ?? title ?? "Quiz").catch(() => {});
    loggedRef.current = true;

    const durationSecRaw = TOTAL_TIME - totalLeft;
    const durationSec = durationSecRaw < 0 ? 0 : durationSecRaw;

    const topicId = String(id);

    console.log("[topic-quiz] FINISHED → logging + achievements", {
      topicId,
      title: headerTitle,
      total,
      correct,
      percent: pct,
      durationSec,
    });

    // 🔹 1) Bridge logger (whatever the History tab is already wired to)
    void safeLogQuiz({
      topicId,
      title: headerTitle,
      total,
      correct,
      percent: pct,
    })
      .then(() => {
        console.log("[topic-quiz] safeLogQuiz OK");
      })
      .catch((err: any) => {
        console.warn("[topic-quiz] safeLogQuiz failed", err);
      });

    // 🔹 2) Direct logger into quizHistory (belt + suspenders)
    void addQuizHistory({
      topicId,
      title: headerTitle,
      total,
      correct,
      percent: pct,
    })
      .then(() => {
        console.log("[topic-quiz] quizHistory.add OK");
      })
      .catch((err: any) => {
        console.warn("[topic-quiz] quizHistory.add failed", err);
      });

    // 🔹 Direct Achievements API (sync now; defensive about promises)
    if (ach && typeof ach.onQuizFinished === "function") {
      console.log("[topic-quiz] calling ach.onQuizFinished", {
        pct,
        subject: headerTitle,
      });
      try {
        const maybePromise = (ach as any).onQuizFinished(pct, headerTitle);
        if (
          maybePromise &&
          typeof maybePromise === "object" &&
          typeof (maybePromise as any).catch === "function"
        ) {
          (maybePromise as any).catch((e: any) =>
            console.warn("[topic-quiz] ach.onQuizFinished async error", e)
          );
        }
      } catch (e: any) {
        console.warn("[topic-quiz] ach.onQuizFinished error", e);
      }
    } else {
      console.log(
        "[topic-quiz] no ach.onQuizFinished on context; skipping direct call"
      );
    }

    // 🔹 Global bridge — expects correct answers + duration + total
    try {
      console.log("[topic-quiz] calling quizFinished bridge", {
        correct,
        durationSec,
        total,
      });
      quizFinished(correct, durationSec, total);
    } catch (e) {
      console.warn("[topic-quiz] quizFinished bridge error", e);
    }

    // 🔹 Emitter fallback (same shape as other emitters)
    try {
      AchieveEmitter.emit("ACHIEVEMENT_EVENT", {
        type: "quizFinished",
        scorePct: pct,
        subject: headerTitle,
      });
      console.log(
        "[topic-quiz] emitted ACHIEVEMENT_EVENT quizFinished",
        { scorePct: pct, subject: headerTitle }
      );
    } catch (e) {
      console.warn("[topic-quiz] AchieveEmitter emit error", e);
    }

    // 🔹 In-screen modal + native Alert, once
    if (!notifiedRef.current) {
      notifiedRef.current = true;
      setShowCongrats(true);
      Alert.alert(
        pct >= 80 ? "Quiz complete! 🎉" : "Quiz complete!",
        pct >= 80
          ? `You scored ${pct}%. Check Achievements to see what you unlocked.`
          : `You scored ${pct}%. Keep going — more achievements unlock as you finish quizzes.`
      );
    }
  }, [done, total, correct, totalLeft, id, headerTitle, ach]);

  // ───────────────── RENDER STATES ─────────────────

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
          onPress={() => router.replace("/(tabs)/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
      </Shell>
    );
  }

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
            onPress={() => router.replace("/(tabs)/quiz")}
          >
            <Text style={S.btnTxt}>Topics</Text>
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable style={[S.btn, S.solid]} onPress={restart}>
            <Text style={S.btnTxt}>Start Over</Text>
          </Pressable>
        </View>

        {/* 🔹 In-screen modal overlay */}
        {showCongrats && (
          <View style={S.modalBackdrop}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>
                {pct >= 80 ? "Quiz complete! 🎉" : "Quiz complete"}
              </Text>
              <Text style={S.modalText}>
                You scored {pct}%.{"\n"}
                Check the Achievements tab to see what you’ve unlocked and
                what’s next.
              </Text>
              <View style={S.modalButtons}>
                <Pressable
                  style={[S.btn, S.solid, { flex: 1 }]}
                  onPress={() => {
                    setShowCongrats(false);
                    router.push("/achievements");
                  }}
                >
                  <Text style={S.btnTxt}>View Achievements</Text>
                </Pressable>
                <View style={{ width: 10 }} />
                <Pressable
                  style={[S.btn, S.outline, { flex: 0.7 }]}
                  onPress={() => setShowCongrats(false)}
                >
                  <Text style={S.btnTxt}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Shell>
    );
  }

  // 🔹 Active quiz state
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
            <Text
              style={[
                S.choiceTxt,
                isRight && S.choiceTxtRight,
              ]}
            >
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
          onPress={() => router.replace("/(tabs)/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
        <View style={{ width: 10 }} />
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
  btnTxt: { color: CYAN, fontWeight: "800", textAlign: "center" },
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

  // 🔹 Modal styles
  modalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "86%",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#03131E",
    borderWidth: 1.5,
    borderColor: CYAN,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: CYAN,
    marginBottom: 6,
  },
  modalText: {
    fontSize: 14,
    color: "#CFEAF7",
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
