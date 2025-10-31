import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

const themeTints: Record<string, string[]> = {
  neon: ["rgba(0,229,255,0.06)", "rgba(0,0,0,0.0)", "rgba(0,229,255,0.02)"],
  ocean: ["rgba(0,229,255,0.10)", "rgba(0,80,120,0.08)", "rgba(0,0,0,0)"],
  sunset: ["rgba(255,120,0,0.10)", "rgba(120,0,60,0.08)", "rgba(0,0,0,0)"],
  forest: ["rgba(0,255,170,0.10)", "rgba(0,80,40,0.08)", "rgba(0,0,0,0)"],
  default: ["rgba(255,255,255,0.04)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0)"],
};

export default function ThemeOverlay() {
  const { theme = "default" } = (useTheme() || {}) as any;
  const colors = themeTints[theme] || themeTints.default;
  return (
    <View pointerEvents="none" style={S.wrap}>
      <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={S.tint} />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 9998 },
  tint: { ...StyleSheet.absoluteFillObject },
});
