import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Dimensions, StyleSheet } from "react-native";

const { width, height } = Dimensions.get("window");

export default function ConfettiOverlay({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<number[]>([]);
  const anims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    if (trigger) {
      const count = 40;
      setParticles([...Array(count).keys()]);
      anims.splice(0, anims.length, ...Array.from({ length: count }, () => new Animated.Value(0)));

      anims.forEach((val, i) => {
        Animated.timing(val, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setParticles([]);
    }
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={S.overlay} pointerEvents="none">
      {particles.map((p, i) => {
        const x = Math.random() * width;
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${720 + Math.random() * 720}deg`],
        });
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-50, height + 50],
        });
        const scale = Math.random() * 1.2 + 0.8;
        const color = COLORS[i % COLORS.length];
        return (
          <Animated.View
            key={i}
            style={[
              S.particle,
              {
                backgroundColor: color,
                transform: [{ translateX: x }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const COLORS = ["#0ff", "#f0f", "#ff0", "#0f0", "#f00", "#00f", "#ffa500"];

export const S = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 20,
    borderRadius: 4,
  },
});
