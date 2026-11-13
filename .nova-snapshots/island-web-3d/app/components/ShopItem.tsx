import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import GlowCard from "@/components/GlowCard";
import type { TShopItem } from "@/constants/shopData";

export default function ShopItem({ item, onPress }: { item: TShopItem; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <GlowCard style={styles.card}>
        <Image source={item.image} style={styles.img} resizeMode="contain" />
        <Text style={styles.name}>{item.displayName}</Text>
        <Text style={styles.price}>
          {item.priceCoins ? `${item.priceCoins.toLocaleString()} coins` : `$${item.usd?.toFixed(2)}`}
        </Text>
      </GlowCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 8 },
  img: { width: 96, height: 96 },
  name: { color: "#cfe8ef", fontWeight: "800", textAlign: "center" },
  price: { color: "#9dd6e0", fontWeight: "700" },
});
