import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAll as getQuizHistory } from "../_lib/quizHistory";
import { getFlashSavedTotal } from "../_lib/collectionsStats";
import { useTheme } from "../context/ThemeContext";

type Entry = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt: string;
};

export default function HistoryScreen() {
  const { tokens } = useTheme();
  const [items, setItems] = useState<Entry[]>([]);
  const [flashSaved, setFlashSaved] = useState(0);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const arr = await getQuizHistory();
        if (on) setItems(arr as Entry[]);
      } catch {
        if (on) setItems([]);
      }
      try {
        const n = await getFlashSavedTotal();
        if (on) setFlashSaved(n);
      } catch {}
    })();
    return () => {
      on = false;
    };
  }, []);

  const quizzesCompleted = items.length;
  const avgScore = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce(
      (n, e) => n + (Number(e.percent) || 0),
      0
    );
    return Math.round(sum / items.length);
  }, [items]);

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(e, i) => `${e.topicId}-${e.finishedAt}-${i}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text style={[S.h1, { color: tokens.accent }]}>
              Quiz History
            </Text>

            <View
              style={[
                S.card,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                },
              ]}
            >
              <Text style={[S.k, { color: tokens.cardText }]}>
                Quizzes completed
              </Text>
              <Text style={[S.v, { color: tokens.text }]}>
                {quizzesCompleted}
              </Text>
            </View>

            <View
              style={[
                S.card,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                },
              ]}
            >
              <Text style={[S.k, { color: tokens.cardText }]}>
                Average quiz score
              </Text>
              <Text style={[S.v, { color: tokens.text }]}>
                {avgScore}%
              </Text>
            </View>

            <View
              style={[
                S.card,
                {
                  borderColor: tokens.border,
                  backgroundColor: tokens.card,
                },
              ]}
            >
              <Text style={[S.k, { color: tokens.cardText }]}>
                Flashcards saved
              </Text>
              <Text style={[S.v, { color: tokens.text }]}>
                {flashSaved}
              </Text>
            </View>

            <Text
              style={[
                S.h2,
                { marginTop: 14, color: tokens.text },
              ]}
            >
              Recent attempts
            </Text>

            {!items.length && (
              <View
                style={[
                  S.empty,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.card,
                  },
                ]}
              >
                <Text
                  style={[
                    S.emptyIcon,
                    { color: tokens.accent },
                  ]}
                >
                  ⏳
                </Text>
                <Text
                  style={[
                    S.emptyTxt,
                    { color: tokens.cardText },
                  ]}
                >
                  No finished quizzes yet{"\n"}
                  Finish a quiz to see it here.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              S.row,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.card,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  S.title,
                  { color: tokens.text },
                ]}
              >
                {item.title || item.topicId}
              </Text>
              <Text
                style={[
                  S.meta,
                  { color: tokens.cardText },
                ]}
              >
                {new Date(item.finishedAt).toLocaleString()}
              </Text>
            </View>
            <Text
              style={[
                S.badge,
                { color: tokens.text },
                item.percent >= 80 && {
                  color: tokens.accent,
                },
              ]}
            >
              {item.correct}/{item.total} • {item.percent}%
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  h1: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: "800",
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  k: {},
  v: { fontSize: 18, fontWeight: "800" },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
  },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyTxt: { textAlign: "center" },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontWeight: "800" },
  meta: {},
  badge: { fontWeight: "800" },
});
