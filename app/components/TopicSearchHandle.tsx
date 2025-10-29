import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export default function TopicSearchHandle({ title, onPress }: { title?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={s.box}>
        <Text style={s.placeholder} numberOfLines={1}>{title || "Search topics…"}</Text>
      </View>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  box: {
    borderWidth: 1, borderColor: "rgba(0,229,255,0.35)", backgroundColor: "rgba(0,229,255,0.06)",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8
  },
  placeholder: { color: "#9fd9e6", fontWeight: "800" }
});
