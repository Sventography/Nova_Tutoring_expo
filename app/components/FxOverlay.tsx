// app/components/FxOverlay.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing, useWindowDimensions, Platform, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFx } from "../context/FxProvider";

// Try to read theme tokens safely (works even if useTheme throws during early mount)
let useThemeSafe: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useThemeSafe = require("../context/ThemeContext").useTheme;
} catch { /* noop */ }

type DropCfg = { left: number; len: number; thick: number; delay: number; speed: number };

export default function FxOverlay() {
  const { enabled } = useFx();
  const dims = useWindowDimensions();

  // Theme-aware accent (fallback to neon cyan)
  const themeCtx = useThemeSafe ? (() => { try { return useThemeSafe(); } catch { return null; } })() : null;
  const accent: string = themeCtx?.tokens?.accent || "#00e5ff";
  const overlayTint = "rgba(0,229,255,0.06)";

  // Generate a deterministic batch of drops so layout changes don't respawn constantly
  const DROPS = useMemo<DropCfg[]>(() => {
    const count =
      Platform.OS === "web" ? 48 :
      dims.width > 800 ? 40 :
      26;

    const arr: DropCfg[] = [];
    for (let i = 0; i < count; i++) {
      const left = Math.random() * dims.width;
      const len = 18 + Math.random() * 42;       // px length of a streak
      const thick = Math.random() < 0.15 ? 2.5 : 1.5; // occasional thicker streaks
      const delay = Math.random() * 1600;        // stagger starts
      const speed = 1100 + Math.random() * 1600; // ms for a full fall
      arr.push({ left, len, thick, delay, speed });
    }
    return arr;
    // re-generate only if width changes a lot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(dims.width/64)]);

  useEffect(() => {
    if (__DEV__) console.log("[FxOverlay] enabled =", enabled);
  }, [enabled]);

  return (
    <View pointerEvents="none" style={[S.wrap, { opacity: enabled ? 1 : 0 }]}>
      {/* scanline + vignette like before */}
      <LinearGradient
        colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.0)"]}
        start={{x:0,y:0}} end={{x:0,y:1}}
        style={S.scan}
      />
      <LinearGradient
        colors={[`${accent}18`, `${accent}08`, "rgba(0,0,0,0)"]}
        start={{x:0.5,y:0}} end={{x:0.5,y:1}}
        style={S.vignette}
      />
      {/* neon rain */}
      <NeonRain
        width={dims.width}
        height={dims.height}
        drops={DROPS}
        color={accent}
        glowTint={overlayTint}
        enabled={enabled}
      />
      {/* soft vertical sweep */}
      <View style={[S.sweep, { backgroundColor: overlayTint }]} />
    </View>
  );
}

function NeonRain({
  width,
  height,
  drops,
  color,
  glowTint,
  enabled
}: {
  width: number;
  height: number;
  drops: DropCfg[];
  color: string;
  glowTint: string;
  enabled: boolean;
}) {
  // Keep animations running; opacity of the whole overlay is toggled for instant feel
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <RainDrop key={i} cfg={d} h={height} color={color} glowTint={glowTint} paused={!enabled} />
      ))}
    </View>
  );
}

function RainDrop({ cfg, h, color, glowTint, paused }: { cfg: DropCfg; h: number; color: string; glowTint: string; paused: boolean; }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    const loop = () => {
      // restart from slightly above the screen, fall to bottom + a bit
      t.setValue(0);
      const duration = cfg.speed;
      const anim = Animated.timing(t, {
        toValue: 1,
        duration,
        delay: cfg.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (mounted && finished) {
          // small random delay between loops for variety
          cfg.delay = Math.random() * 1000;
          loop();
        }
      });
    };

    // Keep the timeline running, but if paused we just don't render (parent opacity) — smooth resume
    loop();

    return () => {
      mounted = false;
      t.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // y from [-cfg.len, h+cfg.len]
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-cfg.len, h + cfg.len],
  });
  const opacity = t.interpolate({
    inputRange: [0.0, 0.05, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Optionally, vary hue/alpha slightly per streak
  const bodyColor = color;
  const glow = glowTint;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        S.dropWrap,
        {
          transform: [{ translateY }],
          left: cfg.left,
          opacity: paused ? 0 : opacity,
        },
      ]}
    >
      {/* outer glow */}
      <View
        style={{
          position: "absolute",
          top: -cfg.len * 0.15,
          left: -cfg.thick * 2,
          right: -cfg.thick * 2,
          bottom: -cfg.len * 0.15,
          backgroundColor: glow,
          borderRadius: cfg.thick * 3,
          opacity: 0.35,
        }}
      />
      {/* bright core streak */}
      <LinearGradient
        colors={[`${bodyColor}`, `${bodyColor}aa`, `${bodyColor}00`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ width: cfg.thick, height: cfg.len, borderRadius: cfg.thick }}
      />
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 9998 },
  scan: { ...StyleSheet.absoluteFillObject },
  vignette: { ...StyleSheet.absoluteFillObject },
  sweep: { position: "absolute", top: 0, bottom: 0, width: 160 },
  dropWrap: { position: "absolute", top: 0 },
});
