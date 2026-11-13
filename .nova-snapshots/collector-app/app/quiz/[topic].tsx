import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { getCardsById } from "../_lib/flashcards";

export default function QuizTopic() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await getCardsById(id as string);
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 20);
      setCards(shuffled);
    };
    load();
  }, [id]);

  // countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || finished) return;
    const t = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, finished]);

  const handleAnswer = useCallback(
    (choice: string) => {
      const correct = cards[index]?.answer?.trim() === choice.trim();
      if (correct) setScore((s) => s + 1);

      if (index < cards.length - 1) {
        setTimeout(() => setIndex((i) => i + 1), 600);
      } else {
        setFinished(true);
      }
    },
    [cards, index]
  );

  if (!cards.length)
    return (
      <View style={S.center}>
        <Text style={{ color: "#fff" }}>Loading quiz...</Text>
      </View>
    );

  if (finished)
    return (
      <View style={S.center}>
        <Text style={S.title}>Quiz Complete!</Text>
        <Text style={S.subtitle}>
          You scored {score}/{cards.length}
        </Text>
        <Pressable onPress={() => router.back()} style={S.backBtn}>
          <Text style={S.backTxt}>Back</Text>
        </Pressable>
      </View>
    );

  const card = cards[index];
  const min = Math.floor(timeLeft / 60);
  const sec = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <LinearGradient colors={["#0A0A0A", "#001F3F"]} style={S.container}>
      <View style={S.header}>
        <Text style={S.title}>{title}</Text>
        <Text style={S.subtitle}>
          {index + 1}/{cards.length} • {min}:{sec}
        </Text>
      </View>

      <Text style={S.qLabel}>{card.question}</Text>

      {card.choices?.map((choice: string, i: number) => (
        <Pressable key={i} style={S.choice} onPress={() => handleAnswer(choice)}>
          <Text style={S.choiceTxt}>{choice}</Text>
        </Pressable>
      ))}
    </LinearGradient>
  );
}

export const S = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: "#9FE2FF", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#BFEFFF", marginTop: 6 },
  qLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  choice: {
    backgroundColor: "#07243F",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0FD68D",
    marginVertical: 6,
  },
  choiceTxt: { color: "#9FE2FF", fontSize: 16 },
  backBtn: {
    backgroundColor: "#0E3C2A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backTxt: { color: "#9FE2FF", fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
