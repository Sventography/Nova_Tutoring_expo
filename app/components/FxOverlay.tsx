import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing, useWindowDimensions, Platform, Text } from "react-native";
import { useFx } from "../context/FxProvider";

// safe theme access
let useThemeSafe: any = null;
try { useThemeSafe = require("../context/ThemeContext").useTheme; } catch {}

type DropCfg = { left: number; size: number; speed: number; delay: number; rot?: number };

export default function FxOverlay() {
  const { enabled } = useFx();
  const dims = useWindowDimensions();

  const themeCtx = useThemeSafe ? (() => { try { return useThemeSafe(); } catch { return null; } })() : null;
  const themeId: string = themeCtx?.id || themeCtx?.themeId || "";
  const tokens = themeCtx?.tokens || {};
  const accent = tokens.accent || "#00e5ff";

  // map theme → effect mode
  const mode: "neon"|"stars"|"petals"|"snow"|"sparks"|"bubbles" =
    /starry/i.test(themeId) ? "stars" :
    /pink/i.test(themeId) ? "petals" :
    /silver|frost/i.test(themeId) ? "snow" :
    /black.?gold/i.test(themeId) ? "sparks" :
    /mint|emerald/i.test(themeId) ? "bubbles" :
    "neon";

  const color =
    mode === "sparks" ? "#ffcc55" :
    mode === "snow"   ? "#e7f6ff" :
    mode === "petals" ? (tokens.accent || "#ff6fb6") :
    mode === "bubbles"? (tokens.accent || "#7ce8d5") :
    mode === "stars"  ? (tokens.accent || "#a2c8ff") :
    accent;

  // generate particles
  const DROPS = useMemo<DropCfg[]>(() => {
    const base =
      Platform.OS === "web" ? 48 :
      dims.width > 800 ? 40 : 28;

    const arr: DropCfg[] = [];
    for (let i = 0; i < base; i++) {
      const left = Math.random() * dims.width;
      const size = 10 + Math.random() * 24;
      const speed = 1100 + Math.random() * 1800;
      const delay = Math.random() * 1200;
      const rot = Math.random() * 360;
      arr.push({ left, size, speed, delay, rot });
    }
    return arr;
    // only regenerate when width bucket changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(dims.width/64)]);

  useEffect(() => {
    if (__DEV__) console.log("[FxOverlay] enabled =", enabled, "mode =", mode);
  }, [enabled, mode]);

  return (
    <View pointerEvents="none" style={[S.wrap, { opacity: enabled ? 1 : 0 }]}>
      {/* NOTE: removed heavy vignette/scan; this is a clean, crisp overlay */}
      <EffectField width={dims.width} height={dims.height} drops={DROPS} color={color} mode={mode} />
    </View>
  );
}

function EffectField({
  width, height, drops, color, mode
}: {
  width: number; height: number; drops: DropCfg[]; color: string;
  mode: "neon"|"stars"|"petals"|"snow"|"sparks"|"bubbles";
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <Faller key={i} cfg={d} h={height} color={color} mode={mode} />
      ))}
    </View>
  );
}

function Faller({ cfg, h, color, mode }: {
  cfg: DropCfg; h: number; color: string;
  mode: "neon"|"stars"|"petals"|"snow"|"sparks"|"bubbles";
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    const loop = () => {
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1,
        duration: cfg.speed,
        delay: cfg.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted && finished) { cfg.delay = Math.random() * 900; loop(); }
      });
    };
    loop();
    return () => { mounted = false; t.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = t.interpolate({ inputRange:[0,1], outputRange:[-cfg.size, h + cfg.size] });
  const opacity    = t.interpolate({ inputRange:[0.0, 0.05, 0.9, 1], outputRange:[0, 1, 1, 0] });

  // shape per mode
  if (mode === "neon") {
    // sleek neon streak
    return (
      <Animated.View pointerEvents="none" style={[
        S.item, { left: cfg.left, opacity, transform:[{ translateY }] }
      ]}>
        <View style={{ width: 2, height: cfg.size + 18, borderRadius: 2, backgroundColor: color, shadowColor: color, shadowOpacity: 0.45, shadowRadius: 8 }} />
      </Animated.View>
    );
  }

  if (mode === "stars") {
    return (
      <Animated.View pointerEvents="none" style={[
        S.item, { left: cfg.left, opacity, transform:[{ translateY }, { rotate: (cfg.rot||0) + 'deg' }] }
      ]}>
        <Text style={{ color, fontSize: 12 + cfg.size * 0.25, textShadowColor: color, textShadowRadius: 6 }}>✦</Text>
      </Animated.View>
    );
  }

  if (mode === "petals") {
    return (
      <Animated.View pointerEvents="none" style={[
        S.item, { left: cfg.left, opacity, transform:[{ translateY }, { rotate: (cfg.rot||0) + 'deg' }] }
      ]}>
        <Text style={{ color, fontSize: 10 + cfg.size * 0.22 }}>❀</Text>
      </Animated.View>
    );
  }

  if (mode === "snow") {
    return (
      <Animated.View pointerEvents="none" style={[
        S.item, { left: cfg.left, opacity, transform:[{ translateY }] }
      ]}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
      </Animated.View>
    );
  }

  if (mode === "bubbles") {
    return (
      <Animated.View pointerEvents="none" style={[
        S.item, { left: cfg.left, opacity, transform:[{ translateY }] }
      ]}>
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: color, backgroundColor: "transparent" }} />
      </Animated.View>
    );
  }

  // sparks (gold)
  return (
    <Animated.View pointerEvents="none" style={[
      S.item, { left: cfg.left, opacity, transform:[{ translateY }, { rotate: (cfg.rot||0) + 'deg' }] }
    ]}>
      <Text style={{ color, fontSize: 10 + cfg.size * 0.2 }}>✧</Text>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrap: { position:"absolute", left:0, right:0, top:0, bottom:0, zIndex: 9998 },
  item: { position:"absolute", top:0 },
});
