import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Pt = { x: number; y: number };

type Props = {
  p: Pt;          // current touch point (page coords)
  down: boolean;  // finger down?
};

type Spark = {
  id: string;
  x: number;
  y: number;
  a: Animated.Value; // opacity
  s: Animated.Value; // scale
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/**
 * Mobile star-trail overlay:
 * - pointerEvents none (never steals taps)
 * - emits tiny "sparkles" while finger is down
 * - auto-fades and prunes old sparks
 */
export default function TouchCursorOverlay({ p, down }: Props) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const last = useRef<Pt>({ x: -1, y: -1 });
  const tickRef = useRef<any>(null);

  const shouldEmit = useMemo(() => {
    const dx = p.x - last.current.x;
    const dy = p.y - last.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return down && p.x >= 0 && p.y >= 0 && dist >= 6; // emit every ~6px move
  }, [p, down]);

  useEffect(() => {
    if (!shouldEmit) return;

    last.current = { x: p.x, y: p.y };

    // create spark
    const a = new Animated.Value(1);
    const s = new Animated.Value(1);
    const sp: Spark = { id: uid(), x: p.x, y: p.y, a, s };

    setSparks((prev) => {
      const next = [sp, ...prev];
      return next.slice(0, 24); // cap count
    });

    // animate: slight pop then fade
    Animated.parallel([
      Animated.sequence([
        Animated.timing(s, { toValue: 1.25, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0.75, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(a, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      // prune after done
      setSparks((prev) => prev.filter((x) => x.id !== sp.id));
    });
  }, [shouldEmit, p.x, p.y]);

  // also emit a small "burst" on touch-down
  useEffect(() => {
    if (!down || p.x < 0 || p.y < 0) return;

    // burst: 4 sparks around the finger
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: 10, dy: -6 },
      { dx: -10, dy: 6 },
      { dx: 6, dy: 10 },
    ];

    offsets.forEach((o, k) => {
      const a = new Animated.Value(1);
      const s = new Animated.Value(0.9);
      const sp: Spark = { id: uid() + "_" + k, x: p.x + o.dx, y: p.y + o.dy, a, s };

      setSparks((prev) => [sp, ...prev].slice(0, 24));

      Animated.parallel([
        Animated.timing(s, { toValue: 1.35, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        setSparks((prev) => prev.filter((x) => x.id !== sp.id));
      });
    });
  }, [down]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparks.map((sp) => (
        <Animated.View
          key={sp.id}
          style={[
            S.sparkWrap,
            {
              left: sp.x - 10,
              top: sp.y - 10,
              opacity: sp.a,
              transform: [{ scale: sp.s }],
            },
          ]}
        >
          <Ionicons name="star" size={16} color="#00E5FF" />
        </Animated.View>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  sparkWrap: {
    position: "absolute",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
