import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function Progress() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Progress</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", alignItems: "center" },
  t: { fontSize: 22, fontWeight: "800" },
});
