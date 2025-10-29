import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function Orders() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Orders</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0b10",
  },
  t: { color: "#e5e7eb", fontSize: 22, fontWeight: "800" },
});
