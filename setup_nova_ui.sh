#!/usr/bin/env bash
set -euo pipefail

echo "💠 Nova Setup: starting…"

# 0) Deps (Expo-compatible)
if [ -f package.json ]; then
  npx expo install @react-native-picker/picker @react-native-async-storage/async-storage
else
  echo "⚠️  Run this from your Expo project root (where package.json lives)."
  exit 1
fi

# 1) Folders
mkdir -p app/lib app/context app/components app/custom-card "app/(tabs)" app/constants/flashcards

# 2) Storage utilities
cat > app/lib/storage.ts <<'TS'
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nova.flashcards.collection.v1";
export type UserCard = {
  id: string;                // "custom:uuid" or "pack:slug:index"
  front: string;
  back: string;
  source?: { type: "custom" } | { type: "pack"; slug: string; index: number };
  createdAt: number;
};

export async function loadCollection(): Promise<UserCard[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserCard[]; } catch { return []; }
}

export async function saveCollection(cards: UserCard[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(cards));
}

export async function addToCollection(card: UserCard) {
  const existing = await loadCollection();
  if (!existing.find(c => c.id === card.id)) {
    existing.unshift(card);
    await saveCollection(existing);
  }
}

export async function removeFromCollection(id: string) {
  const existing = await loadCollection();
  await saveCollection(existing.filter(c => c.id !== id));
}
TS

# 3) Collection context
cat > app/context/CollectionContext.tsx <<'TSX'
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { addToCollection, loadCollection, removeFromCollection, saveCollection, UserCard } from "../lib/storage";

type Ctx = {
  cards: UserCard[];
  refresh: () => Promise<void>;
  add: (c: UserCard) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setAll: (c: UserCard[]) => Promise<void>;
};

const CollectionContext = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const refresh = async () => setCards(await loadCollection());
  const add = async (c: UserCard) => { await addToCollection(c); await refresh(); };
  const remove = async (id: string) => { await removeFromCollection(id); await refresh(); };
  const setAll = async (c: UserCard[]) => { await saveCollection(c); await refresh(); };
  useEffect(() => { refresh(); }, []);
  return <CollectionContext.Provider value={{ cards, refresh, add, remove, setAll }}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}
TSX

# 4) Topic Picker (alphabetical)
cat > app/components/TopicPicker.tsx <<'TSX'
import React, { useMemo } from "react";
import { View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { TOPIC_PACKS } from "../constants/flashcards";

export type TopicOption = { label: string; value: string };
export function getSortedTopics(): TopicOption[] {
  return TOPIC_PACKS
    .slice()
    .sort((a, b) => a.topic.localeCompare(b.topic))
    .map(p => ({ label: p.topic, value: p.slug }));
}

export default function TopicPicker({
  value,
  onChange
}: {
  value: string | undefined;
  onChange: (slug: string) => void;
}) {
  const options = useMemo(getSortedTopics, []);
  return (
    <View style={{ backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 12, marginBottom: 12 }}>
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(String(v))}
        dropdownIconColor="#00e5ff"
        style={{ color: "#cfeaff" }}
      >
        {options.map(opt => (
          <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#cfeaff" />
        ))}
      </Picker>
    </View>
  );
}
TSX

# 5) Flashcards tab
cat > "app/(tabs)/flashcards.tsx" <<'TSX'
import React, { useMemo, useState } from "react";
import { FlatList, Pressable } from "react-native";
import TopicPicker, { getSortedTopics } from "../components/TopicPicker";
import { TOPIC_PACKS } from "../constants/flashcards";
import { useRouter } from "expo-router";
import { NeonScreen, SectionTitle, NeonCard, NeonText, NeonSub } from "../components/ui";
import { DonateButton } from "../components/DonateButton";

export default function FlashcardsTab() {
  const router = useRouter();
  const topics = useMemo(getSortedTopics, []);
  const [slug, setSlug] = useState(topics[0]?.value);
  const current = useMemo(() => TOPIC_PACKS.find(p => p.slug === slug), [slug]);

  return (
    <NeonScreen>
      <SectionTitle>Flashcards</SectionTitle>
      <TopicPicker value={slug} onChange={setSlug} />
      {!current ? (
        <NeonSub>No topic selected.</NeonSub>
      ) : (
        <>
          <NeonSub style={{ marginBottom: 8 }}>{current.topic} — {current.flashcards.length} cards</NeonSub>
          <FlatList
            data={current.flashcards}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => router.push({ pathname: "/(tabs)/flashcards/[slug]", params: { slug, start: String(index) } })}>
                <NeonCard style={{ marginBottom: 10 }}>
                  <NeonText numberOfLines={2} style={{ fontWeight: "800" }}>{item.q}</NeonText>
                  <NeonSub numberOfLines={1}>Tap to flip & add to Collection</NeonSub>
                </NeonCard>
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        </>
      )}
      <DonateButton />
    </NeonScreen>
  );
}
TSX

