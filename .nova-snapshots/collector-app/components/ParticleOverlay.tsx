import React, { useEffect, useMemo } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";
import { useFx } from "../app/context/FxContext";
import { useTheme } from "../app/context/ThemeContext";

type Kind = "droplets" | "stars" | "petals" | "none";

export default function ParticleOverlay() {
  const { enabled } = useFx();
  const { current } = useTheme();
  const { width, height } = Dimensions.get("window");

  // Density per FX kind (lighter overall)
  const countMap: Record<Kind, number> = {
    droplets: 22,   // light rain
    stars:    18,
    petals:   18,
    none:      0,
  };

  // Duration ranges (faster overall)
  const durRange: Record<Kind, [number, number]> = {
    droplets: [2200, 3400],   // quicker fall
    stars:    [2800, 4200],
    petals:   [3000, 4600],
    none:     [0, 0],
  };

  const count = countMap[current.fx];
  const [dMin, dMax] = durRange[current.fx];

  const items = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      x: Math.random() * width,
      delay: Math.random() * 2500,
      dur: dMin + Math.random() * (dMax - dMin),
      size: 1 + Math.random() * 1.2,   // thinner
      swing: (Math.random() - 0.5) * 24,
      key: `p-${i}`,
    }));
  }, [width, count, dMin, dMax]);

  if (!enabled || current.fx === "none") return null;

  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      {items.map((p) => (
        <Faller key={p.key} {...p} kind={current.fx} height={height} />
      ))}
    </View>
  );
}

function Faller({
  x, delay, dur, size, swing, kind, height,
}: { x: number; delay: number; dur: number; size: number; swing: number; kind: Kind; height: number }) {
  const ty = new Animated.Value(-40);
  const tx = new Animated.Value(x);
  const rot = new Animated.Value(0);

  useEffect(() => {
    const loopY = Animated.loop(
      Animated.sequence([
        Animated.timing(ty, { toValue: height + 40, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -40, duration: 0, useNativeDriver: true }),
      ])
    );
    const loopX = Animated.loop(
      Animated.sequence([
        Animated.timing(tx, { toValue: x + swing, duration: dur / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tx, { toValue: x - swing, duration: dur / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const loopR = Animated.loop(Animated.timing(rot, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }));
    loopY.start(); loopX.start(); loopR.start();
    return () => { loopY.stop(); loopX.stop(); loopR.stop(); };
  }, [delay, dur, height, swing, x, ty, tx, rot]);

  const base = { position: "absolute" as const, transform: [{ translateY: ty }, { translateX: tx }], opacity: 0.9 };

  if (kind === "stars") {
    return <Animated.View style={[base, { width: size + 0.5, height: size + 0.5, borderRadius: 2, backgroundColor: "#e6e6ff", shadowColor: "#e6e6ff", shadowOpacity: 0.6, shadowRadius: 4 }]} />;
  }
  if (kind === "petals") {
    const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
    return <Animated.View style={[base, { width: size * 1.8, height: size * 0.9, borderRadius: size, backgroundColor: "#ffc0cb", transform: [{ translateY: ty }, { translateX: tx }, { rotate: spin }] }]} />;
  }
  // thinner neon droplets
  return <Animated.View style={[base, { width: size, height: size * 6, borderRadius: size, backgroundColor: "#00e5ff", opacity: 0.75 }]} />;
}
