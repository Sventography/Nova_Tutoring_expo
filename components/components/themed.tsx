import React from "react";
import { View, Text, ViewProps, TextProps } from "react-native";
import { useThemeColors } from "../providers/ThemeBridge";

export function TView(
  props: ViewProps & { variant?: "bg" | "card" | "border" },
) {
  const palette = useThemeColors();
  const base =
    props.variant === "card"
      ? {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: 1,
        }
      : props.variant === "border"
        ? { borderColor: palette.border, borderWidth: 1 }
        : { backgroundColor: palette.bg };
  return <View {...props} style={[base, props.style]} />;
}

export function TText(
  props: TextProps & { tone?: "text" | "subtext" | "accent" },
) {
  const palette = useThemeColors();
  const color =
    props.tone === "subtext"
      ? palette.subtext
      : props.tone === "accent"
        ? palette.accent
        : palette.text;
  return <Text {...props} style={[{ color }, props.style]} />;
}

export function Card(props: ViewProps) {
  const palette = useThemeColors();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
        },
        props.style,
      ]}
    />
  );
}
