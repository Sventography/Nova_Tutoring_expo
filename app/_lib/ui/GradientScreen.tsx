import React from "react";
import { ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Variant = "dark" | "relax";
type Props = { variant?: Variant; children: React.ReactNode; style?: ViewStyle };

export function GradientScreen({ variant = "dark", children, style }: Props) {
  const colors = variant === "dark" ? ["#0b1020", "#000000"] : ["#ffd6e7", "#ffffff"];
  return (
    <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

export const Glow = {
  textCyan: {
    color: "#a7f3ff",
    textShadowColor: "rgba(34, 211, 238, 0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  } as TextStyle,
  borderCyan: {
    borderColor: "#22d3ee",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  } as ViewStyle,
  textRose: {
    color: "#8a275b",
    textShadowColor: "rgba(255, 192, 203, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  } as TextStyle,
};
