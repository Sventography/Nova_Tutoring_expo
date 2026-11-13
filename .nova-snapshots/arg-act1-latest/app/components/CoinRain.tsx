import React, { useMemo, useEffect } from "react";
import { Dimensions, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const COUNT = 24;

// You can swap this image for your actual coin icon asset
const COIN_ICON = require("../assets/coin.png");

type Coin = { key: string; left: number; size: number; speed: number; delay: number };

function CoinView({ c, clock }: { c: Coin; clock: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const progress = ((clock.value * c.speed + c.delay) % 1 + 1) % 1;
    const ty = -c.size - height + progress * (height * 1.6 + c.size);
    return {
      transform: [{ translateY: ty }],
      left: c.left,
      width: c.size,
      height: c.size,
      opacity: 0.7,
    };
  });
  return <Animated.Image source={COIN_ICON} style={[S.coin, style]} />;
}

export default function CoinRain({ visible }: { visible: boolean }) {
  const clock = useSharedValue(0);
  const coins = useMemo<Coin[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        key: "coin_" + i,
        left: Math.random() * width,
        size: 16 + Math.random() * 22,
        speed: 0.8 + Math.random() * 0.4,
        delay: Math.random(),
      })),
    []
  );

  useEffect(() => {
    if (visible) {
      clock.value = 0;
      clock.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
      const timeout = setTimeout(() => cancelAnimation(clock), 2500);
      return () => clearTimeout(timeout);
    } else {
      cancelAnimation(clock);
      clock.value = 0;
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <>
      {coins.map((c) => (
        <CoinView key={c.key} c={c} clock={clock} />
      ))}
    </>
  );
}

export const S = StyleSheet.create({
  coin: {
    position: "absolute",
    resizeMode: "contain",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