# 6) Flashcard detail (flip + add/remove + start index)
cat > "app/(tabs)/flashcards/[slug].tsx" <<'TSX'
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TOPIC_PACKS } from "../../constants/flashcards";
import { NeonScreen, SectionTitle, NeonCard, NeonText, NeonSub, NeonButton } from "../../components/ui";
import { useCollection } from "../../context/CollectionContext";

export default function FlashcardsDetail() {
  const { slug, start } = useLocalSearchParams<{ slug: string; start?: string }>();
  const router = useRouter();
  const pack = useMemo(() => TOPIC_PACKS.find((p) => p.slug === slug), [slug]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { add, remove, cards } = useCollection();

  useEffect(() => {
    if (start) {
      const s = parseInt(String(start), 10);
      if (!Number.isNaN(s)) setIndex(Math.max(0, Math.min(s, (pack?.flashcards.length ?? 1) - 1)));
    }
  }, [start, pack?.flashcards.length]);

  if (!pack) {
    return (
      <NeonScreen>
        <SectionTitle>Not found</SectionTitle>
        <NeonSub>Couldn’t load this topic.</NeonSub>
        <View style={{ marginTop: 12 }}>
          <NeonButton onPress={() => router.back()}>Go Back</NeonButton>
        </View>
      </NeonScreen>
    );
  }

  const card = pack.flashcards[index];
  const currentId = `pack:${pack.slug}:${index}`;
  const isSaved = cards.some(c => c.id === currentId);

  const onNext = () => { setFlipped(false); setIndex((i) => (i + 1) % pack.flashcards.length); };
  const onPrev = () => { setFlipped(false); setIndex((i) => (i - 1 + pack.flashcards.length) % pack.flashcards.length); };

  const onAdd = async () => {
    await add({
      id: currentId,
      front: card.q,
      back: card.a,
      source: { type: "pack", slug: pack.slug, index },
      createdAt: Date.now()
    });
  };

  const onRemove = async () => {
    await remove(currentId);
  };

  return (
    <NeonScreen>
      <SectionTitle>{pack.topic}</SectionTitle>
      <NeonSub style={{ marginBottom: 8 }}>Card {index + 1} / {pack.flashcards.length}</NeonSub>

      <Pressable onPress={() => setFlipped((f) => !f)}>
        <NeonCard style={{ minHeight: 160, justifyContent: "center" }}>
          {flipped ? (
            <Text style={{ color: "#cfeaff", lineHeight: 22 }}>{card.a}</Text>
          ) : (
            <Text style={{ color: "#eaf6ff", fontWeight: "700", lineHeight: 22 }}>{card.q}</Text>
          )}
        </NeonCard>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}><NeonButton onPress={onPrev}>Prev</NeonButton></View>
        <View style={{ flex: 1 }}><NeonButton onPress={() => setFlipped((f)=>!f)}>{flipped ? "Show Question" : "Show Answer"}</NeonButton></View>
        <View style={{ flex: 1 }}><NeonButton onPress={onNext}>Next</NeonButton></View>
      </View>

      <View style={{ marginTop: 12 }}>
        {isSaved ? (
          <NeonButton onPress={onRemove}>🗑️ Remove from My Collection</NeonButton>
        ) : (
          <NeonButton onPress={onAdd}>＋ Add to My Collection</NeonButton>
        )}
      </View>

      <View style={{ marginTop: 8 }}>
        <NeonButton onPress={() => router.push("/(tabs)/collection")}>Open My Collection</NeonButton>
      </View>
    </NeonScreen>
  );
}
TSX

# 7) My Collection tab (Delete + confirm)
cat > "app/(tabs)/collection.tsx" <<'TSX'
import React from "react";
import { View, FlatList, Pressable, Text, Alert } from "react-native";
import { useCollection } from "../context/CollectionContext";
import { NeonScreen, SectionTitle, NeonCard, NeonText, NeonSub, NeonButton } from "../components/ui";
import { useRouter } from "expo-router";

