import React from "react";
import { View, Text, Animated, Easing, Platform, StyleSheet } from "react-native";
import { onToast } from "../utils/toast";

type Item = { key: number; msg: string };

export default function ToastHost() {
  const [items, setItems] = React.useState<Item[]>([]);
  const timers = React.useRef<Map<number, NodeJS.Timeout>>(new Map()).current;

  React.useEffect(() => {
    const off = onToast((t) => {
      setItems((prev) => [...prev, { key: t.id, msg: t.msg }]);
      const to = setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.key !== t.id));
        timers.delete(t.id);
      }, t.duration);
      timers.set(t.id, to);
    });
    return () => {
      off();
      timers.forEach((to) => clearTimeout(to));
      timers.clear();
    };
  }, []);

  return (
    <View pointerEvents="none" style={S.wrap}>
      {items.map((it, idx) => (
        <ToastBubble key={it.key} index={idx} msg={it.msg} />
      ))}
    </View>
  );
}

function ToastBubble({ msg, index }: { msg: string; index: number }) {
  const y = React.useRef(new Animated.Value(-20)).current;
  const op = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const webShadow =
    Platform.OS === "web"
      ? { boxShadow: "0 0 22px rgba(93,242,255,0.9), 0 0 8px rgba(255,255,255,0.25)" }
      : { shadowColor: "#5df2ff", shadowOpacity: 0.95, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 };

  return (
    <Animated.View
      style={[
        S.toast,
        webShadow,
        {
          transform: [{ translateY: y }],
          opacity: op,
          top: 12 + index * 50,
        },
      ]}
    >
      <Text style={S.text}>{msg}</Text>
    </Animated.View>
  );
}

export const S = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100000,          // ⬅️ bigger than anything else
    alignItems: "center",
    // On web make sure nothing clips us:
    ...(Platform.OS === "web" ? ({ pointerEvents: "none" } as any) : null),
  },
  toast: {
    maxWidth: 560,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.6,
    borderColor: "rgba(93,242,255,0.95)",
    backgroundColor: "rgba(0,12,20,0.92)",
  },
  text: { color: "#eafcff", fontWeight: "800", letterSpacing: 0.2 },
});
