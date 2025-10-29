import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";

type Props = {
  sizes: string[];
  value?: string | null;
  onChange: (s: string) => void;
};

export default function SizeSelector({ sizes, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {sizes.map(s => (
        <Pressable key={s} onPress={() => onChange(s)} style={[styles.pill, value === s && styles.pillActive]}>
          <Text style={styles.label}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "#0ff" },
  pillActive: { borderWidth: 2 },
  label: { fontSize: 12, color: "#fff", fontWeight: "700" }
});