export default function CollectionTab() {
  const { cards, remove } = useCollection();
  const router = useRouter();

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete card?",
      "This will remove the card from your collection.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => remove(id) }
      ]
    );
  };

  return (
    <NeonScreen>
      <SectionTitle>My Collection</SectionTitle>
      <NeonSub style={{ marginBottom: 10 }}>{cards.length} saved cards</NeonSub>

      <View style={{ marginBottom: 12 }}>
        <NeonButton onPress={() => router.push("/custom-card/new")}>＋ Create Custom Card</NeonButton>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <NeonCard style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <NeonText style={{ fontWeight: "800" }}>{item.front}</NeonText>
                <NeonSub numberOfLines={3}>{item.back}</NeonSub>
                {item.source?.type === "pack" && (
                  <Text style={{ color: "#79dfff", fontSize: 12, marginTop: 6 }}>
                    From: {item.source.slug} #{(item.source.index ?? 0) + 1}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityLabel="Delete card"
                onPress={() => confirmDelete(item.id)}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: "#00e5ff",
                  borderRadius: 10,
                  backgroundColor: "#0b0f12"
                }}
              >
                <Text style={{ color: "#ff7d7d", fontSize: 16 }}>🗑️ Delete</Text>
              </Pressable>
            </View>
          </NeonCard>
        )}
      />
    </NeonScreen>
  );
}
TSX

# 8) Custom Card editor
cat > "app/custom-card/new.tsx" <<'TSX'
import React, { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { NeonScreen, SectionTitle, NeonSub, NeonButton, NeonCard } from "../components/ui";
import { useCollection } from "../context/CollectionContext";

export default function NewCustomCard() {
  const { add } = useCollection();
  const router = useRouter();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const canSave = front.trim().length > 0 && back.trim().length > 0;
  const onSave = async () => {
    if (!canSave) return;
    await add({
      id: `custom:${Date.now()}:${Math.random().toString(36).slice(2,8)}`,
      front: front.trim(),
      back: back.trim(),
      source: { type: "custom" },
      createdAt: Date.now()
    });
    router.replace("/(tabs)/collection");
  };

  return (
    <NeonScreen>
      <SectionTitle>New Custom Card</SectionTitle>
      <NeonSub>Create your own flashcard</NeonSub>

      <NeonCard style={{ padding: 12, marginTop: 12 }}>
        <NeonSub style={{ marginBottom: 6 }}>Front (Question/Prompt)</NeonSub>
        <TextInput
          placeholder="Type the front..."
          placeholderTextColor="#6ccfe0"
          value={front}
          onChangeText={setFront}
          multiline
          style={{ color: "#eaf6ff", minHeight: 70 }}
        />
      </NeonCard>

      <NeonCard style={{ padding: 12, marginTop: 12 }}>
        <NeonSub style={{ marginBottom: 6 }}>Back (Answer/Notes)</NeonSub>
        <TextInput
          placeholder="Type the back..."
          placeholderTextColor="#6ccfe0"
          value={back}
          onChangeText={setBack}
          multiline
          style={{ color: "#eaf6ff", minHeight: 100 }}
        />
      </NeonCard>

      <View style={{ marginTop: 14 }}>
        <NeonButton onPress={onSave} disabled={!canSave}>{canSave ? "Save Card" : "Enter front & back to save"}</NeonButton>
      </View>
    </NeonScreen>
  );
}
TSX

# 9) Wrap app with provider (try root, else tabs)
if [ -f app/_layout.tsx ]; then
  cat > app/_layout.tsx <<'TSX'
import React from "react";
import { Stack } from "expo-router";
import { CollectionProvider } from "./context/CollectionContext";

export default function RootLayout() {
  return (
    <CollectionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CollectionProvider>
  );
}
TSX
elif [ -f "app/(tabs)/_layout.tsx" ]; then
  cat > "app/(tabs)/_layout.tsx" <<'TSX'
import React from "react";
import { Tabs } from "expo-router";
import { CollectionProvider } from "../context/CollectionContext";

export default function TabsLayout() {
  return (
    <CollectionProvider>
      <Tabs screenOptions={{ headerShown: false }} />
    </CollectionProvider>
  );
}
TSX
else
  echo "⚠️  Could not find layout file. Please wrap manually with <CollectionProvider>."
fi

echo "✅ Files written."
echo "💠 Nova Setup: done."

# iOS pods if needed
if [ -d ios ]; then
  npx pod-install || true
fi

# Start Expo
npx expo start -c
#!/usr/bin/env bash
set -euo pipefail

echo "💠 Nova Setup: starting…"

# 0) Deps (Expo-compatible)
if [ -f package.json ]; then
  npx expo install @react-native-picker/picker @react-native-async-storage/async-storage
else
  echo "⚠️  Run this from your Expo project root (where package.json lives)."
  exit 1
fi

# 1) Folders
mkdir -p app/lib app/context app/components app/custom-card "app/(tabs)" app/constants/flashcards

# 2) Storage utilities
cat > app/lib/storage.ts <<'TS'
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nova.flashcards.collection.v1";
export type UserCard = {
  id: string;
  front: string;
  back: string;
  source?: { type: "custom" } | { type: "pack"; slug: string; index: number };
  createdAt: number;
};

export async function loadCollection(): Promise<UserCard[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserCard[]; } catch { return []; }
}

