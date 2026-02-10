// app/overlays/TouchCursorOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

export type Pt = { x: number; y: number };

type Props = {
  p?: Pt | null; // current touch point (page coords)
  down?: boolean; // finger down?
};

type SparkKind = "none" | "glow" | "orb" | "star_trail";

type Spark = {
  id: string;
  x: number;
  y: number;
  a: Animated.Value; // opacity
  s: Animated.Value; // scale
  r: Animated.Value; // rotate
  kind: SparkKind;
  icon?: any;
  size: number;
  color: string;
  halo?: boolean; // orb special
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/** Canonicalize to the same ids Shop / CursorContext use. */
function canonCursorId(id: string | null | undefined): string {
  if (!id) return "";
  let v = String(id).trim().toLowerCase();
  v = v.replace(/\s+/g, "");
  v = v.replace(/-/g, "_");

  // allow "..._cursor"
  v = v.replace(/_cursor$/, "");

  if (v.startsWith("cursor_")) v = "cursor:" + v.slice("cursor_".length);
  if (!v.startsWith("cursor:")) v = "cursor:" + v;

  if (v === "cursor:startrail") v = "cursor:star_trail";
  if (v === "cursor:startrailcursor") v = "cursor:star_trail";
  if (v === "cursor:star_trailcursor") v = "cursor:star_trail";

  return v;
}

function pickAccent(tokens: any): string {
  // We don’t know every token name; pick something useful and pretty.
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
 * Decide how the mobile cursor trail should look,
 * based on the current cursor id and theme tokens.
 */
function pickStyle(cursorIdRaw: string | null | undefined, tokens: any) {
  const id = canonCursorId(cursorIdRaw);
  const accent = pickAccent(tokens);

  // No cursor equipped → no overlay
  if (!id) {
    return {
      kind: "none" as const,
      color: accent,
      baseSize: 0,
      jitter: 0,
    };
  }

  // Glow → soft halo around finger
  if (id === "cursor:glow") {
    return {
      kind: "glow" as const,
      icon: "sparkles" as const, // still available if we want icon accents
      color: accent,
      baseSize: 20,
      jitter: 10,
    };
  }

  // Orb → soft premium halo orb
  if (id === "cursor:orb") {
    return {
      kind: "orb" as const,
      icon: "ellipse" as const,
      color: accent,
      baseSize: 18,
      jitter: 10,
    };
  }

  // Star trail → colorful star particles
  if (id === "cursor:star_trail") {
    return {
      kind: "star_trail" as const,
      icon: "star" as const,
      color: accent,
      baseSize: 16,
      jitter: 12,
    };
  }

  // Fallback → treat any unknown cursor as a soft glow
  return {
    kind: "glow" as const,
    icon: "sparkles" as const,
    color: accent,
    baseSize: 18,
    jitter: 12,
  };
}

/**
 * TouchCursorOverlay (mobile only)
 * - pointerEvents="none" so it never steals taps
 * - emits particles while finger is down & moving
 * - style driven by cursor id + theme
 *
 * Hooks are **never** called conditionally to avoid
 * "Rendered more hooks than during the previous render".
 */
export default function TouchCursorOverlay({ p, down }: Props) {
  const { cursorId } = useCursor();
  const { tokens } = useTheme();

  // Decide what visual mode we're in
  const style = useMemo(() => pickStyle(cursorId, tokens), [cursorId, tokens]);

  // Spark state + last point
  const [sparks, setSparks] = useState<Spark[]>([]);
  const last = useRef<Pt>({ x: -1, y: -1 });

  // Safe point defaults
  const pt: Pt = p ?? { x: -1, y: -1 };
  const isDown = !!down;

  const makeSpark = (x: number, y: number, seed = 0): Spark => {
    const a = new Animated.Value(1);
    const s = new Animated.Value(1);
    const r = new Animated.Value(0);

    const size = style.baseSize + Math.floor(Math.random() * 4);
    const color = style.color;

    Animated.timing(r, {
      toValue: 1,
      duration:
        style.kind === "orb" ? 900 : 650 + Math.floor(Math.random() * 250),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    return {
      id: uid() + "_" + seed,
      x,
      y,
      a,
      s,
      r,
      kind: style.kind as SparkKind,
      icon: style.icon,
      size,
      color,
      halo: style.kind === "orb",
    };
  };

  const runAnim = (sp: Spark, fadeMs = 700) => {
    const upScale =
      sp.kind === "orb" ? 1.45 : sp.kind === "glow" ? 1.35 : 1.25;
    const downScale =
      sp.kind === "orb" ? 0.85 : sp.kind === "glow" ? 0.9 : 0.75;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(sp.s, {
          toValue: upScale,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sp.s, {
          toValue: downScale,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(sp.a, {
        toValue: 0,
        duration: fadeMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      requestAnimationFrame(() => {
        setSparks((prev) => prev.filter((x) => x.id !== sp.id));
      });
    });
  };

  // Emit while moving
  useEffect(() => {
    if (!isDown) return;
    if (style.kind === "none") return;
    if (pt.x < 0 || pt.y < 0) return;

    const dx = pt.x - last.current.x;
    const dy = pt.y - last.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (last.current.x < 0 || last.current.y < 0 || dist >= 6) {
      last.current = { x: pt.x, y: pt.y };
      const sp = makeSpark(pt.x, pt.y);
      setSparks((prev) => [sp, ...prev].slice(0, 30));
      runAnim(sp, style.kind === "orb" ? 880 : 700);
    }
  }, [pt.x, pt.y, isDown, style.kind]);

  // Burst on touch-down
  useEffect(() => {
    if (!isDown) return;
    if (style.kind === "none") return;
    if (pt.x < 0 || pt.y < 0) return;

    const j = style.jitter;
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: j, dy: -Math.floor(j / 2) },
      { dx: -j, dy: Math.floor(j / 2) },
      { dx: Math.floor(j / 2), dy: j },
    ];

    offsets.forEach((o, k) => {
      const sp = makeSpark(pt.x + o.dx, pt.y + o.dy, k);
      setSparks((prev) => [sp, ...prev].slice(0, 30));
      runAnim(sp, style.kind === "orb" ? 980 : 820);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDown]);

  // ✅ Hooks are all above this line. Different renders may
  // return different JSX, but the hook list never changes.
  if (style.kind === "none" && sparks.length === 0) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparks.map((sp) => {
        const rotate = sp.r.interpolate({
          inputRange: [0, 1],
          outputRange: ["0rad", `${Math.PI * 1.75}rad`],
        });

        return (
          <Animated.View
            key={sp.id}
            style={[
              S.sparkWrap,
              {
                left: sp.x - 14,
                top: sp.y - 14,
                opacity: sp.a,
                transform: [{ scale: sp.s }, { rotate }],
              },
            ]}
          >
            {sp.kind === "glow" ? (
              // ✨ Glow cursor: soft halo with bright core
              <View style={S.glowWrap}>
                <View
                  style={[
                    S.glowHalo,
                    {
                      borderColor: sp.color,
                      shadowColor: sp.color,
                    },
                  ]}
                />
                <View
                  style={[
                    S.glowCore,
                    {
                      backgroundColor: sp.color,
                    },
                  ]}
                />
              </View>
            ) : sp.halo ? (
              // Orb: halo + core
              <View style={S.orbWrap}>
                <View
                  style={[
                    S.orbHalo,
                    {
                      shadowColor: sp.color,
                      backgroundColor: sp.color,
                    },
                  ]}
                />
                <View
                  style={[
                    S.orbCore,
                    {
                      shadowColor: sp.color,
                      borderColor: sp.color,
                    },
                  ]}
                />
              </View>
            ) : sp.icon ? (
              // Star trail or fallback icon particles
              <Ionicons name={sp.icon} size={sp.size} color={sp.color} />
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  sparkWrap: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  // ✨ Glow cursor visuals
  glowWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  glowHalo: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.65,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  glowCore: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  // Orb cursor visuals
  orbWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHalo: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    opacity: 0.22,
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  orbCore: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
