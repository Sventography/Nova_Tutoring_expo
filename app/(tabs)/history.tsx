// app/(tabs)/history.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import { getAll } from "../_lib/quizHistory"; // history store
import { useTheme } from "../context/ThemeContext"; // ✅ real theme hook

const CYAN = "#00E5FF";
const BLUE = "#0B2239";
const BLACK = "#000000";

type QuizEntry = {
  id?: string;
  topicId?: string;
  title?: string;
  total: number;
  correct: number;
  percent?: number;
  finishedAt?: string;
};

export default function HistoryScreen() {
  const [entries, setEntries] = useState<QuizEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔹 Use the same theme system as the rest of the app
  const { tokens } = useTheme();
  const gradientColors =
    tokens?.gradient && Array.isArray(tokens.gradient)
      ? tokens.gradient
      : [BLACK, BLUE];

  const load = useCallback(async () => {
    try {
      const all = await getAll();
      console.log("[history] loaded entries:", all?.length ?? 0);
      setEntries(all || []);
    } catch (e) {
      console.warn("[history] getAll failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const quizzesCompleted = entries.length;

  const avgScore =
    quizzesCompleted === 0
      ? 0
      : Math.round(
          entries.reduce((sum, e) => {
            const pct =
              typeof e.percent === "number"
                ? e.percent
                : e.total
                ? (e.correct / e.total) * 100
                : 0;
            return sum + pct;
          }, 0) / quizzesCompleted
        );

  const flashcardsSaved = 0;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={S.container}
        refreshControl={
          <RefreshControl
            tintColor={CYAN}
            colors={[CYAN]}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {children}
      </ScrollView>
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <Shell>
        <View style={S.center}>
          <ActivityIndicator color={CYAN} />
          <Text style={[S.meta, { marginTop: 8 }]}>Loading history…</Text>
        </View>
      </Shell>
    );
  }

  // 🔹 Sort newest first
  const sorted = entries.slice().sort((a, b) => {
    const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <Shell>
      <Text style={S.title}>Quiz History</Text>

      <View style={S.summaryRow}>
        <View style={S.summaryCard}>
          <Text style={S.summaryLabel}>Quizzes completed</Text>
          <Text style={S.summaryValue}>{quizzesCompleted}</Text>
        </View>
        <View style={S.summaryCard}>
          <Text style={S.summaryLabel}>Average quiz score</Text>
          <Text style={S.summaryValue}>{avgScore}%</Text>
        </View>
        <View style={S.summaryCard}>
          <Text style={S.summaryLabel}>Flashcards saved</Text>
          <Text style={S.summaryValue}>{flashcardsSaved}</Text>
        </View>
      </View>

      <Text style={[S.sectionTitle, { marginTop: 18 }]}>Recent attempts</Text>

      {sorted.length === 0 ? (
        <Text style={S.meta}>Take a quiz to see your attempts here.</Text>
      ) : (
        sorted.map((e, idx) => {
          const pct =
            typeof e.percent === "number"
              ? e.percent
              : e.total
              ? Math.round((e.correct / e.total) * 100)
              : 0;

          let when = "Unknown time";
          if (e.finishedAt) {
            try {
              when = new Date(e.finishedAt).toLocaleString();
            } catch {
              when = e.finishedAt;
            }
          }

          return (
            <View key={e.id ?? idx} style={S.entryCard}>
              <View style={S.entryHeader}>
                <Text style={S.entryTitle}>
                  {e.title || e.topicId || "Quiz"}
                </Text>
                <Text style={S.entryScore}>
                  {e.correct}/{e.total} • {pct}%
                </Text>
              </View>
              <Text style={S.entryMeta}>{when}</Text>
            </View>
          );
        })
      )}
    </Shell>
  );
}

const S = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: CYAN,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: CYAN,
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: CYAN,
    opacity: 0.9,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    marginRight: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CYAN,
    backgroundColor: "rgba(0, 229, 255, 0.06)",
  },
  summaryLabel: {
    fontSize: 12,
    color: CYAN,
    opacity: 0.85,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: CYAN,
  },

  entryCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CYAN,
    backgroundColor: "rgba(0, 229, 255, 0.06)",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: CYAN,
    flexShrink: 1,
    paddingRight: 8,
  },
  entryScore: {
    fontSize: 14,
    fontWeight: "700",
    color: CYAN,
  },
  entryMeta: {
    fontSize: 12,
    color: CYAN,
    opacity: 0.8,
  },
});
