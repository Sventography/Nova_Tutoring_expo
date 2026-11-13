import React from "react";
import GradientScreen from "../components/GradientScreen";
import { View, Text, StyleSheet } from "react-native";

export default function Home() {
  return (
    <GradientScreen>
      <View style={styles.wrap}>
        <Text style={styles.h1}>Welcome to Nova ✨</Text>
        <Text style={styles.h2}>Learn. Play. Achieve.</Text>
      </View>
    </GradientScreen>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  h1: { color: "#cfe8ef", fontWeight: "900", fontSize: 24 },
  h2: { color: "#cfe8ef", fontWeight: "700" },
});
