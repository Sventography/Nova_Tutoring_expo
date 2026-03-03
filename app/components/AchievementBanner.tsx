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
  const slide = useRef(new Animated.Value(80)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = () => {
    if (!state) return;
    Animated.timing(slide, {
      toValue: 80,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setState(null);
    });
  };

  const showFor = (id: string) => {
    const meta = ACHIEVEMENTS[id];
    const coins = meta?.coins ?? 25;
    const title = meta?.title ?? id;

    if (timerRef.current) clearTimeout(timerRef.current);

    setState({ id, title, coins });
    slide.setValue(80);
    Animated.timing(slide, {
      toValue: 0,
      duration: 260,
      useNativeDriver: false,
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

    return () => {
      try {
        sub.remove();
      } catch {}
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return null;

  const bottomOffset =
    Platform.OS === "ios" ? 96 : 84;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.wrap,
          {
            transform: [{ translateY: slide }],
            bottom: bottomOffset,
          },
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={hide}
          accessibilityRole="button"
          accessibilityLabel="Dismiss achievement banner"
        >
          <View style={styles.glow} />
          <LinearGradient
            colors={[
              "rgba(0,229,255,0.25)",
              tokens.card,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.inner, { borderColor: "#00e5ff" }]}
          >
            <Ionicons
              name="trophy"
              size={20}
              color="#00e5ff"
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
                color="#00e5ff"
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.coinsText, { color: "#ffffff" }]}>
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
  glow: {
    position: "absolute",
    left: 4,
    right: 4,
    top: -4,
    bottom: 4,
    borderRadius: 18,
    backgroundColor: "rgba(0,229,255,0.22)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  inner: {
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 10, 20, 0.96)",
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
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.24)",
    marginLeft: 8,
  },
  coinsText: {
    fontSize: 13,
    fontWeight: "800",
  },
});