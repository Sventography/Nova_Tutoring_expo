import React from "react";
import { View, Text } from "react-native";
export default function AchievementToast({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: "#111827",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
      }}
    >
      <Text style={{ color: "white", fontWeight: "800" }}>{text}</Text>
    </View>
  );
}
