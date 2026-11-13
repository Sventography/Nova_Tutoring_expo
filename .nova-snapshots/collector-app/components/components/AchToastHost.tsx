import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAch } from "@/context/AchievementsContext";

export default function AchToastHost() {
  const { toast, clearToast } = useAch();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => clearToast());
  }, [toast]);
  if (!toast) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <View style={styles.card}>
        <Text style={styles.title}>ACHIEVEMENT UNLOCKED</Text>
        <Text style={styles.name}>{toast.name}</Text>
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 80,
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    backgroundColor: "#ff00aa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#00ffcc",
    shadowColor: "#00ffcc",
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  title: {
    color: "#39ff14",
    fontWeight: "900",
    textAlign: "center",
    fontSize: 12,
  },
  name: {
    color: "#cfe6ff",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
});