export async function saveCollection(cards: UserCard[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(cards));
}

export async function addToCollection(card: UserCard) {
  const existing = await loadCollection();
  if (!existing.find(c => c.id === card.id)) {
    existing.unshift(card);
    await saveCollection(existing);
  }
}

export async function removeFromCollection(id: string) {
  const existing = await loadCollection();
  await saveCollection(existing.filter(c => c.id !== id));
}
TS

# 3) Collection context
cat > app/context/CollectionContext.tsx <<'TSX'
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { addToCollection, loadCollection, removeFromCollection, saveCollection, UserCard } from "../lib/storage";

type Ctx = {
  cards: UserCard[];
  refresh: () => Promise<void>;
  add: (c: UserCard) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setAll: (c: UserCard[]) => Promise<void>;
};

const CollectionContext = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const refresh = async () => setCards(await loadCollection());
  const add = async (c: UserCard) => { await addToCollection(c); await refresh(); };
  const remove = async (id: string) => { await removeFromCollection(id); await refresh(); };
  const setAll = async (c: UserCard[]) => { await saveCollection(c); await refresh(); };
  useEffect(() => { refresh(); }, []);
  return <CollectionContext.Provider value={{ cards, refresh, add, remove, setAll }}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}
TSX

# 4) Topic Picker (alphabetical)
cat > app/components/TopicPicker.tsx <<'TSX'
import React, { useMemo } from "react";
import { View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { TOPIC_PACKS } from "../constants/flashcards";

export type TopicOption = { label: string; value: string };
export function getSortedTopics(): TopicOption[] {
  return TOPIC_PACKS
    .slice()
    .sort((a, b) => a.topic.localeCompare(b.topic))
    .map(p => ({ label: p.topic, value: p.slug }));
}

export default function TopicPicker({
  value,
  onChange
}: {
  value: string | undefined;
  onChange: (slug: string) => void;
}) {
  const options = useMemo(getSortedTopics, []);
  return (
    <View style={{ backgroundColor: "#0b0f12", borderColor: "#00e5ff", borderWidth: 1, borderRadius: 12, marginBottom: 12 }}>
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(String(v))}
        dropdownIconColor="#00e5ff"
        style={{ color: "#cfeaff" }}
      >
        {options.map(opt => (
          <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#cfeaff" />
        ))}
      </Picker>
    </View>
  );
}
TSX

# 5) Flashcards tab
cat > "app/(tabs)/flashcards.tsx" <<'TSX'
import React, { useMemo, useState } from "react";
import { FlatList, Pressable } from "react-native";
import TopicPicker, { getSortedTopics } from "../components/TopicPicker";
import { TOPIC_PACKS } from "../constants/flashcards";
import { useRouter } from "expo-router";
import { NeonScreen, SectionTitle, NeonCard, NeonText, NeonSub } from "../components/ui";
import { DonateButton } from "../components/DonateButton";

export default function FlashcardsTab() {
  const router = useRouter();
  const topics = useMemo(getSortedTopics, []);
  const [slug, setSlug] = useState(topics[0]?.value);
  const current = useMemo(() => TOPIC_PACKS.find(p => p.slug === slug), [slug]);

  return (
    <NeonScreen>
      <SectionTitle>Flashcards</SectionTitle>
      <TopicPicker value={slug} onChange={setSlug} />
      {!current ? (
        <NeonSub>No topic selected.</NeonSub>
      ) : (
        <>
          <NeonSub style={{ marginBottom: 8 }}>{current.topic} — {current.flashcards.length} cards</NeonSub>
          <FlatList
            data={current.flashcards}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => router.push({ pathname: "/(tabs)/flashcards/[slug]", params: { slug, start: String(index) } })}>
                <NeonCard style={{ marginBottom: 10 }}>
                  <NeonText numberOfLines={2} style={{ fontWeight: "800" }}>{item.q}</NeonText>
                  <NeonSub numberOfLines={1}>Tap to flip & add to Collection</NeonSub>
                </NeonCard>
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        </>
      )}
      <DonateButton />
    </NeonScreen>
  );
}
TSX

