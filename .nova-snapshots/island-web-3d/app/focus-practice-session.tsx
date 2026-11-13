// app/focus-practice-session.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  getFocusMistakesForTopic,
} from "./_lib/focusPracticeInsights";
import { getCardsById, toQA } from "./_lib/flashcards";
import { buildQuiz } from "./_lib/quiz";
import {
  recordFocusCorrect,
  recordFocusMistake,
  type FocusPracticeMistake,
} from "./_lib/focusPractice";

type PracticeItem = {
  id: string;
  topicId: string;
  topicTitle: string;
  question: string;
  correctAnswer: string;
  lastChosenAnswer: string;
  choices: string[];
  missCount: number;
  correctAfterMissCount: number;
  firstMissedAt: string;
  lastMissedAt: string;
  lastCorrectAt?: string;
  practiceChoices: string[];
  source: "mistake" | "topic";
};

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeChoices(item: FocusPracticeMistake): string[] {
  const values = [
    ...(Array.isArray(item.choices) ? item.choices : []),
    item.correctAnswer,
    item.lastChosenAnswer,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const unique = values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return shuffled(unique);
}

export default function FocusPracticeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    topicId?: string;
    title?: string;
  }>();

  const topicId = String(params.topicId ?? "");
  const title = String(params.title ?? topicId ?? "Focus Practice");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mistakes = await getFocusMistakesForTopic(topicId);
      let prepared: PracticeItem[] = mistakes
        .map((item) => ({
          ...item,
          practiceChoices: normalizeChoices(item),
          source: "mistake" as const,
        }))
        .filter((item) => item.practiceChoices.length >= 2);

      if (!prepared.length) {
        try {
          const cards = getCardsById(topicId) || [];
          const qas = cards.map((card: any) => toQA(card)).filter(Boolean);
          const built = buildQuiz(qas as any, Math.min(10, qas.length || 10)) as any[];

          prepared = built.map((q: any, idx: number) => ({
            id: `focus-topic-${topicId}-${idx}`,
            topicId,
            topicTitle: title,
            question: String(q.question || q.q || ""),
            correctAnswer: String(q.answer || q.a || ""),
            lastChosenAnswer: "",
            choices: Array.isArray(q.choices) ? q.choices : [],
            missCount: 0,
            correctAfterMissCount: 0,
            firstMissedAt: "",
            lastMissedAt: "",
            practiceChoices: Array.isArray(q.choices) ? q.choices : [],
            source: "topic" as const,
          })).filter(
            (item) =>
              item.question &&
              item.correctAnswer &&
              item.practiceChoices.length >= 2
          );
        } catch (error) {
          console.warn("[FocusPracticeSession] topic fallback failed", error);
        }
      }

      setItems(prepared);
      setIndex(0);
      setSelected(null);
      setLocked(false);
      setCorrect(0);
      setFinished(false);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const current = items[index] ?? null;
  const total = items.length;

  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.min(100, Math.round(((index + (locked ? 1 : 0)) / total) * 100));
  }, [index, locked, total]);

  const choose = useCallback(
    async (choice: string) => {
      if (!current || locked) return;

      setSelected(choice);
      setLocked(true);

      const isCorrect = choice === current.correctAnswer;

      try {
        if (isCorrect) {
          setCorrect((value) => value + 1);

          if (current.source === "mistake") {
            await recordFocusCorrect({
              topicId: current.topicId,
              question: current.question,
            });
          }
        } else {
          await recordFocusMistake({
            topicId: current.topicId,
            topicTitle: current.topicTitle,
            question: current.question,
            correctAnswer: current.correctAnswer,
            chosenAnswer: choice,
            choices: current.practiceChoices,
          });
        }
      } catch (error) {
        console.warn("[FocusPracticeSession] answer tracking failed", error);
      }
    },
    [current, locked]
  );

  const next = useCallback(() => {
    if (!locked) return;

    if (index >= total - 1) {
      setFinished(true);
      return;
    }

    setIndex((value) => value + 1);
    setSelected(null);
    setLocked(false);
  }, [index, locked, total]);

  return (
    <LinearGradient
      colors={["#020617", "#07152d", "#020617"]}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color="#67e8f9" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>TARGETED PRACTICE</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Built from questions you actually missed. Focus Practice does not
              award normal quiz coins.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#67e8f9" />
            <Text style={styles.stateText}>Loading missed questions...</Text>
          </View>
        ) : total === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#67e8f9" />
            <Text style={styles.stateTitle}>No practice questions yet</Text>
            <Text style={styles.stateText}>
              This topic has quiz history, but no saved question-level mistakes
              that can be practiced yet. Missed questions from new quizzes will
              appear here automatically.
            </Text>
            <Pressable style={styles.primary} onPress={() => router.back()}>
              <Text style={styles.primaryText}>Back to Focus Practice</Text>
            </Pressable>
          </View>
        ) : finished ? (
          <View style={styles.stateCard}>
            <Ionicons name="sparkles-outline" size={34} color="#67e8f9" />
            <Text style={styles.stateTitle}>Practice complete</Text>
            <Text style={styles.result}>
              {correct} / {total} correct
            </Text>
            <Text style={styles.stateText}>
              Your Focus Practice scores and recovery progress have been updated.
            </Text>
            <Pressable style={styles.primary} onPress={() => void load()}>
              <Text style={styles.primaryText}>Practice Again</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => router.back()}>
              <Text style={styles.secondaryText}>Back to Focus Practice</Text>
            </Pressable>
          </View>
        ) : current ? (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.progressText}>
                  Question {index + 1} of {total}
                </Text>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress}%` }]} />
              </View>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.missMeta}>
                {current.source === "mistake"
                  ? `Missed ${current.missCount} time${
                      current.missCount === 1 ? "" : "s"
                    }${
                      current.correctAfterMissCount > 0
                        ? ` · recovered ${current.correctAfterMissCount}`
                        : ""
                    }`
                  : "Weak-topic practice"}
              </Text>
              <Text style={styles.question}>{current.question}</Text>

              <View style={styles.choices}>
                {current.practiceChoices.map((choice) => {
                  const picked = selected === choice;
                  const right = locked && choice === current.correctAnswer;
                  const wrong = locked && picked && !right;

                  return (
                    <Pressable
                      key={choice}
                      disabled={locked}
                      onPress={() => void choose(choice)}
                      style={[
                        styles.choice,
                        right && styles.choiceRight,
                        wrong && styles.choiceWrong,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          right && styles.choiceTextRight,
                          wrong && styles.choiceTextWrong,
                        ]}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {locked ? (
                <View style={styles.feedback}>
                  <Text style={styles.feedbackTitle}>
                    {selected === current.correctAnswer
                      ? "Correct"
                      : "Review this one"}
                  </Text>
                  <Text style={styles.feedbackText}>
                    Correct answer: {current.correctAnswer}
                  </Text>
                </View>
              ) : null}

              <Pressable
                disabled={!locked}
                onPress={next}
                style={[
                  styles.primary,
                  !locked && styles.primaryDisabled,
                ]}
              >
                <Text style={styles.primaryText}>
                  {index >= total - 1 ? "Finish Practice" : "Next Question"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#020617" },
  content: {
    paddingHorizontal: 18,
    paddingTop: 62,
    paddingBottom: 44,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.24)",
    backgroundColor: "rgba(15,23,42,0.84)",
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    color: "#f8fafc",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  stateCard: {
    minHeight: 230,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.24)",
    backgroundColor: "rgba(15,23,42,0.84)",
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  result: {
    color: "#67e8f9",
    fontSize: 30,
    fontWeight: "900",
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.18)",
    backgroundColor: "rgba(15,23,42,0.70)",
    padding: 12,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
  },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.16)",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#67e8f9",
  },
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.24)",
    backgroundColor: "rgba(15,23,42,0.84)",
    padding: 16,
    gap: 14,
  },
  missMeta: {
    color: "#a78bfa",
    fontSize: 10,
    fontWeight: "800",
  },
  question: {
    color: "#f8fafc",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900",
  },
  choices: { gap: 10 },
  choice: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(2,6,23,0.50)",
    paddingHorizontal: 13,
    paddingVertical: 12,
    justifyContent: "center",
  },
  choiceRight: {
    borderColor: "rgba(74,222,128,0.55)",
    backgroundColor: "rgba(22,101,52,0.18)",
  },
  choiceWrong: {
    borderColor: "rgba(248,113,113,0.55)",
    backgroundColor: "rgba(127,29,29,0.18)",
  },
  choiceText: {
    color: "#e2e8f0",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  choiceTextRight: { color: "#bbf7d0" },
  choiceTextWrong: { color: "#fecaca" },
  feedback: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.22)",
    backgroundColor: "rgba(76,29,149,0.10)",
    padding: 12,
  },
  feedbackTitle: {
    color: "#ddd6fe",
    fontSize: 12,
    fontWeight: "900",
  },
  feedbackText: {
    marginTop: 4,
    color: "#c4b5fd",
    fontSize: 11,
    lineHeight: 16,
  },
  primary: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#67e8f9",
  },
  primaryDisabled: { opacity: 0.35 },
  primaryText: {
    color: "#082f49",
    fontSize: 12,
    fontWeight: "900",
  },
  secondary: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.28)",
  },
  secondaryText: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "900",
  },
});
