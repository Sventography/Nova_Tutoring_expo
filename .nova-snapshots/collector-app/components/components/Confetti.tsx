import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";

type Props = {
  /** change this (e.g. Date.now()) to trigger a new burst */
  burstKey: number | null;
  /** number of pieces */
  count?: number;
  /** how long each piece lives (ms) */
  durationMs?: number;
  /** start from bottom center (default) */
  from?: "bottom" | "top";
};

const { width: W, height: H } = Dimensions.get("window");
const COLORS = [
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#60a5fa",
  "#fb7185",
];

export function Confetti({
  burstKey,
  count = 60,
  durationMs = 1800,
  from = "bottom",
}: Props) {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const anim = new Animated.Value(0);
      const size = 6 + Math.random() * 8;
      const color = COLORS[i % COLORS.length];
      // random fan spread
      const dir = Math.random() * Math.PI - Math.PI / 2; // -90..+90 deg
      const speed = 180 + Math.random() * 220;
      const vx = Math.cos(dir) * speed;
      const vy = -Math.abs(Math.sin(dir) * speed) - (80 + Math.random() * 120); // initial upward
      const drift = (Math.random() - 0.5) * 120; // side drift

      // start/origin
      const x0 = W / 2;
      const y0 = from === "bottom" ? H - 10 : 10;

      // bezier-ish by blending two points
      const x1 = x0 + vx * 0.6 + drift;
      const y1 = y0 + vy * 0.6 + (from === "bottom" ? -60 : 60);
      const x2 = x0 + vx + drift * 1.4;
      const y2 = y0 + (from === "bottom" ? -H * 0.7 : H * 0.7); // travel far

      const translateX = anim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [x0, x1, x2],
      });
      const translateY = anim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [y0, y1, y2],
      });
      const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          "0deg",
          `${Math.random() > 0.5 ? "" : "-"}${360 + Math.random() * 360}deg`,
        ],
      });
      const opacity = anim.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [1, 1, 0],
      });

      return { anim, size, color, translateX, translateY, rotate, opacity };
    });
  }, [count, from]);

  useEffect(() => {
    if (!burstKey) return;
    const timings = particles.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: durationMs + Math.random() * 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.stagger(8, timings).start();
  }, [burstKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!burstKey) return null;

  return (
    <View variant="bg" pointerEvents="none" style={styles.wrap}>
      {particles.map((p, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.piece,
            {
              backgroundColor: p.color,
              width: p.size,
              height: p.size * (0.6 + Math.random() * 0.9),
              opacity: p.opacity,
              transform: [
                { translateX: p.translateX },
                { translateY: p.translateY },
                { rotate: p.rotate },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  piece: {
    position: "absolute",
    borderRadius: 2,
  },
});