# 6) Flashcard detail (flip + add/remove)
cat > "app/(tabs)/flashcards/[slug].tsx" <<'TSX'
... [the full detail screen code you saw earlier with Add/Remove toggle] ...
TSX

# 7) My Collection tab
cat > "app/(tabs)/collection.tsx" <<'TSX'
... [the full My Collection code with Delete button + confirm] ...
TSX

# 8) Custom Card editor
cat > "app/custom-card/new.tsx" <<'TSX'
... [the full Custom Card editor code] ...
TSX

# 9) Wrap app with provider
if [ -f app/_layout.tsx ]; then
  cat > app/_layout.tsx <<'TSX'
import React from "react";
import { Stack } from "expo-router";
import { CollectionProvider } from "./context/CollectionContext";

export default function RootLayout() {
  return (
    <CollectionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CollectionProvider>
  );
}
TSX
elif [ -f "app/(tabs)/_layout.tsx" ]; then
  cat > "app/(tabs)/_layout.tsx" <<'TSX'
import React from "react";
import { Tabs } from "expo-router";
import { CollectionProvider } from "../context/CollectionContext";

export default function TabsLayout() {
  return (
    <CollectionProvider>
      <Tabs screenOptions={{ headerShown: false }} />
    </CollectionProvider>
  );
}
TSX
else
  echo "⚠️  Could not find layout file. Please wrap manually with <CollectionProvider>."
fi

echo "✅ Files written."
echo "💠 Nova Setup: done."

# iOS pods if needed
if [ -d ios ]; then
  npx pod-install || true
fi

# Start Expo
npx expo start -c
#!/usr/bin/env bash
set -euo pipefail

echo "💠 Nova Setup: starting…"

# 0) Deps (Expo-compatible)
if [ -f package.json ]; then
  npx expo install @react-native-picker/picker @react-native-async-storage/async-storage
else
  echo "⚠️  Run this from your Expo project root (where package.json lives)."
  exit 1
fi

# 1) Folders
mkdir -p app/lib app/context app/components app/custom-card "app/(tabs)" app/constants/flashcards

# 2) Storage utilities
cat > app/lib/storage.ts <<'TS'
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nova.flashcards.collection.v1";
export type UserCard = {
  id: string;
  front: string;
  back: string;
  source?: { type: "custom" } | { type: "pack"; slug: string; index: number };
  createdAt: number;
};

export async function loadCollection(): Promise<UserCard[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as UserCard[]; } catch { return []; }
}

export async function saveCollection(cards: UserCard[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(cards));
}

export async function addToCollection(card: UserCard) {
  const existing = await loadCollection();
  if (!existing.find(c => c.id === card.id)) {
    existing.unshift(card);
    await saveCollection(existing);
  }
}

export async function removeFromCollection(id: string) {
  const existing = await loadCollection();
  await saveCollection(existing.filter(c => c.id !== id));
}
TS

# 3) Collection context
cat > app/context/CollectionContext.tsx <<'TSX'
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { addToCollection, loadCollection, removeFromCollection, saveCollection, UserCard } from "../lib/storage";

type Ctx = {
  cards: UserCard[];
  refresh: () => Promise<void>;
  add: (c: UserCard) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setAll: (c: UserCard[]) => Promise<void>;
};

const CollectionContext = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<UserCard[]>([]);
  const refresh = async () => setCards(await loadCollection());
  const add = async (c: UserCard) => { await addToCollection(c); await refresh(); };
  const remove = async (id: string) => { await removeFromCollection(id); await refresh(); };
  const setAll = async (c: UserCard[]) => { await saveCollection(c); await refresh(); };
  useEffect(() => { refresh(); }, []);
  return <CollectionContext.Provider value={{ cards, refresh, add, remove, setAll }}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}
TSX

# … (rest of script continues with TopicPicker, Flashcards tab, Flashcard detail, My Collection tab, Custom Card editor, and layout wrap) …

# iOS pods if needed (safe to skip if not prebuilt)
if [ -d ios ]; then
  npx pod-install || true
fi

# Start Expo (use npx so you don't need global expo)
npx expo start -c

