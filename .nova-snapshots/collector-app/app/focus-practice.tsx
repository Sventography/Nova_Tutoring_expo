// app/focus-practice.tsx
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
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import {
  getFocusTopicInsights,
  type FocusTopicInsight,
} from "./_lib/focusPracticeInsights";

const CYAN = "#67e8f9";
const CARD = "rgba(15,23,42,0.84)";
const BORDER = "rgba(103,232,249,0.24)";
const MUTED = "#94a3b8";
const TEXT = "#f8fafc";

function levelLabel(level: FocusTopicInsight["level"]) {
  if (level === "high") return "High priority";
  if (level === "medium") return "Keep practicing";
  return "On track";
}

function scoreCopy(score: number) {
  if (score >= 75) return "Needs focused review";
  if (score >= 60) return "Needs extra practice";
  if (score >= 30) return "Worth reinforcing";
  return "Looking solid";
}

export default function FocusPracticeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<FocusTopicInsight[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTopics(await getFocusTopicInsights());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const highPriority = useMemo(
    () => topics.filter((item) => item.level === "high"),
    [topics]
  );

  const totalUnresolved = useMemo(
    () =>
      topics.reduce(
        (sum, item) => sum + item.unresolvedMistakes,
        0
      ),
    [topics]
  );

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
            <Ionicons name="chevron-back" size={20} color={CYAN} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>FOCUS PRACTICE</Text>
            <Text style={styles.title}>Practice what needs you most</Text>
          <Text
            style={{
              marginTop: 6,
              color: "#94a3b8",
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            Focus score = how strongly Nova recommends reviewing this topic.
            Higher means more review is needed.
          </Text>
            <Text style={styles.subtitle}>
              Nova ranks weak topics using quiz scores, repeat misses,
              unresolved mistakes, and recovery progress.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {highPriority.length}
            </Text>
            <Text style={styles.summaryLabel}>
              high-priority topics
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {totalUnresolved}
            </Text>
            <Text style={styles.summaryLabel}>
              unresolved mistakes
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={CYAN} />
            <Text style={styles.loadingText}>
              Building your focus map...
            </Text>
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="sparkles-outline"
              size={28}
              color={CYAN}
            />
            <Text style={styles.emptyTitle}>
              Nothing to focus on yet
            </Text>
            <Text style={styles.emptyText}>
              Finish a few quizzes. Missed questions and lower-scoring
              topics will automatically appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {topics.map((item, index) => (
              <View key={item.topicId} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.priority}>
                      {levelLabel(item.level)} · {scoreCopy(item.focusScore)}
                    </Text>
                  </View>

                  <View style={styles.scorePill}>
                    <Text style={styles.scoreNumber}>
                      {item.focusScore}
                    </Text>
                    <Text style={styles.scoreLabel}>
                      focus
                    </Text>
                  </View>
                </View>

                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {item.latestPercent == null
                        ? "—"
                        : `${item.latestPercent}%`}
                    </Text>
                    <Text style={styles.metricLabel}>latest</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {item.averagePercent == null
                        ? "—"
                        : `${item.averagePercent}%`}
                    </Text>
                    <Text style={styles.metricLabel}>average</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {item.unresolvedMistakes}
                    </Text>
                    <Text style={styles.metricLabel}>unresolved</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {item.repeatMisses}
                    </Text>
                    <Text style={styles.metricLabel}>repeat misses</Text>
                  </View>
                </View>

                <Text style={styles.cardFoot}>
                  {item.attempts} quiz attempt
                  {item.attempts === 1 ? "" : "s"} ·{" "}
                  {item.uniqueMistakes} tracked mistake
                  {item.uniqueMistakes === 1 ? "" : "s"} ·{" "}
                  {item.recoveredAnswers} recovery answer
                  {item.recoveredAnswers === 1 ? "" : "s"}
                </Text>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/focus-practice-session",
                      params: {
                        topicId: item.topicId,
                        title: item.title,
                      },
                    } as any)
                  }
                  style={styles.practiceButton}
                >
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color="#082f49"
                  />
                  <Text
                    style={styles.practiceButtonText}
                  >
                    Practice This Topic
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#c4b5fd"
          />
          <Text style={styles.noteText}>
            This phase ranks and displays weak areas. The next phase
            turns them into targeted mini-tests and flashcards.
          </Text>
        </View>
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
    gap: 18,
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
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  eyebrow: {
    color: CYAN,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    color: TEXT,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    minHeight: 94,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 14,
    justifyContent: "center",
  },
  summaryNumber: {
    color: CYAN,
    fontSize: 28,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 3,
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  loading: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    minHeight: 210,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 10,
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    maxWidth: 420,
    color: MUTED,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  list: { gap: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 15,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rank: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(103,232,249,0.10)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.22)",
  },
  rankText: {
    color: CYAN,
    fontSize: 12,
    fontWeight: "900",
  },
  topicTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  priority: {
    marginTop: 3,
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  scorePill: {
    minWidth: 54,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: "center",
    backgroundColor: "rgba(76,29,149,0.18)",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.25)",
  },
  scoreNumber: {
    color: "#ddd6fe",
    fontSize: 15,
    fontWeight: "900",
  },
  scoreLabel: {
    marginTop: 1,
    color: "#a78bfa",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metrics: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    minWidth: 76,
    flexGrow: 1,
    borderRadius: 13,
    backgroundColor: "rgba(2,6,23,0.52)",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 2,
    color: MUTED,
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardFoot: {
    marginTop: 11,
    color: "#64748b",
    fontSize: 9,
    lineHeight: 13,
  },
  practiceButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: "#67e8f9",
  },
  practiceButtonDisabled: {
    backgroundColor: "rgba(100,116,139,0.12)",
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.22)",
  },
  practiceButtonText: {
    color: "#082f49",
    fontSize: 11,
    fontWeight: "900",
  },
  practiceButtonTextDisabled: {
    color: "#64748b",
  },
  note: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.20)",
    backgroundColor: "rgba(76,29,149,0.10)",
    padding: 13,
  },
  noteText: {
    flex: 1,
    color: "#c4b5fd",
    fontSize: 10,
    lineHeight: 15,
  },
});
