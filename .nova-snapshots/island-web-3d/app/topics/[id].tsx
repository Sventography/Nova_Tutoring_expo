import FooterDonate from "@/components/FooterDonate";
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, Link } from "expo-router";
import { FLASHCARD_TOPICS } from "../constants/flashcards";
import { getCardsByTopic, shuffle } from "../_lib/cards";
import { useUser } from "@/context/UserContext";

function CardView({
  front,
  back,
  onSave,
}: {
  front: string;
  back: string;
  onSave: () => void;
}) {
  const [flip, setFlip] = useState(false);
  return (
    <View variant="bg" style={s.cardWrap}>
      <Pressable
        style={[s.card, flip && s.cardOn]}
        onPress={() => setFlip((v) => !v)}
      >
        <Text style={s.cardT}>{flip ? back : front}</Text>
        <Text style={s.hint}>
          {flip ? "tap to see front" : "tap to see back"}
        </Text>
      </Pressable>
      <Pressable style={s.save} onPress={onSave}>
        <Text style={s.saveT}>Save</Text>
      </Pressable>
      <FooterDonate />
    </View>
  );
}

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notifyEvent } = useUser();
  const topic = useMemo(() => FLASHCARD_TOPICS.find((t) => t.id === id), [id]);
  if (!topic)
    return (
      <View style={s.c}>
        <Text style={s.tt}>Not found</Text>
        <FooterDonate />
      </View>
    );
  return (
    <View style={s.c}>
      <Link href="/topics" asChild>
        <Pressable style={s.back}>
          <Text style={s.backT}>← Topics</Text>
        </Pressable>
      </Link>
      <Text style={s.tt}>{topic.title}</Text>
      <FlatList
        data={topic.cards}
        keyExtractor={(x, i) => String(i)}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 60 }}
        renderItem={({ item }) => (
          <CardView
            front={item.front}
            back={item.back}
            onSave={async () => {
              await saveCard({ front: item.front, back: item.back });
              await notifyEvent("saveCard");
            }}
          />
        )}
      />
      <FooterDonate />
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: "#0b0b16",
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  tt: {
    color: "#cfe6ff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  back: {
    position: "absolute",
    left: 16,
    bottom: 16,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 10,
    backgroundColor: "#111",
  },
  backT: { color: "#0ff", fontWeight: "800" },
  cardWrap: { flex: 1, margin: 8 },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#111",
  },
  cardOn: { borderColor: "#9ff" },
  cardT: {
    color: "#cfe6ff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: { color: "#7f9bb8", fontSize: 11, marginTop: 8 },
  save: {
    marginTop: 8,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#111",
  },
  saveT: { color: "#0ff", fontWeight: "800" },
});
