import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type FlashcardProps = {
  question?: string;
  answer?: string;
  children?: React.ReactNode;
};

function Flashcard({ question, answer, children }: FlashcardProps) {
  return (
    <View style={s.card}>
      {question ? <Text style={s.q}>{question}</Text> : null}
      {answer ? <Text style={s.a}>{answer}</Text> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#1e2b55", backgroundColor: "#0b1020" },
  q: { color: "#e6f0ff", fontWeight: "800", marginBottom: 6 },
  a: { color: "#9bb7e0" }
});

export default Flashcard;
export { Flashcard };
