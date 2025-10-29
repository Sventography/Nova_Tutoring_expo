import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";

export default function DonateLink({ bottom = 90 }: { bottom?: number }) {
  const onPress = () =>
    Linking.openURL("https://buymeacoffee.com/sventography");
  return (
    <Pressable onPress={onPress} style={[s.wrap, { bottom }]}>
      <LinearGradient
        colors={["#ff3333", "#ffcc00", "#ff8800"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.btn}
      >
        <Text style={s.t}>Donate</Text>
      </LinearGradient>
    </Pressable>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", right: 16, zIndex: 999 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
  t: { color: "#000", fontWeight: "800", fontSize: 16 },
});
