import React, { useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TopicIndex } from "../data/flashcards/source";
import { searchTopics } from "../data/flashcards/source";

type Props = {
  value?: TopicIndex | null;
  onChange: (t: TopicIndex) => void;
  placeholder?: string;
};

export default function TopicPicker({ value, onChange, placeholder="Search topics…" }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const results = useMemo(() => searchTopics(q, 60), [q]);

  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <Text style={s.label}>Topic</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        placeholderTextColor="#7aa8b0"
        style={s.input}
      />
      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        style={s.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const active = item.id === value?.id;
          return (
            <TouchableOpacity onPress={() => onChange(item)} style={[s.row, active && s.active]}>
              <Text style={[s.title, active && s.titleActive]} numberOfLines={1}>{item.title}</Text>
              <Text style={s.meta}>{item.group} • {item.count}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: "#eaffff", fontWeight: "900", fontSize: 16, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "rgba(0,229,255,0.35)", backgroundColor: "rgba(0,229,255,0.06)",
    color: "#eaffff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8
  },
  list: { maxHeight: 240 },
  row: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, backgroundColor: "rgba(0,0,0,0.25)"
  },
  active: { borderColor: "#00e5ff", backgroundColor: "rgba(0,229,255,0.08)" },
  title: { color: "#cfefff", fontWeight: "800" },
  titleActive: { color: "#eaffff" },
  meta: { color: "#8fb8c0", fontSize: 12, marginTop: 2 }
});
