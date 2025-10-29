import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFx } from "../app/context/FxContext";

export default function FxToggle() {
  const { enabled, toggle } = useFx();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => ({
        marginLeft: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: enabled ? "#00e5ff" : "#294b55",
        backgroundColor: pressed ? "rgba(0,229,255,0.12)" : "rgba(0,229,255,0.08)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      })}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Toggle visual effects"
    >
      <Ionicons name={enabled ? "rainy" : "rainy-outline"} size={16} color={enabled ? "#00e5ff" : "#8fb9c4"} />
      <Text style={{ color: "#cfeaf0", fontWeight: "700", fontSize: 12 }}>FX</Text>
    </Pressable>
  );
}
