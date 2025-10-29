import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function Home() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Home</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", alignItems: "center" },
  t: { fontSize: 22, fontWeight: "800" },
});
