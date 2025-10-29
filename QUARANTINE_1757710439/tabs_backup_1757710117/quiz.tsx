import React, { useState } from "react";
import { useThemeColors } from "@/providers/ThemeBridge";
import { View, Text, Pressable } from "react-native";
import { awardForQuizResult } from "../_lib/hooks/useNovaAchievements";
export default function Quiz() {
  const palette = useThemeColors();
  const [score, setScore] = useState(0);
  const total = 5;
  async function submit(pct: number) {
    const s = Math.round((pct / 100) * total);
    setScore(s);
    await awardForQuizResult(s, total);
  }
  return (
    <View
      variant="bg"
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        padding: 16,
        paddingTop: 60,
      }}
    >
      <Text
        tone="text"
        style={{
          color: "#e5e7eb",
          fontSize: 24,
          fontWeight: "800",
          marginBottom: 16,
        }}
      >
        Quiz
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => submit(60)}
          style={{ backgroundColor: "#6b7280", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Submit 60%</Text>
        </Pressable>
        <Pressable
          onPress={() => submit(80)}
          style={{ backgroundColor: "#60a5fa", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Submit 80%</Text>
        </Pressable>
        <Pressable
          onPress={() => submit(100)}
          style={{ backgroundColor: "#22c55e", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Perfect</Text>
        </Pressable>
      </View>
      <Text style={{ color: "#c7d2fe", marginTop: 16 }}>
        Last score: {score}/{total}
      </Text>
    </View>
  );
}
