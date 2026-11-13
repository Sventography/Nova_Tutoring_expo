import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TOPIC_PACKS } from "../../constants/flashcards";
import {
  NeonScreen,
  SectionTitle,
  NeonCard,
  NeonText,
  NeonSub,
  NeonButton,
} from "@/components/ui";
import { useCollection } from "../../context/CollectionContext";

export default function FlashcardsDetail() {
  const { slug, start } = useLocalSearchParams<{
    slug: string;
    start?: string;
  }>();
  const router = useRouter();
  const pack = useMemo(() => TOPIC_PACKS.find((p) => p.slug === slug), [slug]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { add, remove, cards } = useCollection();

  useEffect(() => {
    if (start) {
      const s = parseInt(String(start), 10);
      if (!Number.isNaN(s))
        setIndex(Math.max(0, Math.min(s, (pack?.flashcards.length ?? 1) - 1)));
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
  const isSaved = cards.some((c) => c.id === currentId);

  const onNext = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % pack.flashcards.length);
  };
  const onPrev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + pack.flashcards.length) % pack.flashcards.length);
  };

  const onAdd = async () => {
    await add({
      id: currentId,
      front: card.q,
      back: card.a,
      source: { type: "pack", slug: pack.slug, index },
      createdAt: Date.now(),
    });
  };

  const onRemove = async () => {
    await remove(currentId);
  };

  return (
    <NeonScreen>
      <SectionTitle>{pack.topic}</SectionTitle>
      <NeonSub style={{ marginBottom: 8 }}>
        Card {index + 1} / {pack.flashcards.length}
      </NeonSub>

      <Pressable onPress={() => setFlipped((f) => !f)}>
        <NeonCard style={{ minHeight: 160, justifyContent: "center" }}>
          {flipped ? (
            <Text style={{ color: "#cfeaff", lineHeight: 22 }}>{card.a}</Text>
          ) : (
            <Text
              style={{ color: "#eaf6ff", fontWeight: "700", lineHeight: 22 }}
            >
              {card.q}
            </Text>
          )}
        </NeonCard>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={onPrev}>Prev</NeonButton>
        </View>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={() => setFlipped((f) => !f)}>
            {flipped ? "Show Question" : "Show Answer"}
          </NeonButton>
        </View>
        <View style={{ flex: 1 }}>
          <NeonButton onPress={onNext}>Next</NeonButton>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        {isSaved ? (
          <NeonButton onPress={onRemove}>
            🗑️ Remove from My Collection
          </NeonButton>
        ) : (
          <NeonButton onPress={onAdd}>＋ Add to My Collection</NeonButton>
        )}
      </View>

      <View style={{ marginTop: 8 }}>
        <NeonButton onPress={() => router.push("/(tabs)/collection")}>
          Open My Collection
        </NeonButton>
      </View>
    </NeonScreen>
  );
}
