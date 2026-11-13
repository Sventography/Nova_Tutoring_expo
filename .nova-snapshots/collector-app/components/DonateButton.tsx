import React, { useEffect, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Animated, Platform, ViewStyle, TextStyle } from "react-native";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";

type Size = "sm" | "md" | "lg";

function metrics(size: Size) {
  switch (size) {
    case "sm": return { pv: 6, ph: 12, fs: 14, minw: 96, glow: 8, sheenW: 120 };
    case "lg": return { pv: 14, ph: 24, fs: 18, minw: 160, glow: 14, sheenW: 200 };
    case "md":
    default:   return { pv: 12, ph: 22, fs: 16, minw: 140, glow: 12, sheenW: 160 };
  }
}

export default function DonateButton({
  label = "Donate",
  href = "https://buymeacoffee.com/sventography",
  size = "md",
  style,
  textStyle
}: {
  label?: string;
  href?: string;
  size?: Size;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const sc = useRef(new Animated.Value(1)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const m = metrics(size);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sc, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1.00, duration: 1200, useNativeDriver: true })
      ])
    ).start();
  }, [sc]);

  useEffect(() => {
    const run = () => {
      sheen.setValue(0);
      Animated.timing(sheen, { toValue: 1, duration: 2600, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setTimeout(run, 800);
      });
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-m.sheenW/1.6, m.sheenW/1.6] });

  return (
    <Animated.View style={[{ transform: [{ scale: sc }] }, style]}>
      <Pressable
        onPress={() => Linking.openURL(href)}
        accessibilityRole="button"
        accessibilityLabel={`${label} – opens Buy Me A Coffee`}
        style={({ pressed }) => [S.pressable, pressed && S.pressed]}
      >
        <LinearGradient
          colors={["#00e5ff", "#7ad7ff", "#000000"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[S.gradient, { paddingVertical: m.pv, paddingHorizontal: m.ph, minWidth: m.minw }]}
        >
          <Animated.View style={[S.sheen, { width: m.sheenW, opacity: Platform.select({ web: 0.25, default: 0.35 }), transform: [{ translateX }] }]}>
            <LinearGradient colors={["transparent", "rgba(255,255,255,0.22)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={S.sheenFill} />
          </Animated.View>
          <Text style={[S.label, { fontSize: m.fs }, textStyle]}> {label} </Text>
        </LinearGradient>
        <View pointerEvents="none" style={[S.glow, { shadowRadius: m.glow }]} />
      </Pressable>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  pressable: { borderRadius: 999, overflow: "visible" },
  pressed: { transform: [{ scale: 0.98 }] },
  gradient: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  label: { color: "#06121a", fontWeight: "800", letterSpacing: 0.4 },
  sheen: { position: "absolute", left: "50%", top: 0, bottom: 0 },
  sheenFill: { flex: 1 },
  glow: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    borderRadius: 999, shadowColor: "#00e5ff", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45,
    // Android approx:
    elevation: 4,
  },
});
