import React from "react";
import { TouchableOpacity, Text, StyleSheet, Linking } from "react-native";

export default function DonateFab() {
  return (
    <TouchableOpacity
      style={s.fab}
      onPress={() => Linking.openURL("https://buymeacoffee.com/")}
      activeOpacity={0.9}
    >
      <Text style={s.txt}>Donate</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: {
    position: "absolute", right: 16, bottom: 20,
    backgroundColor: "#00e5ff", borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.4, borderColor: "#00141a", elevation: 4
  },
  txt: { color: "#00141a", fontWeight: "900" }
});
