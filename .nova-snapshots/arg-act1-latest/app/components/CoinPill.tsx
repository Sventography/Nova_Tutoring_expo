import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useCoins } from "../context/CoinsContext";

export default function CoinPill() {
  const { coins } = useCoins();
  return (
    <View style={S.wrap}>
      <Text style={S.coin}>🪙</Text>
      <Text style={S.txt}>{coins}</Text>
    </View>
  );
}

export const S = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,229,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
    marginLeft: 8
  },
  coin: { fontSize: 14, marginRight: 6 },
  txt:  { color: "#00e5ff", fontWeight: "800" }
});
