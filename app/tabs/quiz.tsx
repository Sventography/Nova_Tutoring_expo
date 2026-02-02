// app/(tabs)/quiz.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { getCardsById, toQA } from "../_lib/flashcards";
import { reportQuizFinished } from "../utils/report-quiz-finish";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { unlockQuizAchievements } from "../utils/achievements-bridge";
import { logQuizResult } from "../utils/quiz-history-bridge";

type QA = { question: string; answer: string };
type QItem = { question: string; answer: string; choices: string[] };

const QUIZ_LEN = 20;
const TOTAL_TIME = 300;
const ADVANCE_DELAY = 650;

/**
 * BIG fake distractor bank.
 * These are intentionally generic / academic-ish so they work for any topic.
 * We never use real answers from other cards as distractors anymore.
 */
const DISTRACTOR_BANK: string[] = [
  "Incorrect transformation",
  "Unrelated definition",
  "Misapplied rule",
  "Opposite relationship",
  "Not defined in this context",
  "Unverified assumption",
  "Contradictory statement",
  "Irrelevant detail",
  "Incomplete explanation",
  "Inconsistent example",
  "Wrong comparison",
  "Misread notation",
  "False equivalence",
  "Reversed cause and effect",
  "Ignored key condition",
  "Approximation only",
  "Out of domain",
  "Misaligned units",
  "Calculation shortcut error",
  "Reordered steps incorrectly",
  "Confused variables",
  "Swapped numerator and denominator",
  "Used wrong operation",
  "Misplaced decimal",
  "Rounded too early",
  "Ignored negative sign",
  "Incorrect base case",
  "Wrong boundary value",
  "Overgeneralization",
  "Special case only",
  "Does not always hold",
  "Ambiguous statement",
  "Undefined for this input",
  "Not supported by data",
  "Uses the wrong symbol",
  "Contradicts earlier step",
  "Not logically necessary",
  "Extra term added",
  "Missing required term",
  "Mixed up order of operations",
  "Off by one error",
  "Assumes symmetry incorrectly",
  "Confuses correlation and causation",
  "Reversed inequality",
  "Treats estimate as exact",
  "Uses outdated definition",
  "Applies rule to wrong side",
  "Combines unlike terms",
  "Uses wrong reference point",
  "Ignores direction",
  "Not scaled correctly",
  "Treats variable as constant",
  "Mislabels the result",
  "Incorrect simplification",
  "Wrong domain assumption",
  "Applies 2D rule to 3D case",
  "Swapped independent and dependent",
  "Not normalized",
  "Missing justification",
  "Conclusion does not follow",
  "Reverses hypothesis and result",
  "Applies rule backwards",
  "Uses wrong formula family",
  "Treats example as proof",
  "Assumes linear when not",
  "Incorrect sign convention",
  "Misinterprets diagram",
  "Partial result only",
  "Leaves out constraints",
  "Overlooks special values",
  "Uses incompatible units",
  "Ignores remainder",
  "Not reduced to simplest form",
  "Confuses area and perimeter",
  "Incorrect factorization",
  "Wrong substitution",
  "Confuses mean and median",
  "Misreads percentage",
  "Uses sample as population",
  "Wrong reference frame",
  "Breaks conservation rule",
  "Not invariant under change",
  "Applies property to sum incorrectly",
  "Drops absolute value",
  "Flips fraction incorrectly",
  "Assumes zero where not given",
  "Treats discrete as continuous",
  "Misreads exponent",
  "Incorrect limit behavior",
  "Chooses wrong axis",
  "Out of order reasoning",
  "Not enough information",
  "Applies pattern where none exists",
  "Forgets initial condition",
  "Ignores edge cases",
  "Treats guess as proof",
  "Uses wrong coordinate system",
];

