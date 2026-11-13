import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import DonateButton from "./DonateButton";
import { useUser } from "../context/UserContext";
import { useCoins } from "../context/CoinsContext";

const ACCOUNT_ROUTE = "/tabs/account"; // change to "/(tabs)/account" if your tabs group is "(tabs)"

export default function HeaderBar() {
  const router = useRouter();
  const { user } = (useUser() || {}) as any;
  const { coins = 0 } = (useCoins() || {}) as any;

  const name: string = user?.name ?? "Nova Student";
  const avatar: string | undefined = user?.avatar;

  // Try to load coin image from assets; fall back to an icon if missing
  let coinImg: any = null;
  try {
    // Adjust the path if your image lives elsewhere
    coinImg = require("../../assets/coin.png");
  } catch {
    coinImg = null;
  }

  const goAccount = () => {
    // If there's no back stack, push/replace still lands you on the Account tab.
    try {
      (router as any).push?.(ACCOUNT_ROUTE);
    } catch {
      (router as any).replace?.(ACCOUNT_ROUTE);
    }
  };

  return (
    <View style={S.wrap}>
      {/* Left cluster (press to open Account tab) */}
      <Pressable onPress={goAccount} hitSlop={8} style={S.left} accessibilityRole="button" accessibilityLabel="Open Account">
        <View style={S.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={S.avatar} />
          ) : (
            <View style={[S.avatar, S.avatarFallback]}>
              <Text style={S.initial}>{name.slice(0, 1)}</Text>
            </View>
          )}
        </View>

        <Text style={S.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={S.coinPill}>
          {coinImg ? (
            <Image source={coinImg} style={S.coinImg} resizeMode="contain" />
          ) : (
            <Ionicons name="sparkles" size={14} color="#00e5ff" style={{ marginRight: 6 }} />
          )}
          <Text style={S.coinText}>{Number(coins).toLocaleString()}</Text>
        </View>
      </Pressable>

      {/* Right side */}
      <View style={S.right}>
        <DonateButton size="sm" label="Donate" />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#06121a",
  },
  left: { flexDirection: "row", alignItems: "center", flexShrink: 1, flexGrow: 1 },
  right: { marginLeft: "auto" },

  avatarWrap: { marginRight: 8 },
  avatar: { width: 28, height: 28, borderRadius: 20 },
  avatarFallback: { backgroundColor: "#0b2030", alignItems: "center", justifyContent: "center" },
  initial: { color: "#e8fbff", fontWeight: "800" },

  name: { color: "#e8fbff", fontWeight: "800", marginRight: 8, maxWidth: 160 },

  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0b2030",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.3)",
  },
  coinImg: { width: 14, height: 14, marginRight: 6 },
  coinText: { color: "#cfeff6", fontWeight: "800" },
});
