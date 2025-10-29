import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
  onPress?: () => void;
  style?: ViewStyle;
  label?: string;
};

export default function BackBtn({ onPress, style, label }: Props) {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) onPress();
    else router.back();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.btn,
        style,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label || "Go back"}
    >
      <Ionicons name="chevron-back" size={18} color="#cfe8ef" />
      <Text style={styles.txt}>{label ?? "Back"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  txt: {
    color: "#cfe8ef",
    fontWeight: "700",
  },
});
