import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { useCoins } from "../state/CoinsContext";
export default function CoinPill() {
  const { coins } = useCoins();
  const prev = useRef(coins);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (coins > prev.current) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prev.current = coins;
  }, [coins]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={{
          backgroundColor: "#111827",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>🪙 {coins}</Text>
      </View>
    </Animated.View>
  );
}
