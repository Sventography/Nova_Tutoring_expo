// app/components/HeaderBar.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  Animated,
  Linking,
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

  // 👉 Read user out of context; this drives name + avatar
  const { user, ready } = useUser();

  useEffect(() => {
    try {
      console.log("[HeaderBar] user from context:", user, "ready:", ready);
    } catch {}
  }, [user, ready]);

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
    pickString(user?.displayName) ||
    pickString(user?.contactEmail?.split("@")[0] || "");

  const rawAvatar = scanForAvatar(user);

  const name: string = rawName || "Nova Student";
  const avatar: string | undefined = rawAvatar || undefined;

  // Streak auto-mark
  useEffect(() => {
    if (loaded && !todayChecked && typeof markToday === "function") {
      markToday();
    }
  }, [loaded, todayChecked, markToday]);

  const goAccount = () => {
    try {
      (router as any).push?.(ACCOUNT_ROUTE);
    } catch {
      (router as any).replace?.(ACCOUNT_ROUTE);
    }
  };

  const openDonate = async () => {
    const url = "https://buymeacoffee.com/sventography";
    try {
      await Linking.openURL(url);
    } catch {}
  };

  const onShare = async () => {
    const url =
      "https://novatutoring-eoq65leh2-contactnovatutoring-8350s-projects.vercel.app";

    try {
      await Share.share({
        title: "Nova Tutoring",
        message: `Check out Nova Tutoring ✨ ${url}`,
        url: Platform.select({
          ios: url,
          android: url,
          default: url,
        }) as string,
      });
    } catch {}
  };

  const streakLabel = !loaded ? "…" : `${count}🔥`;

  // Donate pulse + cyan glow
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulse, glow]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  const hit = 8;
  const iconSize = 18;
  const heartSize = 16;

  return (
    <View style={[S.wrap, { paddingTop: topPad, paddingBottom: 8 }]}>
      {/* Left: avatar + name + coins + streak */}
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
          <Text style={S.coinText}>{Number(coins).toLocaleString()}</Text>
        </View>

        <Pressable onPress={markToday} hitSlop={hit} style={S.streakPill}>
          <Text style={S.streakText}>{streakLabel}</Text>
        </Pressable>
      </Pressable>

      {/* Right: FX + tiny heart donate button */}
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

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={openDonate}
            accessibilityRole="button"
            accessibilityLabel="Donate"
          >
            <View style={{ position: "relative" }}>
              <Animated.View style={[S.donateGlow, { opacity: glowOpacity }]} />
              <LinearGradient
                colors={["#000000", "#001a33"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.donateGrad}
              >
                <Ionicons
                  name="heart"
                  size={heartSize}
                  color="#ff9abf"
                />
              </LinearGradient>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {/* Bottom neon cyan glow bar */}
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

  avatarWrap: { marginRight: 8 },
  avatar: { width: 28, height: 28, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: "#0b2030",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#e8fbff", fontWeight: "800" },

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
  coinImg: { width: 16, height: 16, marginRight: 6 },
  coinText: { color: "#cfeff6", fontWeight: "800" },

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
  streakText: { color: "#ffa500", fontWeight: "800" },

  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
  },

  donateGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.35)",
  },
  donateGlow: {
    position: "absolute",
    left: -4,
    right: -4,
    top: -4,
    bottom: -4,
    borderRadius: 999,
    backgroundColor: "rgba(0,229,255,0.35)",
  },
  bottomGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
});
