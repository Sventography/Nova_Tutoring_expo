import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { isSaved, saveCard, removeCard, SavedCard } from "../lib/collections";

export default function CollectButton({
  card,
  style,
}: {
  card: SavedCard;
  style?: ViewStyle;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    isSaved(card.id).then(setSaved);
  }, [card.id]);

  const toggle = async () => {
    const now = await isSaved(card.id);
    if (now) {
      await removeCard(card.id);
      setSaved(false);
    } else {
      await saveCard(card);
      setSaved(true);
    }
  };

  return (
    <TouchableOpacity style={[s.btn, style]} onPress={toggle} hitSlop={10}>
      <Text style={[s.txt, saved && s.txtOn]}>{saved ? "✓" : "+"}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#9fe6ff",
    backgroundColor: "rgba(0,229,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  txt: { color: "#9fe6ff", fontWeight: "900", fontSize: 18 },
  txtOn: { color: "#66ffb3" },
});
