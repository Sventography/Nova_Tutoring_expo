import React from "react";
import { View, Text } from "react-native";
import { useStreak } from "../context/StreakContext";

export default function StreakPill() {
  const { count, loading } = useStreak();
  const n = loading ? 0 : (Number.isFinite(count) ? count : 0);
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "#5cfcc8", backgroundColor: "#0b0f12", flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ color: "#5cfcc8", fontWeight: "800" }}>🔥</Text>
      <Text style={{ color: "#5cfcc8", fontWeight: "800" }}>{String(n)}</Text>
    </View>
  );
}
