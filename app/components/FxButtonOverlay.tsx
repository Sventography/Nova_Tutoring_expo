import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFx } from "../context/FxProvider";

export default function FxButtonOverlay() {
  const { enabled, toggle } = useFx();
  return (
    <View pointerEvents="box-none" style={S.wrap}>
      <Pressable onPress={toggle} hitSlop={10} style={({ pressed }) => [S.btn, pressed ? { opacity: 0.8 } : null]}>
        <Ionicons name={enabled ? "sparkles" : "sparkles-outline"} size={18} color={enabled ? "#00e5ff" : "#cfeff6"} />
      </Pressable>
    </View>
  );
}

export const S = StyleSheet.create({
  wrap: { position: "absolute", top: 8, right: 10, zIndex: 60 },
  btn: { height: 32, minWidth: 36, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(0,229,255,0.5)", alignItems: "center", justifyContent: "center" },
});
