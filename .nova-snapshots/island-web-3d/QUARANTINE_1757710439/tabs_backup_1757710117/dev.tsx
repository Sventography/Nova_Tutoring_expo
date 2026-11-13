import React from "react";
import { View, Text, Pressable } from "react-native";
import { useCoins } from "../state/coins";
import { useFlags } from "../state/flags";

export default function Dev() {
  const { coins, addCoins, setCoins } = useCoins();
  const { devUnlocked } = useFlags();

  if (!devUnlocked && !__DEV__) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0b0f14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", opacity: 0.6 }}>Not Found</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0b0f14",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "white", fontSize: 20, marginBottom: 20 }}>
        Dev Coins Screen
      </Text>
      <Text style={{ color: "#22d3ee", fontSize: 18, marginBottom: 40 }}>
        {coins} coins
      </Text>

      <Pressable
        onPress={() => addCoins(1000)}
        style={{
          backgroundColor: "#0ea5e9",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>+1,000 Coins</Text>
      </Pressable>

      <Pressable
        onPress={() => addCoins(5000)}
        style={{
          backgroundColor: "#22d3ee",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>+5,000 Coins</Text>
      </Pressable>

      <Pressable
        onPress={() => setCoins(0)}
        style={{
          backgroundColor: "#ef4444",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Reset Coins to 0
        </Text>
      </Pressable>
    </View>
  );
}
