import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { topics, loadCards } from "../data/flashcards";

type Card = { id: string; front: string; back: string; topic?: string; custom?: boolean };

const STORE_KEY = "@nova:collection:v1";

async function loadCollection(): Promise<Card[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveCollection(items: Card[]) {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function mkId(front: string, back: string, topic?: string) {
  const base = `${front}::${back}::${topic ?? ""}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return "nvc-" + h.toString(16);
}

export default function FlashcardsTab() {
  const [topicModal, setTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(topics[0] ?? null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<Card[]>([]);
  const [cFront, setCFront] = useState("");
  const [cBack, setCBack] = useState("");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const saved = await loadCollection();
      if (mounted.current) setCollection(saved);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedTopic) return setAllCards([]);
      try {
        const raw = await loadCards(selectedTopic);
        const normalized: Card[] = (raw || []).map((c: any) => ({
          id: mkId(c.front, c.back, selectedTopic),
          front: c.front,
          back: c.back,
          topic: selectedTopic,
        }));
        setAllCards(normalized);
      } catch (e) {
        console.error("loadCards failed:", e);
        setAllCards([]);
      }
    })();
  }, [selectedTopic]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter(
      (c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
    );
  }, [allCards, query]);

  function isSaved(id: string) {
    return collection.some((c) => c.id === id);
  }

  async function addToCollection(card: Card) {
    if (isSaved(card.id)) return;
    const updated = [...collection, card];
    setCollection(updated);
    await saveCollection(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function deleteFromCollection(id: string) {
    const updated = collection.filter((c) => c.id !== id);
    setCollection(updated);
    await saveCollection(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function saveCustomCard() {
    const front = cFront.trim();
    const back = cBack.trim();
    if (!front || !back) {
      Alert.alert("Missing text", "Please fill in both front and back.");
      return;
    }
    const card: Card = {
      id: `custom-${Date.now()}`,
      front,
      back,
      custom: true,
      topic: selectedTopic ?? undefined,
    };
    const updated = [...collection, card];
    setCollection(updated);
    await saveCollection(updated);
    setCFront("");
    setCBack("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const renderCard = ({ item }: { item: Card }) => {
    const saved = isSaved(item.id);
    return (
      <View style={styles.card}>
        <Text style={styles.cardFront}>{item.front}</Text>
        <Text style={styles.cardBack}>{item.back}</Text>
        <Pressable
          onPress={() => (saved ? null : addToCollection(item))}
          style={[styles.addBtn, saved && styles.addBtnDisabled]}
        >
          <Text style={styles.addBtnText}>{saved ? "✓ Saved" : "+"}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "black" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => setTopicModal(true)} style={styles.topicBtn}>
            <Text style={styles.topicBtnText}>
              {selectedTopic ? `Topic: ${selectedTopic}` : "Pick a topic"}
            </Text>
          </Pressable>
          <TextInput
            placeholder="Search terms…"
            placeholderTextColor="#99a"
            value={query}
            onChangeText={setQuery}
            style={styles.search}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={renderCard}
          ListEmptyComponent={
            <Text style={styles.empty}>No cards match this search.</Text>
          }
        />

        <View style={styles.customBox}>
          <Text style={styles.sectionTitle}>Create custom card</Text>
          <TextInput
            value={cFront}
            onChangeText={setCFront}
            placeholder="Front"
            placeholderTextColor="#99a"
            style={styles.input}
          />
          <TextInput
            value={cBack}
            onChangeText={setCBack}
            placeholder="Back"
            placeholderTextColor="#99a"
            style={[styles.input, { height: 64 }]}
            multiline
          />
          <Pressable onPress={saveCustomCard} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save to Collection</Text>
          </Pressable>
        </View>

        <View style={styles.collectionBox}>
          <Text style={styles.sectionTitle}>Your collection</Text>
          {collection.length === 0 ? (
            <Text style={styles.emptySmall}>No saved cards yet.</Text>
          ) : (
            <FlatList
              data={collection}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <View style={styles.savedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedFront}>{item.front}</Text>
                    <Text style={styles.savedBack}>{item.back}</Text>
                  </View>
                  <Pressable
                    onPress={() => deleteFromCollection(item.id)}
                    style={styles.delBtn}
                  >
                    <Text style={styles.delBtnText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>

        <Modal visible={topicModal} animationType="slide" transparent>
          <View style={styles.modalWrap}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Choose a topic</Text>
              <FlatList
                data={topics}
                keyExtractor={(t) => t}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelectedTopic(item);
                      setTopicModal(false);
                    }}
                    style={styles.topicItem}
                  >
                    <Text style={styles.topicItemText}>{item}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptySmall}>
                    No topics found. Add JSON files to app/data/flashcards/
                  </Text>
                }
              />
              <Pressable onPress={() => setTopicModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: 8, padding: 12 },
  topicBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  topicBtnText: { color: "#e5e7eb", fontWeight: "600" },
  search: {
    flex: 1,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#0b1020",
    borderWidth: 1,
    borderColor: "#1f2937",
    color: "#e5e7eb",
  },
  card: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 10,
  },
  cardFront: { color: "#F9FAFB", fontWeight: "700", marginBottom: 6 },
  cardBack: { color: "#d1d5db" },
  addBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: "#10b981", fontWeight: "800", fontSize: 18 },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 24 },
  emptySmall: { color: "#9ca3af", marginTop: 6 },
  customBox: { padding: 12, borderTopWidth: 1, borderTopColor: "#111827", gap: 8 },
  sectionTitle: { color: "#e5e7eb", fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#0b1020",
    color: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  saveBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  saveBtnText: { color: "#e5e7eb", fontWeight: "700" },
  collectionBox: { padding: 12, borderTopWidth: 1, borderTopColor: "#111827", gap: 8 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b0f19",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  savedFront: { color: "#F9FAFB", fontWeight: "700" },
  savedBack: { color: "#d1d5db" },
  delBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  delBtnText: { color: "#ef4444", fontWeight: "700" },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: "#0b0f19",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#1f2937",
  },
  modalTitle: { color: "#e5e7eb", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  topicItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2937",
  },
  topicItemText: { color: "#d1d5db" },
  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  modalCloseText: { color: "#e5e7eb", fontWeight: "700" },
});
