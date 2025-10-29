import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function RelaxGradientScreen({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#ffe6f0", "#ffffff"]} style={styles.container}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
