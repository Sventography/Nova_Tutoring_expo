// app/quiz.tsx – single-topic quiz screen (fixed imports, no multiline logs, Start Over working)

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";

import { buildQuiz } from "./_lib/quiz";                      // ✅ FIXED
import { getCardsById, toQA } from "./_lib/flashcards";       // ✅ FIXED
import { add as addQuizHistory } from "./_lib/quizHistory";   // unchanged

import { reportQuizFinished } from "./utils/report-quiz-finish";
import { createCertificate } from "./utils/certificates";
import { useUser } from "./context/UserContext";
import { showToast } from "./utils/toast";
import { useTheme } from "./context/ThemeContext";
import { unlockQuizAchievements } from "./utils/achievements-bridge";

type QItem = { question: string; choices: string[]; answer: string };

const QUIZ_LEN = 20;
const TOTAL_TIME = 300;
const ADVANCE_DELAY = 650;

export default function QuizScreen() {
  const router = useRouter();
  const { id, title: rawTitle } =
    useLocalSearchParams<{ id?: string; title?: string }>();

  const topicId = id ?? "abstract-algebra-intro";
  const { user } = useUser();
  const { tokens } = useTheme();

  // theme
  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const metaColor = tokens.cardText;
  const accent = tokens.accent;
  const borderColor = tokens.border;
  const cardBg = tokens.card;
  const dangerColor = "#ff6b6b";

  const choicePickedBg = tokens.isDark
    ? "rgba(255,255,255,0.05)"
    : "rgba(0,0,0,0.05)";
  const correctBg = tokens.isDark
    ? "rgba(0,255,170,0.25)"
    : "rgba(0,180,120,0.18)";
  const wrongBg = tokens.isDark
    ? "rgba(255,80,80,0.25)"
    : "rgba(255,120,120,0.2)";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [noData, setNoData] = useState(false);

  const [totalLeft, setTotalLeft] = useState(TOTAL_TIME);
  const [done, setDone] = useState(false);
  const [showCert, setShowCert] = useState(false);

  const loggedRef = useRef(false);
  const certSavedRef = useRef(false);

  const autoRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const current = items[idx];
  const total = items.length;
  const headerTitle = useMemo(
    () => (rawTitle ? String(rawTitle) : "Quiz"),
    [rawTitle]
  );

  // TIMER
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

  // LOAD QUIZ
  useEffect(() => {
    const raw = getCardsById(String(topicId));
    const hasQA = raw
      .map(toQA)
      .filter(Boolean) as { question: string; answer: string }[];

    if (!hasQA.length) {
      setNoData(true);
      setLoading(false);
      return;
    }

    const built = buildQuiz(raw as any, QUIZ_LEN) as QItem[];
    console.log("[quiz:app] built length =", built.length);       // ✅ FIXED STRING

    setItems(built);
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setLocked(false);
    setDone(false);
    setTotalLeft(TOTAL_TIME);
    setNoData(false);
    setLoading(false);
    setShowCert(false);
    loggedRef.current = false;
    certSavedRef.current = false;
  }, [topicId]);

  // HISTORY + CERT LOGGING
  const logResultIfNeeded = async (reason: string) => {
    if (loggedRef.current) return;
    if (!total) return;

    const pct = Math.round((correct / total) * 100);

    const entry = {
      topicId: String(topicId),
      title: headerTitle,
      total,
      correct,
      percent: pct,
    };

    loggedRef.current = true;

    // 1) history
    await addQuizHistory(entry).catch(() =>
      console.log("[quiz:app] history fail")
    );

    // 2) achievements
    await reportQuizFinished(pct, String(topicId)).catch(() => {});
    await unlockQuizAchievements({
      correct,
      total,
      pct,
      topicId: String(topicId),
    }).catch(() => {});
  };


  useEffect(() => {
    if (done) logResultIfNeeded("done");
  }, [done]);

  // QUIZ CONTROLS
  function goNext() {
    if (idx + 1 >= total) {
      setDone(true);
      logResultIfNeeded("last-question");
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
    autoRef.current = setTimeout(goNext, ADVANCE_DELAY);
  }

  function finishNow() {
    setDone(true);
    logResultIfNeeded("finishNow");
  }

  const mm = Math.floor(totalLeft / 60);
  const ss = String(totalLeft % 60).padStart(2, "0");

  // LAYOUT WRAPPER
  const renderShell = (children: React.ReactNode) => (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.container}>
        <Text
          style={{
            color: metaColor,
            fontSize: 10,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          QUIZ (app/quiz.tsx)
        </Text>
        {children}
      </ScrollView>
    </LinearGradient>
  );

  // FINISHED SCREEN
  if (done || !current) {
    const pct = Math.round((correct / total) * 100);

    return renderShell(
      <>
        <Text style={[S.title, { color: headerTextColor }]}>
          {headerTitle}
        </Text>
        <Text style={[S.result, { color: headerTextColor }]}>
          Score: {correct} / {total} ({pct}%)
        </Text>

        <View style={{ height: 12 }} />

        <View style={S.row}>
          {/* Left: Topics */}
          <Pressable
            style={[S.btn, S.outline, { borderColor }]}
            onPress={() => {}}
          >
            <Text style={[S.btnTxt, { color: headerTextColor }]}>
              Topics
            </Text>
          </Pressable>

          <View style={{ width: 10 }} />

          {/* Right: Start Over */}
          <Pressable
            style={[
              S.btn,
              S.solid,
              { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => {
              setIdx(0);
              setCorrect(0);
              setSelected(null);
              setLocked(false);
              setDone(false);
              setTotalLeft(TOTAL_TIME);
              setShowCert(false);
              loggedRef.current = false;
              certSavedRef.current = false;
            }}
          >
            <Text
              style={[
                S.btnTxt,
                { color: tokens.isDark ? "#000" : "#fff" },
              ]}
            >
              Start Over
            </Text>
          </Pressable>
        </View>

        {/* CERT MODAL */}
        <Modal
          visible={showCert}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCert(false)}
        >
          <View style={S.modalBackdrop}>
            <LinearGradient colors={gradient} style={S.modalCard}>
              <Text
                style={[S.modalTitle, { color: headerTextColor }]}
              >
                You scored {pct}% 🎉
              </Text>
              <Text style={[S.modalBody, { color: metaColor }]}>
                80% or higher! Here’s your certificate.
              </Text>

              <View style={{ height: 12 }} />

              <Pressable
                style={[
                  S.btn,
                  S.solid,
                  { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => {
                  setShowCert(false);
                  try {
                    router.navigate("/(tabs)/certificates");
                  } catch {
                    router.push("/certificates" as any);
                  }
                }}
              >
                <Text
                  style={[
                    S.btnTxt,
                    { color: tokens.isDark ? "#000" : "#fff" },
                  ]}
                >
                  View / Download Certificate
                </Text>
              </Pressable>

              <View style={{ height: 10 }} />

              <Pressable
                style={[S.btn, S.outline, { borderColor }]}
                onPress={() => setShowCert(false)}
              >
                <Text
                  style={[S.btnTxt, { color: headerTextColor }]}
                >
                  Close
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        </Modal>
      </>
    );
  }

  // ACTIVE QUESTION
  return renderShell(
    <>
      <View style={S.row}>
        <Text style={[S.title, { color: headerTextColor }]}>
          {headerTitle}
        </Text>
        <Text
          style={[
            S.meta,
            { color: totalLeft <= 20 ? dangerColor : metaColor },
          ]}
        >
          ⏳ {mm}:{ss}
        </Text>
      </View>

      <Text style={[S.meta, { color: metaColor }]}>
        Question {idx + 1} / {total}
      </Text>

      <Text style={[S.qText, { color: headerTextColor }]}>
        {current.question}
      </Text>

      <View style={{ height: 8 }} />

      {current.choices.map((opt, i) => {
        const isPicked = selected === i;
        const isRight = locked && opt === current.answer;
        const isWrong = locked && isPicked && !isRight;

        let bg = cardBg;
        if (isPicked) bg = choicePickedBg;
        if (isRight) bg = correctBg;
        if (isWrong) bg = wrongBg;

        const textColor = isRight ? accent : headerTextColor;

        return (
          <Pressable
            key={i}
            disabled={locked}
            onPress={() => onPick(i)}
            style={[
              S.choice,
              {
                backgroundColor: bg,
                borderColor: isRight ? accent : borderColor,
              },
              isRight && {
                shadowColor: accent,
                shadowOpacity: 0.9,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              },
            ]}
          >
            <Text style={[S.choiceTxt, { color: textColor }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}

      <View style={{ height: 12 }} />

      <View style={S.row}>
        <Text style={[S.meta, { color: metaColor }]}>
          Correct: {correct}
        </Text>
        <Text style={[S.meta, { color: metaColor }]}>
          Remaining: {total - (idx + 1)}
        </Text>
      </View>

      <View style={{ height: 12 }} />

      <Pressable
        style={[S.btn, S.outline, { borderColor }]}
        onPress={finishNow}
      >
        <Text style={[S.btnTxt, { color: headerTextColor }]}>
          Finish
        </Text>
      </Pressable>
    </>
  );
}

export const S = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.8 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  qText: { fontSize: 18, marginTop: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: { fontSize: 14 },
  choice: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginVertical: 6,
  },
  choiceTxt: { fontSize: 16 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  btnTxt: { fontWeight: "800", textAlign: "center" },
  solid: { borderWidth: 1.5 },
  outline: { backgroundColor: "transparent", borderWidth: 1.5 },
  result: { fontSize: 18, marginTop: 6 },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalBody: { marginTop: 8 },
});
