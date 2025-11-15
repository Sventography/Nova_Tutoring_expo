import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Card } from "../_lib/flashcards";
import { getTwentyCardsById, searchTopics, getTopics } from "../_lib/cards20";
import { useCollections } from "../context/CollectionsContext";
import { AchieveEmitter } from "../context/AchievementsContext";
import { useTheme } from "../context/ThemeContext";

type Topic = { id: string; title: string; count?: number };

function TopicChip({ t, onPress }: { t: Topic; onPress: () => void }) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        S.topic,
        {
          borderColor: tokens.border,
          backgroundColor: tokens.isDark
            ? "rgba(0,0,0,0.35)"
            : "rgba(255,255,255,0.6)",
        },
      ]}
    >
      <Text style={[S.topicTitle, { color: tokens.cardText }]}>{t.title}</Text>
      <Text
        style={[
          S.topicCount,
          {
            color: tokens.isDark
              ? "rgba(255,255,255,0.7)"
              : "rgba(0,0,0,0.6)",
          },
        ]}
      >
        {t.count ?? 0} cards
      </Text>
    </Pressable>
  );
}

function CardRow({ c, onSave }: { c: Card; onSave: () => void }) {
  const { tokens } = useTheme();
  const [flip, setFlip] = useState(false);

  const faceBg = tokens.isDark
    ? "rgba(0,0,0,0.5)"
    : "rgba(255,255,255,0.9)";

  return (
    <Pressable
      onPress={() => setFlip((v) => !v)}
      style={[
        S.cardRow,
        {
          borderColor: tokens.border,
          backgroundColor: faceBg,
        },
      ]}
    >
      <View style={[S.cardFace, !flip && S.cardFaceActive]}>
        <Text style={[S.cardText, { color: tokens.cardText }]}>{(c as any).front}</Text>
      </View>
      <View style={[S.cardFace, flip && S.cardFaceActive]}>
        <Text style={[S.cardText, { color: tokens.cardText }]}>{(c as any).back}</Text>
      </View>
      <Pressable
        onPress={onSave}
        style={[
          S.saveBtn,
          {
            borderColor: tokens.accent,
            backgroundColor: tokens.isDark
              ? "rgba(0,0,0,0.8)"
              : "rgba(255,255,255,1)",
          },
        ]}
      >
        <Ionicons name="bookmark-outline" size={18} color={tokens.accent} />
        <Text style={[S.saveTxt, { color: tokens.accent }]}>Save</Text>
      </Pressable>
    </Pressable>
  );
}

export default function FlashcardsTab() {
  const { tokens } = useTheme();
  const collections = useCollections();
  const [q, setQ] = useState("");
  const topicsRaw: Topic[] = useMemo(
    () => (getTopics() || []).map((t: any) => ({ ...t })),
    []
  );

  const topics: Topic[] = useMemo(() => {
    const list = q ? searchTopics(q) : topicsRaw;
    return (list || []).map((t: any) => ({
      ...t,
      count: getTwentyCardsById(t.id).length,
    }));
  }, [q, topicsRaw]);

  const [active, setActive] = useState<Topic | null>(null);
  const cards = useMemo<Card[]>(
    () => (active ? getTwentyCardsById(active.id) : []),
    [active]
  );

  const placeholderColor = tokens.isDark ? "#678a94" : "#6b7685";

  const save = useCallback(
    (c: Card) => {
      try {
        const front = String((c as any).front || "").trim();
        const back = String((c as any).back || "").trim();
        if (!front || !back) return;
        collections.addCard(
          { front, back } as any,
          active?.id,
          active?.title
        );
        try {
          AchieveEmitter?.emit?.("celebrate", "Saved to Collections");
        } catch {}
      } catch (e) {}
    },
    [collections, active]
  );

  if (!active) {
    return (
      <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
        <View style={S.wrap}>
          <Text style={[S.h1, { color: tokens.text }]}>Flashcards</Text>
          <TextInput
            placeholder="Search topics…"
            placeholderTextColor={placeholderColor}
            value={q}
            onChangeText={setQ}
            style={[
              S.search,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.isDark
                  ? "rgba(0,0,0,0.35)"
                  : "rgba(255,255,255,0.7)",
                color: tokens.text,
              },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <FlatList
            data={topics}
            keyExtractor={(t, i) => `${t.id}-${i}`}
            renderItem={({ item }) => (
              <TopicChip t={item} onPress={() => setActive(item)} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={S.wrap}>
        <View style={S.row}>
          <Pressable onPress={() => setActive(null)} style={S.backBtn}>
            <Ionicons name="chevron-back" size={20} color={tokens.accent} />
            <Text style={[S.backTxt, { color: tokens.accent }]}>Topics</Text>
          </Pressable>
          <Text style={[S.h1, { color: tokens.text }]}>{active.title}</Text>
          <View style={{ width: 48 }} />
        </View>
        <FlatList
          data={cards}
          keyExtractor={(c, i) =>
            String((c as any).id ?? (c as any).front ?? "k") + "-" + i
          }
          renderItem={({ item }) => (
            <CardRow
              c={item}
              onSave={() =>
                save({
                  front: (item as any).front,
                  back: (item as any).back,
                } as any)
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        />
      </View>
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  h1: {
    fontSize: 20,
    fontWeight: "800",
    padding: 12,
  },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  backTxt: {
    marginLeft: 4,
    fontWeight: "700",
  },
  topic: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  topicTitle: {
    fontWeight: "800",
    fontSize: 16,
  },
  topicCount: {
    marginTop: 4,
  },
  cardRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardFace: {
    display: "none",
  },
  cardFaceActive: {
    display: "flex",
  },
  cardText: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  saveTxt: {
    fontWeight: "700",
  },
});
