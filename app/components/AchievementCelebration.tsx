import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AchievementCelebration({ trigger, title }: { trigger: boolean; title: string }) {
  if (!trigger) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.text}>🎉 Achievement Unlocked: {title} 🎉</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    padding: 16,
    zIndex: 999,
  },
  text: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
});
