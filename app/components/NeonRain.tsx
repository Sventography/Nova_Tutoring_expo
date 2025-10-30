import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { useFx } from "../context/FxProvider";

const { width, height } = Dimensions.get("window");
const COLORS = ["#00e5ff", "#cf66ff", "#ff6b6b", "#94d2bd"];

export default function NeonRain() {
  const { enabled } = useFx();
  const drops = Array.from({ length: 12 }).map((_, i) => {
    const y = useRef(new Animated.Value(-Math.random() * height)).current;
    const x = Math.random() * width;
    const color = COLORS[i % COLORS.length];
    const size = Math.random() * 1.5 + 0.5; // thinner drizzle drops

    useEffect(() => {
      if (enabled) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(y, {
              toValue: height,
              duration: 4000 + Math.random() * 2000, // slower drizzle
              useNativeDriver: true,
            }),
            Animated.timing(y, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        y.stopAnimation();
      }
    }, [enabled]);

    return { y, x, color, size, key: i };
  });

  if (!enabled) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {drops.map((d) => (
        <Animated.View
          key={d.key}
          style={{
            position: "absolute",
            top: 0,
            left: d.x,
            width: d.size,
            height: 16,
            backgroundColor: d.color,
            borderRadius: 1,
            transform: [{ translateY: d.y }],
            opacity: 0.75,
          }}
        />
      ))}
    </View>
  );
}
