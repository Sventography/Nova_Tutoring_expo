// app/components/AchievementBanner.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { ACHIEVEMENTS } from "../constants/achievements";
import { AchieveEmitter, ACHIEVEMENT_EVENT } from "../context/AchievementsContext";

type BannerState = {
  id: string;
  title: string;
  coins: number;
} | null;

const SHOW_MS = 3200;

export default function AchievementBanner() {
  const { tokens } = useTheme();
  const [state, setState] = useState<BannerState>(null);
  const slide = useRef(new Animated.Value(-80)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = () => {
    if (!state) return;
    Animated.timing(slide, {
      toValue: -80,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setState(null);
    });
  };

  const showFor = (id: string) => {
    const meta = ACHIEVEMENTS[id];
    const coins = meta?.coins ?? 25;
    const title = meta?.title ?? id;

    // reset any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setState({ id, title, coins });
    slide.setValue(-80);
    Animated.timing(slide, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => hide(), SHOW_MS);
  };

  useEffect(() => {
    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (p?: any) => {
      const id =
        p?.id ||
        p?.achievementId ||
        p?.key ||
        (typeof p === "string" ? p : undefined);
      if (!id) return;
      showFor(id);
    });

    // optional: also react to generic "celebrate" messages if you want
    // const sub2 = AchieveEmitter.addListener("celebrate", (_msg?: any) => { ... });

    return () => {
      try {
        sub.remove();
      } catch {}
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return null;

  const topOffset = Platform.select({ ios: 60, android: 40, default: 20 }) ?? 40;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.wrap,
          {
            transform: [{ translateY: slide }],
            top: topOffset,
          },
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={hide}
          accessibilityRole="button"
          accessibilityLabel="Dismiss achievement banner"
        >
          <LinearGradient
            colors={[
              tokens.isDark ? "rgba(0,229,255,0.16)" : "rgba(0,120,200,0.12)",
              tokens.card,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.inner, { borderColor: tokens.accent }]}
          >
            <Ionicons
              name="trophy"
              size={20}
              color={tokens.accent}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.text }]}>
                Achievement unlocked!
              </Text>
              <Text style={[styles.subtitle, { color: tokens.cardText }]}>
                {state.title}
              </Text>
            </View>
            <View style={styles.coinsPill}>
              <Ionicons
                name="sparkles"
                size={14}
                color={tokens.accent}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.coinsText, { color: tokens.text }]}>
                +{state.coins}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  inner: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  coinsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.18)",
    marginLeft: 8,
  },
  coinsText: {
    fontSize: 13,
    fontWeight: "800",
  },
});

