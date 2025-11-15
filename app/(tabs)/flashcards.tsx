import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Card } from "../_lib/flashcards";
import { getTwentyCardsById, searchTopics, getTopics } from "../_lib/cards20";
import { useCollections } from "../context/CollectionsContext";
import { AchieveEmitter } from "../context/AchievementsContext";
import { useTheme } from "../context/ThemeContext";

type Topic = { id: string; title: string; count?: number };

function TopicChip({
  t,
  onPress,
}: {
  t: Topic;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        S.topic,
        {
          borderColor: tokens.border,
          backgroundColor: tokens.card,
        },
      ]}
    >
      <Text
        style={[
          S.topicTitle,
          {
            color: tokens.text,
          },
        ]}
      >
        {t.title}
      </Text>
      <Text
        style={[
          S.topicCount,
          {
            color: tokens.cardText,
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

  return (
    <Pressable
      onPress={() => setFlip((v) => !v)}
      style={[
        S.cardRow,
        {
          borderColor: tokens.border,
          backgroundColor: tokens.card,
        },
      ]}
    >
      <View style={[S.cardFace, !flip && S.cardFaceActive]}>
        <Text
          style={[
            S.cardText,
            {
              color: tokens.text,
            },
          ]}
        >
          {(c as any).front}
        </Text>
      </View>
      <View style={[S.cardFace, flip && S.cardFaceActive]}>
        <Text
          style={[
            S.cardText,
            {
              color: tokens.text,
            },
          ]}
        >
          {(c as any).back}
        </Text>
      </View>
      <Pressable
        onPress={onSave}
        style={[
          S.saveBtn,
          {
            borderColor: tokens.accent,
          },
        ]}
      >
        <Ionicons name="bookmark-outline" size={18} color={tokens.accent} />
        <Text
          style={[
            S.saveTxt,
            {
              color: tokens.accent,
            },
          ]}
        >
          Save
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function FlashcardsTab() {
  const { tokens } = useTheme();
  const collections = useCollections(); // ✅ real hook from provider
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

  // Theme–driven colors (mirroring Ask page patterns)
  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const inputBg = tokens.isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const inputBorder = tokens.border;
  const placeholderColor = tokens.isDark ? "#678a94" : "#6b7685";
  const accent = tokens.accent;

  // ✅ Save only front/back; let provider mint a fresh id and attach to the active set
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

  const content = !active ? (
    <View style={S.wrap}>
      <Text
        style={[
          S.h1,
          {
            color: headerTextColor,
          },
        ]}
      >
        Flashcards
      </Text>
      <TextInput
        placeholder="Search topics…"
        placeholderTextColor={placeholderColor}
        value={q}
        onChangeText={setQ}
        style={[
          S.search,
          {
            borderColor: inputBorder,
            backgroundColor: inputBg,
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
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  ) : (
    <View style={S.wrap}>
      <View style={S.row}>
        <Pressable onPress={() => setActive(null)} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={accent} />
          <Text
            style={[
              S.backTxt,
              {
                color: accent,
              },
            ]}
          >
            Topics
          </Text>
        </Pressable>
        <Text
          style={[
            S.h1,
            {
              color: headerTextColor,
            },
          ]}
        >
          {active.title}
        </Text>
        <View style={{ width: 48 }} />{/* spacer */}
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
              save({ front: (item as any).front, back: (item as any).back } as any)
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
      />
    </View>
  );

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      {content}
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  wrap: { flex: 1 },
  h1: { fontSize: 20, fontWeight: "800", padding: 12 },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { flexDirection: "row", alignItems: "center", padding: 12 },
  backTxt: { marginLeft: 4, fontWeight: "700" },
  topic: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  topicTitle: { fontWeight: "800", fontSize: 16 },
  topicCount: { marginTop: 4 },
  cardRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardFace: { display: "none" },
  cardFaceActive: { display: "flex" },
  cardText: { fontSize: 16, fontWeight: "700" },
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
  saveTxt: { fontWeight: "700" },
});
