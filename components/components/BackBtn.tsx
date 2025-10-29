import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function BackBtn() {
  const r = useRouter();
  return (
    <Pressable style={s.b} onPress={() => r.push("/tabs")}>
      <Text style={s.t}>Back</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  b: {
    position: "absolute",
    left: 16,
    bottom: 16,
    zIndex: 100,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#111",
  },
  t: {
    color: "#0ff",
    fontWeight: "800",
  },
});