// ---------- helpers ----------

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqStrings(xs: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const k = String(x ?? "").trim();
    if (!k) continue;
    const kk = k.toLowerCase();
    if (seen.has(kk)) continue;
    seen.add(kk);
    out.push(k);
  }
  return out;
}

/**
 * Pick N distractors from the bank that are:
 *  - not equal to the correct answer (case-insensitive)
 *  - unique within this question
 */
function pickDistractorsFromBank(correct: string, count: number): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  const correctNorm = String(correct || "").toLowerCase().trim();
  if (correctNorm) used.add(correctNorm);

  const pool = shuffle(DISTRACTOR_BANK);

  for (const label of pool) {
    if (out.length >= count) break;
    const k = label.toLowerCase().trim();
    if (!k || used.has(k)) continue;
    out.push(label);
    used.add(k);
  }

  // Safety fallback if somehow the bank wasn't enough
  while (out.length < count) {
    const fallback = `Option ${out.length + 1}`;
    const kk = fallback.toLowerCase();
    if (!used.has(kk)) {
      out.push(fallback);
      used.add(kk);
    } else {
      break;
    }
  }

  return out;
}

/**
 * Build quiz:
 *  - uses the real card answer as the *one* correct option
 *  - ALL wrong options come from DISTRACTOR_BANK
 *    (we DO NOT reuse real answers from other cards anymore)
 */
function buildQuizLocal(qas: QA[], len: number): QItem[] {
  const pool = qas
    .map((x) => ({
      question: String(x.question ?? "").trim(),
      answer: String(x.answer ?? "").trim(),
    }))
    .filter((x) => x.question && x.answer);

  if (!pool.length) return [];

  const picked = shuffle(pool).slice(0, Math.min(len, pool.length));

  return picked.map((p, idx) => {
    const correct = p.answer || "Correct answer";

    // Always take 3 distractors from the global bank
    const distractors = pickDistractorsFromBank(correct, 3);

    const choices = shuffle(
      uniqStrings([correct, ...distractors])
    ).slice(0, 4);

    // Just in case something goes weird, pad to at least 2 choices
    while (choices.length < 2) choices.push("—");

    return {
      question: p.question,
      answer: correct,
      choices,
    };
  });
}

