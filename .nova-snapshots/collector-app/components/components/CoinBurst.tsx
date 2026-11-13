import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { on, off, emit } from "@lib/bus";

/** Fire a global coin burst (x,y optional). */
export function fireCoinBurst(payload?: {
  x?: number;
  y?: number;
  amount?: number;
  spread?: number;
  rise?: number;
  durationMs?: number;
}) {
  emit("coins:burst", payload || {});
}

type Particle = {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  char: string;
};

const { width: W, height: H } = Dimensions.get("window");

export default function CoinBurstOverlay() {
  const [parts, setParts] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    const handler = (p?: any) => {
      const amount = Math.max(4, Math.min(40, p?.amount ?? 14));
      const spread = p?.spread ?? 120;
      const rise = p?.rise ?? 220;
      const durationMs = p?.durationMs ?? 900;

      const originX = p?.x ?? W / 2;
      const originY = p?.y ?? H * 0.66;

      const batch: Particle[] = [];
      for (let i = 0; i < amount; i++) {
        const id = Date.now() + i + Math.random();
        const x = new Animated.Value(originX);
        const y = new Animated.Value(originY);
        const scale = new Animated.Value(0.6 + Math.random() * 0.6);
        const opacity = new Animated.Value(1);
        const rotate = new Animated.Value(0);

        const dir = Math.random() < 0.5 ? -1 : 1;
        const dx = Math.random() * spread * dir * (0.6 + Math.random() * 0.6);
        const peak = originY - rise * (0.7 + Math.random() * 0.6);
        const endX = originX + dx;
        const t = durationMs * (0.85 + Math.random() * 0.4);

        Animated.parallel([
          Animated.timing(x, {
            toValue: endX,
            duration: t,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(y, {
            toValue: peak,
            duration: t,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(rotate, {
            toValue: (Math.random() * 2 + 1) * (dir > 0 ? 1 : -1),
            duration: t,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: t,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: scale.__getValue() * 1.15,
              duration: 120,
              useNativeDriver: false,
              easing: Easing.out(Easing.quad),
            }),
            Animated.timing(scale, {
              toValue: scale.__getValue() * 0.95,
              duration: 140,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.quad),
            }),
          ]),
        ]).start();

        batch.push({
          id,
          x,
          y,
          scale,
          opacity,
          rotate,
          char: Platform.select({ ios: "🪙", android: "🪙", default: "🪙" })!,
        });

        setTimeout(
          () => setParts((prev) => prev.filter((pp) => pp.id !== id)),
          t + 60,
        );
      }
      setParts((prev) => [...prev, ...batch]);
    };

    on("coins:burst", handler);
    return () => off("coins:burst", handler);
  }, []);

  return (
    <View variant="bg" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p) => {
        const r = p.rotate.interpolate({
          inputRange: [-3, 3],
          outputRange: ["-540deg", "540deg"],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.coin,
              {
                left: p.x,
                top: p.y,
                opacity: p.opacity,
                transform: [{ scale: p.scale }, { rotate: r }],
              },
            ]}
          >
            <Animated.Text style={styles.coinTxt}>{p.char}</Animated.Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: "absolute",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  coinTxt: { fontSize: 22 },
});
