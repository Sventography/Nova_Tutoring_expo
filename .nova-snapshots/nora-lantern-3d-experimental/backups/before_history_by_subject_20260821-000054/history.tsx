// app/(tabs)/history.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";

import { useTheme } from "../context/ThemeContext";
import ThemedText from "../components/ThemedText";
import { getAll as getQuizHistory } from "../_lib/quizHistory";

type QuizEntry = {
  id: string;
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt?: string;
};

export default function HistoryScreen() {
  const { tokens } = useTheme();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<QuizEntry[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const list = await getQuizHistory();
      const arr: QuizEntry[] = Array.isArray(list) ? (list as QuizEntry[]) : [];

      arr.sort((a, b) => {
        const ta = a.finishedAt ? Date.parse(a.finishedAt) : 0;
        const tb = b.finishedAt ? Date.parse(b.finishedAt) : 0;
        return tb - ta;
      });

      setEntries(arr);
    } catch (e) {
      console.warn("[History] getQuizHistory failed", e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    setLoading(true);
    loadHistory();
  }, [loadHistory]);

  // 🔁 reload every time the History tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [loadHistory])
  );

  const quizzesCompleted = entries.length;
  const avgScore =
    quizzesCompleted === 0
      ? 0
      : Math.round(
          entries.reduce((sum, e) => sum + (Number(e.percent ?? 0) || 0), 0) /
            quizzesCompleted
        );

  const bgColors = tokens?.gradient ?? [tokens.background, tokens.card];

  return (
    <LinearGradient colors={bgColors} style={{ flex: 1 }}>
      <View style={S.container}>
        {/* Header / stats */}
        <View style={S.headerBlock}>
          <ThemedText weight="bold" style={S.title}>
            Quiz History
          </ThemedText>

          <View style={S.statsRow}>
            <View style={[S.statCard, { backgroundColor: tokens.card }]}>
              <ThemedText muted style={S.statLabel}>
                Quizzes completed
              </ThemedText>
              <ThemedText weight="bold" style={S.statValue}>
                {quizzesCompleted}
              </ThemedText>
            </View>

            <View style={[S.statCard, { backgroundColor: tokens.card }]}>
              <ThemedText muted style={S.statLabel}>
                Average quiz score
              </ThemedText>
              <ThemedText weight="bold" style={S.statValue}>
                {avgScore}%
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText weight="medium" muted style={S.sectionTitle}>
          Recent attempts
        </ThemedText>

        {loading ? (
          <View style={S.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : entries.length === 0 ? (
          <View style={S.emptyWrap}>
            <ThemedText muted>
              No quiz attempts yet. Take a quiz to see your history here.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={S.listContent}
            renderItem={({ item }) => (
              <HistoryCard item={item} tokens={tokens} />
            )}
          />
        )}
      </View>
    </LinearGradient>
  );
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return "";
  }
}

function HistoryCard({ item, tokens }: { item: QuizEntry; tokens: any }) {
  const topic = item.title || "Quiz";
  const correct = Number(item.correct ?? 0);
  const total = Number(item.total ?? 0);
  const pct = Number(item.percent ?? 0);
  const when = formatWhen(item.finishedAt);

  return (
    <View
      style={[
        S.card,
        {
          backgroundColor: tokens.card,
          shadowColor: tokens.accent,
        },
      ]}
    >
      <View style={S.cardHeaderRow}>
        <ThemedText weight="bold" style={S.cardTitle}>
          {topic}
        </ThemedText>
        <ThemedText
          weight="bold"
          style={[
            S.cardScore,
            {
              color:
                pct >= 80
                  ? tokens.accent
                  : pct >= 50
                  ? tokens.text
                  : tokens.cardText,
            },
          ]}
        >
          {correct}/{total} • {pct}%
        </ThemedText>
      </View>
      {when ? (
        <ThemedText muted style={S.cardMeta}>
          {when}
        </ThemedText>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerBlock: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    opacity: 0.96,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
  },
  cardScore: {
    fontSize: 13,
  },
  cardMeta: {
    fontSize: 11,
  },
});
