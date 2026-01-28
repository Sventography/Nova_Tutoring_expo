// app/overlays/TouchCursorOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

type Pt = { x: number; y: number };

type Props = {
  // Current touch point in screen/page coords
  p: Pt;
  // Is the finger currently down?
  down: boolean;
};

type Spark = {
  id: string;
  x: number;
  y: number;
  a: Animated.Value; // opacity
  s: Animated.Value; // scale
  r: Animated.Value; // rotate
  kind: "glow" | "orb" | "star_trail" | "default";
  size: number;
  color: string;
};

type CursorStyle = {
  kind: Spark["kind"];
  color: string;
  baseSize: number;
  jitter: number;
  spawnEveryPx: number;
  maxSparks: number;
  fadeMs: number;
  // For star_trail only: rainbow palette
  palette?: string[];
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/**
 * Normalize cursor IDs so phone + web + shop all agree.
 * Handles both context ids (glowCursor / orbCursor / starTrailCursor)
 * and shop ids (cursor:glow / cursor:orb / cursor:star_trail).
 */
function canonCursorId(id: string | null | undefined): string {
  if (!id) return "";
  const raw = String(id).trim();

  // Context variants
  if (raw === "glowCursor" || raw === "cursorGlow") return "cursor:glow";
  if (raw === "orbCursor" || raw === "cursorOrb") return "cursor:orb";
  if (raw === "starTrailCursor" || raw === "cursorStarTrail")
    return "cursor:star_trail";

  // Shop-ish variants
  let v = raw;
  if (!v.includes(":") && (v.startsWith("cursor") || v.startsWith("cursor_"))) {
    v = "cursor:" + v.replace(/^cursor[_:]?/, "");
  }
  v = v.replace(/-/g, "_");
  if (v === "cursor:startrail") v = "cursor:star_trail";

  return v;
}

function pickAccent(tokens: any): string {
  return (
    tokens?.accent ??
    tokens?.primary ??
    tokens?.brand ??
    tokens?.glow ??
    tokens?.border ??
    tokens?.text ??
    "#00E5FF"
  );
}

/**
 * Map canonical cursor id -> style behavior.
 * We keep these 3 clearly different:
 * - glow: soft halo ring
 * - orb: bright orb with halo + core
 * - star_trail: RAINBOW sparkle trail (multi-color stars)
 */
function pickStyle(cursorIdRaw: string, tokens: any): CursorStyle {
  const id = canonCursorId(cursorIdRaw);
  const accent = pickAccent(tokens);

  if (id === "cursor:glow") {
    // Subtle neon halo around the touch
    return {
      kind: "glow",
      color: accent,
      baseSize: 24,
      jitter: 6,
      spawnEveryPx: 10,
      maxSparks: 18,
      fadeMs: 520,
    };
  }

  if (id === "cursor:orb") {
    // Premium orb with halo + core
    return {
      kind: "orb",
      color: accent,
      baseSize: 26,
      jitter: 10,
      spawnEveryPx: 12,
      maxSparks: 14,
      fadeMs: 880,
    };
  }

  if (id === "cursor:star_trail") {
    // STAR RAINBOW TRAIL – lots of tiny multi-color stars
    return {
      kind: "star_trail",
      color: accent, // fallback, we’ll override per Spark
      baseSize: 14,
      jitter: 16,
      spawnEveryPx: 5,
      maxSparks: 48,
      fadeMs: 950,
      palette: [
        "#5EE7FF", // aqua
        "#38BDF8", // sky
        "#A855FF", // violet
        "#EC4899", // pink
        "#F97316", // orange
        "#FACC15", // yellow
        "#22C55E", // green
      ],
    };
  }

  // Default: mild star sparkle
  return {
    kind: "default",
    color: accent,
    baseSize: 14,
    jitter: 10,
    spawnEveryPx: 10,
    maxSparks: 20,
    fadeMs: 650,
  };
}

export default function TouchCursorOverlay({ p, down }: Props) {
  const { cursorId } = useCursor();
  const { tokens } = useTheme();

  const style = useMemo(() => pickStyle(cursorId, tokens), [cursorId, tokens]);

  const [sparks, setSparks] = useState<Spark[]>([]);
  const last = useRef<Pt>({ x: -1, y: -1 });

  // Should we emit a new particle based on how far the finger moved?
  const shouldEmit = useMemo(() => {
    const dx = p.x - last.current.x;
    const dy = p.y - last.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return (
      down &&
      p.x >= 0 &&
      p.y >= 0 &&
      dist >= style.spawnEveryPx // tune per style
    );
  }, [p, down, style.spawnEveryPx]);

  const makeSpark = (x: number, y: number): Spark => {
    const a = new Animated.Value(1);
    const s = new Animated.Value(1);
    const r = new Animated.Value(0);

    const size =
      style.baseSize +
      (style.kind === "star_trail" ? Math.floor(Math.random() * 4) : 0);

    // Color: rainbow for star_trail, single accent otherwise
    let color = style.color;
    if (style.kind === "star_trail" && style.palette?.length) {
      const idx = Math.floor(Math.random() * style.palette.length);
      color = style.palette[idx];
    }

    // gentle spin for star trail & default
    if (style.kind === "star_trail" || style.kind === "default") {
      Animated.timing(r, {
        toValue: 1,
        duration: 700 + Math.floor(Math.random() * 300),
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }

    const spark: Spark = {
      id: uid(),
      x,
      y,
      a,
      s,
      r,
      kind: style.kind,
      size,
      color,
    };

    // Run the animation for this spark
    Animated.parallel([
      Animated.sequence([
        Animated.timing(s, {
          toValue: style.kind === "orb" ? 1.35 : 1.15,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(s, {
          toValue: style.kind === "orb" ? 0.9 : 0.8,
          duration: style.kind === "star_trail" ? 700 : 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(a, {
        toValue: 0,
        duration: style.fadeMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Remove spark once it’s done
      setSparks((prev) => prev.filter((x) => x.id !== spark.id));
    });

    return spark;
  };

  // Emit particles as you move
  useEffect(() => {
    if (!shouldEmit) return;

    last.current = { x: p.x, y: p.y };
    const base = makeSpark(p.x, p.y);

    const extras: Spark[] = [];
    if (style.kind === "star_trail") {
      // Small cloud of rainbow stars around the finger
      const j = style.jitter;
      const offsets = [
        { dx: 0, dy: 0 },
        { dx: j * 0.4, dy: -j * 0.2 },
        { dx: -j * 0.5, dy: j * 0.3 },
      ];
      offsets.forEach((o) => {
        extras.push(makeSpark(p.x + o.dx, p.y + o.dy));
      });
    }

    setSparks((prev) =>
      [base, ...extras, ...prev].slice(0, style.maxSparks)
    );
  }, [shouldEmit, p.x, p.y, style.kind, style.jitter, style.maxSparks, style.fadeMs]);

  // Small burst when finger first goes down
  useEffect(() => {
    if (!down || p.x < 0 || p.y < 0) return;

    const j = style.jitter;
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: j * 0.6, dy: -j * 0.4 },
      { dx: -j * 0.6, dy: j * 0.2 },
    ];

    const burst: Spark[] = offsets.map((o) =>
      makeSpark(p.x + o.dx, p.y + o.dy)
    );
    setSparks((prev) => [...burst, ...prev].slice(0, style.maxSparks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [down]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparks.map((sp) => {
        const rotate = sp.r.interpolate({
          inputRange: [0, 1],
          outputRange: ["0rad", `${Math.PI * 1.75}rad`],
        });

        const baseStyle = [
          styles.sparkWrap,
          {
            left: sp.x - sp.size / 2,
            top: sp.y - sp.size / 2,
            opacity: sp.a,
            transform: [{ scale: sp.s }, { rotate }],
          },
        ];

        // Cursor Glow: soft halo ring, no core orb
        if (sp.kind === "glow") {
          return (
            <Animated.View key={sp.id} style={baseStyle}>
              <View
                style={[
                  styles.glowHalo,
                  {
                    borderColor: sp.color,
                    shadowColor: sp.color,
                  },
                ]}
              />
            </Animated.View>
          );
        }

        // Orb Glow: solid orb + halo (matches web orb)
        if (sp.kind === "orb") {
          return (
            <Animated.View key={sp.id} style={baseStyle}>
              <View style={styles.orbWrap}>
                <View
                  style={[
                    styles.orbHalo,
                    {
                      backgroundColor: sp.color,
                      shadowColor: sp.color,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.orbCore,
                    {
                      borderColor: sp.color,
                      shadowColor: sp.color,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        }

        // Star trail + default: little star icon (star_trail uses rainbow colors)
        return (
          <Animated.View key={sp.id} style={baseStyle}>
            <Ionicons name="star" size={sp.size} color={sp.color} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sparkWrap: {
    position: "absolute",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // Glow halo (no solid core)
  glowHalo: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "transparent",
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.9,
  },

  // Orb visuals
  orbWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHalo: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 999,
    opacity: 0.26,
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  orbCore: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
