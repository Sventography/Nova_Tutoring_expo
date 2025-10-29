// app/components/ThemeParticles.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View, Animated, Easing, StyleSheet, Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

type Particle = {
  x: number;
  size: number;
  duration: number;
  delay: number;
  speedY: number;
  opacityMin?: number;
  opacityMax?: number;
};

function useLoopedValue(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [duration, delay, v]);
  return v;
}

function Starfield() {
  // 40 twinkling stars
  const stars: Particle[] = useMemo(() => {
    return new Array(40).fill(0).map(() => ({
      x: Math.random() * W,
      size: Math.random() * 2 + 1,
      duration: 1200 + Math.random() * 1800,
      delay: Math.random() * 2000,
      speedY: 0,
      opacityMin: 0.2,
      opacityMax: 1,
    }));
  }, []);
  return (
    <View variant="bg" style={StyleSheet.absoluteFill}>
      {stars.map((s, i) => {
        const v = useLoopedValue(s.duration, s.delay);
        const opacity = v.interpolate({
          inputRange: [0, 1],
          outputRange: [s.opacityMin ?? 0.2, s.opacityMax ?? 1],
        });
        const top = (i * 97) % H; // distribute vertically
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { left: s.x, top, width: s.size, height: s.size, opacity },
            ]}
          />
        );
      })}
    </View>
  );
}

function Rain() {
  // 35 subtle rain lines
  const drops: Particle[] = useMemo(() => {
    return new Array(35).fill(0).map(() => ({
      x: Math.random() * W,
      size: 1,
      duration: 1500 + Math.random() * 1500,
      delay: Math.random() * 1200,
      speedY: H + Math.random() * (H * 0.4),
    }));
  }, []);
  return (
    <View style={StyleSheet.absoluteFill}>
      {drops.map((d, i) => {
        const v = useLoopedValue(d.duration, d.delay);
        const translateY = v.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, d.speedY],
        });
        const opacity = v.interpolate({
          inputRange: [0, 0.1, 1],
          outputRange: [0, 0.25, 0.25],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.rain,
              {
                left: d.x,
                transform: [{ translateY }, { rotate: "12deg" }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function FairyDust() {
  // 25 sparkles that drift up + fade
  const sparkles: Particle[] = useMemo(() => {
    return new Array(25).fill(0).map(() => ({
      x: Math.random() * W,
      size: Math.random() * 3 + 2,
      duration: 2400 + Math.random() * 2200,
      delay: Math.random() * 2000,
      speedY: -80 - Math.random() * 120,
    }));
  }, []);
  return (
    <View style={StyleSheet.absoluteFill}>
      {sparkles.map((p, i) => {
        const v = useLoopedValue(p.duration, p.delay);
        const translateY = v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.speedY],
        });
        const translateX = v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (Math.random() - 0.5) * 40],
        });
        const opacity = v.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.7, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.sparkle,
              {
                left: p.x,
                bottom: 10,
                width: p.size,
                height: p.size,
                transform: [{ translateY }, { translateX }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function MintLeaves() {
  // 18 floating leaves drifting down and sideways
  const leaves: Particle[] = useMemo(() => {
    return new Array(18).fill(0).map(() => ({
      x: Math.random() * W,
      size: 6 + Math.random() * 8,
      duration: 4000 + Math.random() * 3000,
      delay: Math.random() * 2000,
      speedY: H + Math.random() * (H * 0.3),
    }));
  }, []);
  return (
    <View style={StyleSheet.absoluteFill}>
      {leaves.map((p, i) => {
        const v = useLoopedValue(p.duration, p.delay);
        const translateY = v.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, p.speedY],
        });
        const translateX = v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-30, 30, -30],
        });
        const rotate = v.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        });
        const opacity = v.interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, 0.9, 0.9, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.leaf,
              {
                left: p.x,
                width: p.size * 2,
                height: p.size,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function ThemeParticles() {
  const { themeId } = useContextSafe();

  // Keep draw simple to avoid perf issues; mount only what's needed.
  if (themeId === "theme_galaxy") return <Starfield />;
  if (themeId === "theme_dark") return <Rain />;
  if (themeId === "theme_pink") return <FairyDust />;
  if (themeId === "theme_mint") return <MintLeaves />;
  return null;
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 999,
  },
  rain: {
    position: "absolute",
    width: 1,
    height: 28,
    backgroundColor: "rgba(200, 200, 255, 0.35)",
    borderRadius: 1,
  },
  sparkle: {
    position: "absolute",
    backgroundColor: "rgba(255, 200, 245, 0.9)",
    borderRadius: 50,
    shadowColor: "#ffd1f5",
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  leaf: {
    position: "absolute",
    backgroundColor: "#77ffcc",
    borderRadius: 10,
  },
});
