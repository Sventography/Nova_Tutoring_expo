import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";

export function DonateFab() {
  const insets = useSafeAreaInsets();
  const { colors } = useContextSafe();

  return (
    <Pressable
      onPress={() =>
        Linking.openURL("https://www.buymeacoffee.com/sventography")
      }
      style={({ pressed }) => [
        s.wrap,
        { bottom: insets.bottom + 20, borderColor: colors.border },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={["#0ea5e9", "#22d3ee"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.grad}
      >
        <Ionicons name="heart" size={16} color="#00111a" />
        <Text style={s.txt}>Donate</Text>
      </LinearGradient>
      <View style={[s.ring, { borderColor: "rgba(34,211,238,0.35)" }]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    borderRadius: 28,
    overflow: "visible",
  },
  grad: {
    minWidth: 104,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#22d3ee",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  txt: {
    color: "#00111a",
    fontWeight: "900",
    letterSpacing: 0.3,
    fontSize: 14,
  },
  ring: {
    position: "absolute",
    inset: -6,
    borderWidth: 2,
    borderRadius: 34,
  },
});
