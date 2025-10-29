import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

type Item = { id: number; message: string; duration: number };
type Listener = (i: Item) => void;

let _id = 0;
const listeners = new Set<Listener>();

export function showToast(message: string, duration = 2000) {
  const item = { id: ++_id, message, duration };
  listeners.forEach((fn) => fn(item));
}

export default function Toast() {
  const [cur, setCur] = useState<Item | null>(null);
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(20)).current;
  const q = useRef<Item[]>([]).current;
  const showing = useRef(false);

  useEffect(() => {
    const l: Listener = (i) => { q.push(i); if (!showing.current) run(); };
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);

  const run = () => {
    if (showing.current) return;
    const n = q.shift();
    if (!n) return;
    showing.current = true;
    setCur(n);
    o.setValue(0);
    y.setValue(20);
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(o, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(y, { toValue: 10, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]).start(() => {
          showing.current = false;
          setCur(null);
          run();
        });
      }, n.duration);
    });
  };

  if (!cur) return null;

  return (
    <View pointerEvents="none" style={styles.c}>
      <Animated.View style={[styles.t, { opacity: o, transform: [{ translateY: y }] }]}>
        <Text style={styles.tx}>{cur.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { position: "absolute", left: 0, right: 0, bottom: 40, alignItems: "center", zIndex: 9999 },
  t: {
    maxWidth: "88%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  tx: { color: "white", fontWeight: "700" },
});
