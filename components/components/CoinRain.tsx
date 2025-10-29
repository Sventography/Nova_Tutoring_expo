import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Animated, Dimensions, StyleSheet } from "react-native";

type Drop = {
  id: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
};

export default function CoinRain({
  visible,
  onEnd,
}: {
  visible: boolean;
  onEnd?: () => void;
}) {
  const { width, height } = Dimensions.get("window");
  const drops = useMemo<Drop[]>(() => {
    const arr: Drop[] = [];
    const n = 28;
    for (let i = 0; i < n; i++) {
      arr.push({
        id: String(i),
        x: Math.random() * width,
        delay: Math.floor(Math.random() * 400),
        duration: 1200 + Math.floor(Math.random() * 800),
        size: 18 + Math.floor(Math.random() * 18),
        rotate: (Math.random() * 2 - 1) * 120,
      });
    }
    return arr;
  }, [width]);
  const anims = useRef(drops.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) return;
    const seq = drops.map((d, i) =>
      Animated.timing(anims[i], {
        toValue: 1,
        duration: d.duration,
        delay: d.delay,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(40, seq).start(({ finished }) => {
      if (finished && onEnd) onEnd();
      anims.forEach((a) => a.setValue(0));
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((d, i) => {
        const t = anims[i];
        const translateY = t.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height * 0.9],
        });
        const rotate = t.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", d.rotate + "deg"],
        });
        const opacity = t.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [0, 1, 0],
        });
        return (
          <Animated.View
            key={d.id}
            style={{
              position: "absolute",
              left: d.x,
              transform: [{ translateY }, { rotate }],
              opacity,
            }}
          >
            <Text style={{ fontSize: d.size }}>🪙</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
