// app/(tabs)/flashcards.tsx
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
import {
  getTwentyCardsById,
  searchTopics,
  getTopics,
} from "../_lib/cards20";
import { useCollections } from "../context/CollectionsContext";
import { useTheme } from "../context/ThemeContext";
import { useAchievements } from "../context/AchievementsContext";

type Topic = { id: string; title: string; count?: number };

function TopicChip({
  t,
  active,
  onPress,
}: {
  t: Topic;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.topicChip, active && styles.topicChipActive]}
    >
      <Text style={[styles.topicTitle, active && styles.topicTitleActive]}>
        {t.title}
      </Text>
      <Text style={[styles.topicCount, active && styles.topicCountActive]}>
        {t.count ?? 0} cards
      </Text>
    </Pressable>
  );
}

function CardRow({
  c,
  onSave,
}: {
  c: Card;
  onSave: () => void;
}) {
  const [flip, setFlip] = useState(false);
  const side = flip ? c.back : c.front;

  return (
    <Pressable
      onPress={() => setFlip((v) => !v)}
      style={styles.cardRowOuter}
    >
      <View style={styles.cardRowInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardSideLabel}>
            {flip ? "Answer" : "Question"}
          </Text>
          <Text style={styles.cardText}>{side}</Text>
        </View>
        <Pressable onPress={onSave} style={styles.saveBtn}>
          <Ionicons name="bookmark" size={22} color="#9ff2ff" />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function Flashcards() {
  const { tokens } = useTheme();
  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const inputBg = tokens.isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const inputBorder = tokens.border;
  const placeholderColor = tokens.isDark ? "#678a94" : "#6b7685";

  const { addCard } = useCollections();
  const { onFlashcardSaved } = useAchievements();

  const allTopics = useMemo<Topic[]>(() => getTopics(), []);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    allTopics[0]?.id ?? null
  );
  const [cards, setCards] = useState<Card[]>(
    allTopics[0]?.id ? getTwentyCardsById(allTopics[0].id) : []
  );

  const filteredTopics = useMemo(() => {
    if (!query.trim()) return allTopics;
    return searchTopics(allTopics, query.trim());
  }, [allTopics, query]);

  const activeTitle =
    allTopics.find((t) => t.id === activeId)?.title ?? "Choose a Topic";

  const handleSelectTopic = useCallback((id: string) => {
    setActiveId(id);
    try {
      const next = getTwentyCardsById(id);
      setCards(next);
    } catch (e) {
      console.warn("[flashcards] getTwentyCardsById failed", e);
      setCards([]);
    }
  }, []);

  const handleSaveCard = useCallback(
    async (card: Card) => {
      try {
        await addCard(card);
        if (onFlashcardSaved) onFlashcardSaved();
      } catch (e) {
        console.warn("[flashcards] addCard failed", e);
      }
    },
    [addCard, onFlashcardSaved]
  );

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      {/* header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: headerTextColor }]}>
          Flashcards
        </Text>
      </View>

      {/* search + topics */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: inputBg, borderColor: inputBorder },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={placeholderColor}
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder="Search topics…"
            placeholderTextColor={placeholderColor}
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, color: tokens.text, paddingVertical: 6 }}
          />
        </View>
        <Text
          style={{
            marginTop: 8,
            marginBottom: 4,
            fontSize: 13,
            fontWeight: "600",
            color: tokens.cardText,
          }}
        >
          Choose a Topic
        </Text>
        <FlatList
          data={filteredTopics}
          horizontal
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
          renderItem={({ item }) => (
            <TopicChip
              t={item}
              active={item.id === activeId}
              onPress={() => handleSelectTopic(item.id)}
            />
          )}
        />
      </View>

      {/* cards */}
      <View style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 4,
            color: tokens.cardText,
          }}
        >
          {activeTitle}
        </Text>
        <FlatList
          data={cards}
          keyExtractor={(c, idx) => `${c.id ?? c.front}-${idx}`}
          renderItem={({ item }) => (
            <CardRow c={item} onSave={() => handleSaveCard(item)} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  topicChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  topicChipActive: {
    borderColor: "#00e5ff",
    backgroundColor: "rgba(0,229,255,0.16)",
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#eaf6ff",
  },
  topicTitleActive: {
    color: "#ffffff",
  },
  topicCount: {
    fontSize: 11,
    color: "rgba(234,246,255,0.72)",
  },
  topicCountActive: {
    color: "#ffffff",
  },
  cardRowOuter: {
    marginBottom: 10,
  },
  cardRowInner: {
    flexDirection: "row",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  cardSideLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    color: "rgba(234,246,255,0.78)",
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#ffffff",
  },
  saveBtn: {
    marginLeft: 10,
    alignSelf: "center",
    padding: 4,
  },
});
