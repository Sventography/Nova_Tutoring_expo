// app/(tabs)/flashcards.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

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

function normalizeTitle(title: string) {
  return String(title || "").trim().toLowerCase();
}

// 🔑 Use front+back text as a stable key to detect saved cards
function makeCardKey(c: { front?: string; back?: string }) {
  const f = normalizeTitle(c.front || "");
  const b = normalizeTitle(c.back || "");
  if (!f && !b) return "";
  return `${f}:::${b}`;
}

function TopicChip({
  t,
  active,
  onPress,
  savedCount = 0,
}: {
  t: Topic;
  active: boolean;
  onPress: () => void;
  savedCount?: number;
}) {
  const countLine = `${t.count ?? 0} cards${
    savedCount > 0 ? ` • ${savedCount} saved` : ""
  }`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.topicChip, active && styles.topicChipActive]}
    >
      <Text style={[styles.topicTitle, active && styles.topicTitleActive]}>
        {t.title}
      </Text>
      <Text style={[styles.topicCount, active && styles.topicCountActive]}>
        {countLine}
      </Text>
    </Pressable>
  );
}

function CardRow({
  c,
  saved,
  onSave,
}: {
  c: Card;
  saved: boolean;
  onSave: () => void;
}) {
  const [flip, setFlip] = useState(false);
  const side = flip ? c.back : c.front;

  const handleFlip = () => {
    Haptics.selectionAsync();
    setFlip((v) => !v);
  };

  const handleSavePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
  };

  return (
    <Pressable
      onPress={handleFlip}
      style={styles.cardRowOuter}
    >
      <View style={styles.cardRowInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardSideLabel}>
            {flip ? "Answer" : "Question"}
          </Text>
          <Text style={styles.cardText}>{side}</Text>
        </View>
        <Pressable onPress={handleSavePress} style={styles.saveBtn}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#9ff2ff"
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function Flashcards() {
  const router = useRouter();
  const { tokens } = useTheme();
  const gradient = tokens.gradient;
  const headerTextColor = tokens.text;
  const inputBg = tokens.isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const inputBorder = tokens.border;
  const placeholderColor = tokens.isDark ? "#678a94" : "#6b7685";

  const coll = useCollections();
  const { addCard } = coll;
  const collectionTopics = (coll.topics as any) ?? [];

  const { onFlashcardSaved } = useAchievements();

  // 🔢 Ensure each topic has a reliable `count`
  const allTopics = useMemo<Topic[]>(() => {
    const base: any[] = (getTopics() as any[]) || [];
    return base.map((t) => {
      const id = String(t.id);
      let count: number;

      if (typeof t.count === "number") {
        count = t.count;
      } else if (typeof (t as any).cardCount === "number") {
        count = (t as any).cardCount;
      } else if (Array.isArray((t as any).cards)) {
        count = (t as any).cards.length;
      } else {
        // Fallback: show how many we can pull in this 20-card slice
        try {
          count = getTwentyCardsById(id)?.length ?? 0;
        } catch {
          count = 0;
        }
      }

      return {
        id,
        title: String(t.title || "Untitled"),
        count,
      };
    });
  }, []);

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    allTopics[0]?.id ?? null
  );
  const [cards, setCards] = useState<Card[]>(
    allTopics[0]?.id ? getTwentyCardsById(allTopics[0].id) : []
  );

  const [showSavedModal, setShowSavedModal] = useState(false);

  // 🔢 Build a map: topic title -> saved card count from Collections
  const savedCountsByTitle = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of collectionTopics) {
      const key = normalizeTitle(t?.title ?? "");
      const n = (t?.cards?.length ?? 0) as number;
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + n);
    }
    return map;
  }, [collectionTopics]);

  // ✅ Set of saved card keys so we can fill/empty the bookmark icon
  const savedCardKeys = useMemo(() => {
    const set = new Set<string>();
    for (const t of collectionTopics) {
      const cards = (t?.cards ?? []) as any[];
      for (const c of cards) {
        const key = makeCardKey(c);
        if (key) set.add(key);
      }
    }
    return set;
  }, [collectionTopics]);

  // 🧮 Global totals for banner text
  const collectionTotals = useMemo(
    () => ({
      sets: collectionTopics.length,
      cards: collectionTopics.reduce(
        (n: number, t: any) => n + (t?.cards?.length ?? 0),
        0
      ),
    }),
    [collectionTopics]
  );

  const filteredTopics = useMemo(() => {
    if (!query.trim()) return allTopics;
    return searchTopics(allTopics as any, query.trim());
  }, [allTopics, query]);

  const activeTitle =
    allTopics.find((t) => t.id === activeId)?.title ?? "Choose a Topic";

  const handleSelectTopic = useCallback((id: string) => {
    Haptics.selectionAsync();
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
        const key = makeCardKey(card as any);
        if (key && savedCardKeys.has(key)) {
          // Already saved: still show the "Saved" modal for reassurance
          setShowSavedModal(true);
          return;
        }

        const topic =
          activeId != null
            ? allTopics.find((t) => t.id === activeId) || null
            : null;
        const topicId = topic?.id ?? activeId ?? "flashcards";
        const topicTitle = topic?.title ?? activeTitle;

        // @ts-ignore CollectionsContext supports (card, topicId, topicTitle)
        await addCard(card, topicId, topicTitle);

        if (onFlashcardSaved) onFlashcardSaved();
        setShowSavedModal(true);
      } catch (e) {
        console.warn("[flashcards] addCard failed", e);
      }
    },
    [addCard, onFlashcardSaved, savedCardKeys, activeId, allTopics, activeTitle]
  );

  // Friendly text about saved sets/cards
  const savedSummaryText =
    collectionTotals.cards === 0
      ? "No saved cards yet — your Collections tab will fill up as you bookmark cards."
      : collectionTotals.sets === 1
      ? `You have ${collectionTotals.cards} saved card${
          collectionTotals.cards === 1 ? "" : "s"
        } in 1 set in Collections.`
      : `You have ${collectionTotals.cards} saved card${
          collectionTotals.cards === 1 ? "" : "s"
        } across ${collectionTotals.sets} sets in Collections.`;

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      {/* header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: headerTextColor }]}>
            Flashcards
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              color: tokens.cardText,
            }}
          >
            Tap a card to flip. Tap the bookmark to save it to Collections.
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 11,
              color: tokens.cardText,
            }}
          >
            {savedSummaryText}
          </Text>
        </View>
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
          renderItem={({ item }) => {
            const key = normalizeTitle(item.title);
            const savedCount = savedCountsByTitle.get(key) ?? 0;
            return (
              <TopicChip
                t={item}
                active={item.id === activeId}
                onPress={() => handleSelectTopic(item.id)}
                savedCount={savedCount}
              />
            );
          }}
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
          keyExtractor={(c, idx) => `${(c as any).id ?? c.front}-${idx}`}
          renderItem={({ item }) => {
            const key = makeCardKey(item as any);
            const isSaved = key ? savedCardKeys.has(key) : false;
            return (
              <CardRow
                c={item}
                saved={isSaved}
                onSave={() => handleSaveCard(item)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>

      {/* Saved modal */}
      <Modal
        visible={showSavedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSavedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: tokens.text },
              ]}
            >
              Flashcard Saved
            </Text>
            <Text
              style={[
                styles.modalBody,
                { color: tokens.cardText },
              ]}
            >
              This flashcard has been saved to the Collections tab.
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginTop: 16,
              }}
            >
              <Pressable
                style={[
                  styles.modalBtn,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
                onPress={() => setShowSavedModal(false)}
              >
                <Text
                  style={[
                    styles.modalBtnTxt,
                    { color: tokens.text },
                  ]}
                >
                  Close
                </Text>
              </Pressable>
              <View style={{ width: 10 }} />
              <Pressable
                style={[
                  styles.modalBtn,
                  {
                    borderColor: tokens.accent,
                    backgroundColor: tokens.isDark
                      ? "rgba(0,229,255,0.18)"
                      : "rgba(0,229,255,0.12)",
                  },
                ]}
                onPress={() => {
                  setShowSavedModal(false);
                  router.push("/collections");
                }}
              >
                <Text
                  style={[
                    styles.modalBtnTxt,
                    { color: tokens.text },
                  ]}
                >
                  Go to Collections
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  modalBtnTxt: {
    fontSize: 14,
    fontWeight: "700",
  },
});
