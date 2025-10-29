import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useCoins } from "../context/CoinsContext";

export default function HeaderCoinPill() {
  const { coins } = useCoins();

  return (
    <View style={S.pill}>
      <Image
        source={require("../assets/coin.png")}
        style={S.icon}
        resizeMode="contain"
      />
      <Text style={S.text}>{coins}</Text>
    </View>
  );
}

export const S = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  icon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