// ---------- component ----------

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const topicId = String(params?.topicId ?? "abstract-algebra-intro");
  const title = String(params?.title ?? "Quiz");

  const { user } = useUser();
  const { tokens } = useTheme();

  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const metaColor = tokens.cardText;
  const accent = tokens.accent;
  const borderColor = tokens.border;
  const cardBg = tokens.card;
  const dangerColor = "#ff6b6b";

  const choicePickedBg = tokens.isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.06)";
  const correctBg = tokens.isDark
    ? "rgba(0,255,170,0.22)"
    : "rgba(0,180,120,0.18)";
  const wrongBg = tokens.isDark
    ? "rgba(255,80,80,0.22)"
    : "rgba(255,120,120,0.20)";

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
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = items[idx];
  const total = items.length;

  const headerTitle = useMemo(
    () => (title ? String(title) : "Quiz"),
    [title]
  );

  // timer
  useEffect(() => {
    if (loading || done || noData) return;

    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    totalTimerRef.current = setInterval(() => {
      setTotalLeft((t) => {
        if (t <= 1) {
          if (totalTimerRef.current) clearInterval(totalTimerRef.current);
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

  // load quiz (local builder ensures choices exist on mobile)
  useEffect(() => {
    setLoading(true);

    const raw = getCardsById(String(topicId));
    const qas = raw.map(toQA).filter(Boolean) as QA[];

    if (!qas.length) {
      setNoData(true);
      setItems([]);
      setLoading(false);
      return;
    }

    const built = buildQuizLocal(qas, QUIZ_LEN);

    if (!built.length) {
      setNoData(true);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(built);
    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setLocked(false);
    setDone(false);
    setTotalLeft(TOTAL_TIME);
    setNoData(false);
    setShowCert(false);
    loggedRef.current = false;

    setLoading(false);
  }, [topicId]);

  const logResultIfNeeded = async (reason: string) => {
    if (loggedRef.current) return;
    if (!total) return;

    const pct = total ? Math.round((correct / total) * 100) : 0;

    try {
      await logQuizResult({
        topicId: String(topicId),
        title: headerTitle,
        total,
        correct,
        percent: pct,
      });
    } catch {}

    try {
      await reportQuizFinished(pct, headerTitle ?? String(topicId));
    } catch {}

    try {
      await unlockQuizAchievements({
        correct,
        total,
        pct,
        topicId: String(topicId),
      });
    } catch {}

    loggedRef.current = true;
  };

  // log when done
  useEffect(() => {
    if (!done) return;
    void logResultIfNeeded("done");
  }, [done]);

  // auto-pop certificate modal on 80%+
  useEffect(() => {
    if (!done || !total) return;
    const pct = Math.round((correct / total) * 100);
    if (pct >= 80) {
      setShowCert(true);
    }
  }, [done, correct, total]);

  function goNext() {
    if (idx + 1 >= total) {
      setDone(true);
      void logResultIfNeeded("last");
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setLocked(false);
  }

  function goPrev() {
    if (idx <= 0) return;
    setIdx((i) => Math.max(0, i - 1));
    setSelected(null);
    setLocked(false);
  }

  function onPick(i: number) {
    if (locked || !current) return;
    setSelected(i);
    setLocked(true);

    const isCorrect = current.choices?.[i] === current.answer;
    if (isCorrect) setCorrect((c) => c + 1);

    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(goNext, ADVANCE_DELAY);
  }

  function finishNow() {
    setDone(true);
    void logResultIfNeeded("finish");
  }

  const mm = Math.floor(totalLeft / 60);
  const ss = String(totalLeft % 60).padStart(2, "0");

  const renderShell = (children: React.ReactNode) => (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.container}>
        {children}
      </ScrollView>
    </LinearGradient>
  );

  if (loading) {
    return renderShell(
      <View style={S.center}>
        <ActivityIndicator color={accent} />
        <Text style={[S.dim, { color: accent, marginTop: 8 }]}>
          Loading {headerTitle}…
        </Text>
      </View>
    );
  }

  if (noData) {
    return renderShell(
      <>
        <Text style={[S.title, { color: headerTextColor }]}>
          {headerTitle}
        </Text>
        <Text style={[S.result, { color: headerTextColor }]}>
          No questions available.
        </Text>
      </>
    );
  }

  if (done || !current) {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 80;

    return renderShell(
      <>
        <Text style={[S.title, { color: headerTextColor }]}>
          {headerTitle}
        </Text>

        <View
          style={[
            S.resultCard,
            {
              backgroundColor: cardBg,
              borderColor,
            },
          ]}
        >
          <Text
            style={[
              S.resultLabel,
              { color: passed ? accent : metaColor },
            ]}
          >
            {passed ? "Great job!" : "Keep going 🐇"}
          </Text>
          <Text
            style={[
              S.resultScore,
              { color: headerTextColor },
            ]}
          >
            {correct} / {total} ({pct}%)
          </Text>
          <Text
            style={[
              S.resultNote,
              { color: metaColor },
            ]}
          >
            {passed
              ? "You’ve unlocked a certificate for this quiz."
              : "Score 80% or higher to unlock a certificate."}
          </Text>
        </View>

        {passed ? (
          <Pressable
            style={[
              S.btn,
              S.solid,
              { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => {
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
              View Certificate
            </Text>
          </Pressable>
        ) : null}

        <View style={{ height: 12 }} />

        <View style={S.row}>
          <Pressable
            style={[S.btn, S.outline, { borderColor }]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                S.btnTxt,
                { color: headerTextColor },
              ]}
            >
              Back
            </Text>
          </Pressable>

          <View style={{ width: 10 }} />

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

        {/* 80%+ certificate modal */}
        <Modal
          visible={showCert}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCert(false)}
        >
          <View style={S.modalBackdrop}>
            <LinearGradient colors={gradient} style={S.modalCard}>
              <Text
                style={[
                  S.modalTitle,
                  { color: headerTextColor },
                ]}
              >
                You scored {pct}% 🎉
              </Text>
              <Text
                style={[
                  S.modalBody,
                  { color: metaColor },
                ]}
              >
                80% or higher! Your certificate is ready in the
                Certificates tab.
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
                  View Certificate
                </Text>
              </Pressable>

              <View style={{ height: 10 }} />

              <Pressable
                style={[S.btn, S.outline, { borderColor }]}
                onPress={() => setShowCert(false)}
              >
                <Text
                  style={[
                    S.btnTxt,
                    { color: headerTextColor },
                  ]}
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

  // active quiz
  const choices = Array.isArray(current.choices) ? current.choices : [];

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
        {idx + 1}/{total} • {mm}:{ss}
      </Text>

      <View
        style={[
          S.questionCard,
          {
            backgroundColor: cardBg,
            borderColor,
          },
        ]}
      >
        <Text
          style={[
            S.qLabel,
            { color: metaColor },
          ]}
        >
          Question
        </Text>
        <Text
          style={[
            S.qText,
            { color: headerTextColor },
          ]}
        >
          {current.question}
        </Text>
      </View>

      <View style={{ height: 10 }} />

      {choices.length === 0 ? (
        <View
          style={[
            S.choice,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <Text
            style={[
              S.choiceTxt,
              { color: metaColor },
            ]}
          >
            (No answer choices generated — check your flashcard data for
            this topic.)
          </Text>
        </View>
      ) : (
        choices.map((opt, i) => {
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
              key={`${i}-${opt}`}
              disabled={locked}
              onPress={() => onPick(i)}
              style={[
                S.choice,
                {
                  backgroundColor: bg,
                  borderColor: isRight ? accent : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  S.choiceTxt,
                  { color: textColor },
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })
      )}

      <View style={{ height: 14 }} />

      <View style={S.row}>
        <Text style={[S.meta, { color: metaColor }]}>
          Correct: {correct}
        </Text>
        <Text style={[S.meta, { color: metaColor }]}>
          Remaining: {Math.max(0, total - (idx + 1))}
        </Text>
      </View>

      <View style={{ height: 14 }} />

      <View style={S.row}>
        <Pressable
          style={[S.btnSmall, S.outline, { borderColor }]}
          onPress={goPrev}
          disabled={idx === 0}
        >
          <Text
            style={[
              S.btnTxt,
              {
                color: headerTextColor,
                opacity: idx === 0 ? 0.45 : 1,
              },
            ]}
          >
            Back
          </Text>
        </Pressable>

        <View style={{ width: 10 }} />

        <Pressable
          style={[S.btnSmall, S.outline, { borderColor }]}
          onPress={finishNow}
        >
          <Text
            style={[
              S.btnTxt,
              { color: headerTextColor },
            ]}
          >
            Finish
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export const S = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
  },
  dim: { opacity: 0.85 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },

  questionCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  qLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.9,
    marginBottom: 4,
  },
  qText: {
    fontSize: 18,
    marginTop: 2,
    fontWeight: "700",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: { fontSize: 14, opacity: 0.9 },

  choice: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 7,
  },
  choiceTxt: { fontSize: 16, fontWeight: "700" },

  btnSmall: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  btnTxt: { fontWeight: "800", textAlign: "center" },

  solid: { borderWidth: 1.5 },
  outline: { backgroundColor: "transparent", borderWidth: 1.5 },

  result: { fontSize: 18, marginTop: 6 },

  resultCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  resultNote: {
    fontSize: 13,
    opacity: 0.9,
  },

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
