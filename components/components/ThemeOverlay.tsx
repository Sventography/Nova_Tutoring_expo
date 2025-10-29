import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width: W, height: H } = Dimensions.get("window");

type Effect =
  | "rain"
  | "sparkle"
  | "leaf"
  | "star"
  | "glitter"
  | "ember"
  | "bubble"
  | "snow"
  | "spark"
  | "gold";

function pickEffect(themeId: string): Effect {
  if (themeId === "dark_theme") return "rain";
  if (themeId === "pink_theme") return "sparkle";
  if (themeId === "mint_theme") return "leaf";
  if (themeId === "star_theme") return "star";
  if (themeId === "glitter_theme") return "glitter";
  if (themeId === "theme_crimson_dream") return "ember";
  if (themeId === "theme_emerald_wave") return "bubble";
  if (themeId === "theme_neon_purple" || themeId === "neon_theme")
    return "spark";
  if (themeId === "theme_silver_frost") return "snow";
  if (themeId === "theme_black_gold") return "gold";
  return "sparkle";
}

function colorFor(effect: Effect, accent: string): string {
  if (effect === "rain") return "rgba(200,200,200,0.5)";
  if (effect === "sparkle") return "rgba(255,255,255,0.8)";
  if (effect === "leaf") return "rgba(0,120,90,0.8)";
  if (effect === "star") return "rgba(255,215,0,0.9)";
  if (effect === "glitter") return "rgba(255,255,255,0.85)";
  if (effect === "ember") return "rgba(255,120,80,0.9)";
  if (effect === "bubble") return "rgba(180,255,230,0.8)";
  if (effect === "snow") return "rgba(240,250,255,0.95)";
  if (effect === "spark") return "rgba(255,0,255,0.8)";
  if (effect === "gold") return "rgba(255,215,0,0.9)";
  return accent;
}

function sizeFor(effect: Effect): { min: number; max: number } {
  if (effect === "rain") return { min: 2, max: 3 };
  if (effect === "sparkle") return { min: 2, max: 4 };
  if (effect === "leaf") return { min: 4, max: 8 };
  if (effect === "star") return { min: 2, max: 3 };
  if (effect === "glitter") return { min: 2, max: 3 };
  if (effect === "ember") return { min: 2, max: 4 };
  if (effect === "bubble") return { min: 4, max: 10 };
  if (effect === "snow") return { min: 3, max: 6 };
  if (effect === "spark") return { min: 2, max: 4 };
  if (effect === "gold") return { min: 2, max: 4 };
  return { min: 2, max: 4 };
}

function countFor(effect: Effect): number {
  if (effect === "rain") return 50;
  if (effect === "snow") return 40;
  if (effect === "leaf") return 22;
  if (effect === "bubble") return 24;
  if (effect === "star") return 30;
  if (effect === "glitter") return 36;
  if (effect === "ember") return 28;
  if (effect === "spark") return 34;
  if (effect === "gold") return 26;
  if (effect === "sparkle") return 32;
  return 28;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function Particle({ effect, color }: { effect: Effect; color: string }) {
  const x = useRef(new Animated.Value(rand(0, W))).current;
  const y = useRef(new Animated.Value(rand(-H, 0))).current;
  const r = useRef(new Animated.Value(rand(0, 1))).current;
  const s = sizeFor(effect);
  const size = rand(s.min, s.max);
  const rot = r.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const duration =
    effect === "rain"
      ? rand(1800, 2600)
      : effect === "snow"
        ? rand(4200, 7000)
        : effect === "leaf"
          ? rand(3800, 5600)
          : effect === "bubble"
            ? rand(3800, 5600)
            : rand(2600, 4200);
  const horizontal =
    effect === "rain" ? 0 : effect === "bubble" ? rand(-20, 20) : rand(-30, 30);
  const start = () => {
    x.setValue(rand(0, W));
    y.setValue(effect === "bubble" ? H + 10 : -10);
    r.setValue(rand(0, 1));
    Animated.parallel([
      Animated.timing(y, {
        toValue: effect === "bubble" ? -20 : H + 20,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(x, {
        toValue: Math.min(W, Math.max(0, (x as any)._value + horizontal)),
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(r, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(() => start());
  };
  useEffect(() => {
    start();
  }, []);
  const baseStyle =
    effect === "leaf"
      ? { width: size * 2, height: size, borderRadius: size / 2 }
      : effect === "rain"
        ? { width: size, height: size * 8, borderRadius: size / 2 }
        : effect === "star" ||
            effect === "spark" ||
            effect === "glitter" ||
            effect === "gold" ||
            effect === "sparkle"
          ? { width: size, height: size, borderRadius: size / 2 }
          : effect === "ember"
            ? { width: size + 1, height: size + 1, borderRadius: size / 2 }
            : { width: size * 1.2, height: size * 1.2, borderRadius: size };
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        transform: [{ translateX: x }, { translateY: y }, { rotate: rot }],
        backgroundColor: color,
        opacity: effect === "glitter" || effect === "sparkle" ? 0.9 : 1,
        ...baseStyle,
      }}
    />
  );
}

export default function ThemeOverlay() {
  const { id, accent } = useTheme();
  const effect = useMemo(() => pickEffect(id), [id]);
  const color = useMemo(() => colorFor(effect, accent), [effect, accent]);
  const count = useMemo(() => countFor(effect), [effect]);
  const nodes = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => (
        <Particle key={i} effect={effect} color={color} />
      )),
    [count, effect, color],
  );
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
    >
      {nodes}
    </View>
  );
}
