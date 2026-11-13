import React from "react";
import { Pressable, Text, ViewStyle, TextStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "subtle";
  style?: ViewStyle;
  textStyle?: TextStyle;
};
export default function NButton({
  title,
  onPress,
  variant = "primary",
  style,
  textStyle,
}: Props) {
  const { accent } = useTheme();
  const bg =
    variant === "primary"
      ? accent
      : variant === "ghost"
        ? "transparent"
        : "rgba(255,255,255,0.7)";
  const color = variant === "primary" ? "#fff" : "#111";
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress && onPress();
      }}
      style={[
        {
          backgroundColor: bg,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={[{ color, fontWeight: "800" }, textStyle]}>{title}</Text>
    </Pressable>
  );
}
