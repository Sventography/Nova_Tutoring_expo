import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

export default function GradientSurface({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <LinearGradient
        colors={[tokens.gradFrom, tokens.gradTo]}
        start={{ x: 0.0, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
