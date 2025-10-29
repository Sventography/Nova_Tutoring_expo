import React from "react";
import { Pressable, Text, StyleSheet, Linking } from "react-native";

export default function DonateButton() {
  return (
    <Pressable
      style={S.button}
      onPress={() => Linking.openURL("https://www.buymeacoffee.com/sventography")}
    >
      <Text style={S.text}>Donate</Text>
    </Pressable>
  );
}

export const S = StyleSheet.create({
  button: {
    backgroundColor: "#0af",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
