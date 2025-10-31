import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

let useThemeSafe: any = null;
try { useThemeSafe = require("../context/ThemeContext").useTheme; } catch {}

/** Map your theme ids -> tasteful gradients (no heavy glaze) */
function colorsFor(themeId: string, accent?: string): string[] {
  const a = accent || "#00e5ff";
  if (/starry/i.test(themeId))
    return ["#0a0f2d", "#0b1645", "#0f225f"];
  if (/pink|rose|blush/i.test(themeId))
    return ["#2b0a1d", "#3b0f2b", "#5d1844"];
  if (/silver|frost|ice|snow/i.test(themeId))
    return ["#0a0f12", "#0e1820", "#0f1f2a"];
  if (/black.?gold/i.test(themeId))
    return ["#0a0a0a", "#101010", "#17130a"];
  if (/mint|emerald|teal/i.test(themeId))
    return ["#061613", "#09211c", "#0b2b24"];
  // default / neon
  return ["#030a0d", "#06131a", "#0a1e28"];
}

/** Subtle angle for a bit of life */
const START = { x: 0.1, y: 0.0 };
const END   = { x: 1.0, y: 1.0 };

export default function ThemeOverlay() {
  const useTheme = useThemeSafe || (() => ({ id: "default", tokens: { accent: "#00e5ff" } }));
  const { id: themeId = "default", tokens = {} } = useTheme() || {};
  const accent = tokens?.accent as string | undefined;

  // double-buffer + crossfade
  const [prevId, setPrevId] = useState(themeId);
  const [currId, setCurrId] = useState(themeId);
  const fade = useRef(new Animated.Value(1)).current; // 1 = show current layer

  useEffect(() => {
    if (themeId === currId) return;
    // move current -> prev, new theme becomes current, then crossfade
    setPrevId(currId);
    setCurrId(themeId);
    fade.setValue(0); // show prev fully, curr hidden
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [themeId]);

  const prevColors = useMemo(() => colorsFor(prevId, accent), [prevId, accent]);
  const currColors = useMemo(() => colorsFor(currId, accent), [currId, accent]);

  return (
    <View pointerEvents="none" style={S.wrap}>
      {/* previous frame (fades out) */}
      <Animated.View style={[S.layer, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <LinearGradient colors={prevColors} start={START} end={END} style={S.fill} />
      </Animated.View>
      {/* current frame (fades in) */}
      <Animated.View style={[S.layer, { opacity: fade }]}>
        <LinearGradient colors={currColors} start={START} end={END} style={S.fill} />
      </Animated.View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 0, // keep under content and FxOverlay
  },
  layer: { ...StyleSheet.absoluteFillObject },
  fill: { ...StyleSheet.absoluteFillObject },
});
