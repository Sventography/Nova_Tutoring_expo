import React, { useState } from "react";
import { useThemeColors } from "@/providers/ThemeBridge";
import { View, Text, Pressable, Switch } from "react-native";
import {
  awardShopPurchase,
  awardThemeEquipped,
  awardCoinsSpent,
} from "../_lib/hooks/useNovaAchievements";
export default function Shop() {
  const palette = useThemeColors();
  const [legendary, setLegendary] = useState(false);
  async function buy() {
    await awardShopPurchase();
    await awardCoinsSpent(100);
  }
  async function equip() {
    await awardThemeEquipped(legendary);
  }
  return (
    <View
      variant="bg"
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        padding: 16,
        paddingTop: 60,
      }}
    >
      <Text
        tone="text"
        style={{
          color: "#e5e7eb",
          fontSize: 24,
          fontWeight: "800",
          marginBottom: 16,
        }}
      >
        Shop
      </Text>
      <Pressable
        onPress={buy}
        style={{
          backgroundColor: "#6d57ff",
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          Buy Item (100 coins)
        </Text>
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Switch value={legendary} onValueChange={setLegendary} />
        <Text style={{ color: "#cbd5e1" }}>Equip Legendary Theme</Text>
      </View>
      <Pressable
        onPress={equip}
        style={{ backgroundColor: "#22c55e", padding: 12, borderRadius: 10 }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Equip Theme</Text>
      </Pressable>
    </View>
  );
}
