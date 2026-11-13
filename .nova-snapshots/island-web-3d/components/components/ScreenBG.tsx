import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import ThemeOverlay from "./ThemeOverlay";
export default function ScreenBG({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <LinearGradient colors={colors as any} style={{ flex: 1 }}>
      {children}
      <ThemeOverlay />
    </LinearGradient>
  );
}
