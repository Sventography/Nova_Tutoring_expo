import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Platform, Animated, Easing } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

const POOL = 120;
const LIFE_MS = 650;

type P = { x: Animated.Value; y: Animated.Value; o: Animated.Value; s: Animated.Value };

export default function StarTrailOverlay() {
  const idx = useRef(0);
  const pool = useMemo<P[]>(
    () => Array.from({ length: POOL }, () => ({
      x: new Animated.Value(-9999),
      y: new Animated.Value(-9999),
      o: new Animated.Value(0),
      s: new Animated.Value(0.6),
    })),
    []
  );

  const spawn = (x: number, y: number) => {
    const i = idx.current++ % POOL;
    const p = pool[i];
    p.x.setValue(x);
    p.y.setValue(y);
    p.o.setValue(1);
    p.s.setValue(0.6);
    Animated.parallel([
      Animated.timing(p.o, { toValue: 0, duration: LIFE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(p.s, { toValue: 1.15, duration: LIFE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMove = (e: MouseEvent) => spawn(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove as any);
  }, [pool]);

  const handleHandler = (e: any) => {
    const { nativeEvent } = e;
    if (nativeEvent?.state === State.BEGAN || nativeEvent?.state === State.ACTIVE) {
      spawn(nativeEvent.x, nativeEvent.y);
    }
  };

  return (
    <View pointerEvents="box-none" style={S.wrap} pointerEvents="none">
      {(Platform.OS !== "web") ? (
        <PanGestureHandler onGestureEvent={handleHandler as any} onHandlerStateChange={handleHandler as any} minDist={0}>
          <View pointerEvents="auto" style={S.capture} />
        </PanGestureHandler>
      ) : null}
      {pool.map((p, i) => (
        <Animated.View pointerEvents="none"
          key={i}
          style={[
            S.dot,
            {
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { translateX: -3 },
                { translateY: -3 },
                { scale: p.s },
              ],
              opacity: p.o,
            },
          ]}
        />
      ))}
    </View>
  );
}

export const S = StyleSheet.create({
  wrap: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 70 },
  capture: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00e5ff",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
