import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList } from "react-native";
import { useThemeColors } from "@/providers/ThemeBridge";

type Ach = { id: string; title: string; desc?: string };
const DATA: Ach[] = [
  { id: "streak-1", title: "First Check-In", desc: "Begin your journey" },
  { id: "quiz-50", title: "Quiz Master 50", desc: "Answer 50 questions" },
  { id: "voice-1", title: "Voice Rookie", desc: "First voice input" }
];

export default function Achievements() {
  const palette = useThemeColors();

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: palette.bg },
        wrap: { padding: 16 },
        header: { fontSize: 28, fontWeight: "800", color: "#fff" },
        sub: { color: palette.muted, marginTop: 4 },
        card: {
          backgroundColor: palette.card,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: palette.border
        },
        title: { color: palette.text, fontWeight: "700", fontSize: 16 },
        desc: { color: palette.muted, marginTop: 2, fontSize: 13 },
        grid: { gap: 12 },
        item: { marginTop: 12 }
      }),
    [palette]
  );

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.wrap}>
        <Text style={s.header}>Achievements</Text>
        <Text style={s.sub}>Your progress and milestones</Text>
        <FlatList
          data={DATA}
          keyExtractor={(it) => it.id}
          contentContainerStyle={s.grid}
          renderItem={({ item }) => (
            <View style={s.item}>
              <View style={s.card}>
                <Text style={s.title}>{item.title}</Text>
                {!!item.desc && <Text style={s.desc}>{item.desc}</Text>}
              </View>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}
