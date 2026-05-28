// app/components/HeaderBar.tsx

import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import { useStreak } from "../context/StreakContext";
import { useFx } from "../context/FxProvider";

const COIN_IMG = require("../assets/coin.png");
const ACCOUNT_ROUTE = "/(tabs)/account";

export default function HeaderBar() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 12 : (insets?.top ?? 0) + 6;

  const router = useRouter();

  const { enabled: fxOn, toggle: toggleFx } = useFx();
  const { coins = 0 } = (useCoins() || {}) as any;
  const { loaded, count, todayChecked, markToday } =
    (useStreak() || {}) as any;

  const userCtx = useUser() as any;
  const { user, ready, supabaseUserId, session } = userCtx || {};

  const isLoggedIn = !!supabaseUserId || !!session || !!user;
  const displayCoins = isLoggedIn ? coins : 0;

  useEffect(() => {
    try {
      console.log(
        "[HeaderBar] user from context:",
        user,
        "ready:",
        ready,
        "isLoggedIn:",
        isLoggedIn
      );
    } catch {}
  }, [user, ready, isLoggedIn]);

  const pickString = (v: any) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

  const scanForAvatar = (obj: any) => {
    if (!obj || typeof obj !== "object") return null;

    const preferred = [
      "avatarUri",
      "avatarUrl",
      "avatar",
      "photoURL",
      "photoUrl",
      "imageUrl",
      "imageURL",
    ];

    for (const k of preferred) {
      const v = pickString((obj as any)[k]);
      if (v) return v;
    }

    return null;
  };

  const rawName =
    pickString(user?.username) ||
    pickString(user?.name) ||
    pickString(user?.contactEmail?.split("@")[0] || "");

  const rawAvatar = scanForAvatar(user);

  const name: string = rawName || "Nova Student";
  const avatar: string | undefined = rawAvatar || undefined;

  useEffect(() => {
    if (
      loaded &&
      isLoggedIn &&
      !todayChecked &&
      typeof markToday === "function"
    ) {
      markToday();
    }
  }, [loaded, todayChecked, markToday, isLoggedIn]);

  const goAccount = () => {
    try {
      (router as any).push?.(ACCOUNT_ROUTE);
    } catch {
      (router as any).replace?.(ACCOUNT_ROUTE);
    }
  };

  const streakLabel = !loaded ? "…" : `${count}🔥`;

  const hit = 8;
  const iconSize = 18;

  return (
    <View style={[S.wrap, { paddingTop: topPad, paddingBottom: 8 }]}>
      <Pressable
        onPress={goAccount}
        hitSlop={hit}
        style={S.left}
        accessibilityRole="button"
        accessibilityLabel="Open Account"
      >
        <View style={S.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={S.avatar} />
          ) : (
            <View style={[S.avatar, S.avatarFallback]}>
              <Text style={S.initial}>{name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={S.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={S.coinPill}>
          <Image source={COIN_IMG} style={S.coinImg} resizeMode="contain" />
          <Text style={S.coinText}>
            {Number(displayCoins).toLocaleString()}
          </Text>
        </View>

        {isLoggedIn && (
          <Pressable onPress={markToday} hitSlop={hit} style={S.streakPill}>
            <Text style={S.streakText}>{streakLabel}</Text>
          </Pressable>
        )}
      </Pressable>

      <View style={S.right}>
        <Pressable
          onPress={() => {
            console.log("FX clicked from HeaderBar");
            toggleFx();
          }}
          hitSlop={hit}
          style={S.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Toggle FX"
        >
          <Ionicons
            name={fxOn ? "sparkles" : "sparkles-outline"}
            size={iconSize}
            color={fxOn ? "#5cfcc8" : "#8ecae6"}
          />
        </Pressable>
      </View>

      <LinearGradient
        colors={[
          "rgba(0,229,255,0)",
          "rgba(0,229,255,0.8)",
          "rgba(0,229,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={S.bottomGlow}
      />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: "#06121a",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
    gap: 6,
  },
  right: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    marginRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: "#0b2030",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#e8fbff",
    fontWeight: "800",
  },
  name: {
    color: "#e8fbff",
    fontWeight: "800",
    marginRight: 6,
    maxWidth: 160,
  },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#0b2030",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.3)",
  },
  coinImg: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  coinText: {
    color: "#cfeff6",
    fontWeight: "800",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,165,0,0.3)",
    backgroundColor: "rgba(255,165,0,0.08)",
    marginLeft: 6,
  },
  streakText: {
    color: "#ffa500",
    fontWeight: "800",
  },
  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
  },
  bottomGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
});