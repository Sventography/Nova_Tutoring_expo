import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, PanResponder, Platform, Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TrailKind = "star" | "sparkle" | "heart" | "dot";

type Particle = {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  s: Animated.Value;
  o: Animated.Value;
  r: Animated.Value;
};

const STORAGE_KEY = "cursor.equipped.v1";
const MAX = 24;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

export default function TouchTrailOverlay() {
  // Only show on native. Web already has real cursor support.
  if (Platform.OS === "web") return null;

  const particlesRef = useRef<Particle[]>([]);
  const kindRef = useRef<TrailKind>("star");

  // preload particles
  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: MAX }).map((_, i) => ({
      id: `p_${i}`,
      x: new Animated.Value(-9999),
      y: new Animated.Value(-9999),
      s: new Animated.Value(0.5),
      o: new Animated.Value(0),
      r: new Animated.Value(0),
    }));
  }

  const idxRef = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;
        if (v) kindRef.current = (v as TrailKind) || "star";
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      burst(pageX, pageY);
    },
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      burst(pageX, pageY);
    },
  }), []);

  function burst(x: number, y: number) {
    const p = particlesRef.current[idxRef.current % MAX];
    idxRef.current += 1;

    p.x.setValue(x - 8 + rand(-3, 3));
    p.y.setValue(y - 8 + rand(-3, 3));
    p.s.setValue(rand(0.6, 1.2));
    p.o.setValue(1);
    p.r.setValue(rand(-0.8, 0.8));

    Animated.parallel([
      Animated.timing(p.o, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(p.s, { toValue: 0.1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(p.r, { toValue: rand(-2.0, 2.0), duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start();
  }

  const kind = kindRef.current;

  return (
    <View pointerEvents="box-none" style={styles.root} {...pan.panHandlers}>
      {particlesRef.current.map((p) => {
        const style = {
          transform: [
            { translateX: p.x },
            { translateY: p.y },
            { scale: p.s },
            { rotate: p.r.interpolate({ inputRange: [-3, 3], outputRange: ["-171deg", "171deg"] }) },
          ],
          opacity: p.o,
        } as any;

        return (
          <Animated.View key={p.id} pointerEvents="none" style={[styles.p, style]}>
            <View style={[styles.shape, shapeStyle(kind)]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function shapeStyle(kind: TrailKind) {
  switch (kind) {
    case "heart":
      return { borderRadius: 6, transform: [{ rotate: "45deg" }], width: 10, height: 10 };
    case "sparkle":
      return { borderRadius: 3, width: 9, height: 9 };
    case "dot":
      return { borderRadius: 99, width: 7, height: 7 };
    case "star":
    default:
      return { borderRadius: 2, width: 10, height: 10 };
  }
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9997,
  },
  p: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  shape: {
    backgroundColor: "white",
  },
});
