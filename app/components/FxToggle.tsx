import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFx } from "../context/FxProvider";

export default function FxToggle() {
  const { enabled, toggle } = useFx();
  return (
    <Pressable onPress={toggle} hitSlop={8} style={({pressed}) => [S.btn, pressed ? {opacity:0.85} : null]}>
      <Ionicons name={enabled ? "sparkles" : "sparkles-outline"} size={18} color={enabled ? "#00e5ff" : "#cfeff6"} />
    </Pressable>
  );
}

export const S = StyleSheet.create({
  btn: { height: 32, minWidth: 36, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(0,229,255,0.5)", alignItems: "center", justifyContent: "center", marginRight: 8 }
});
