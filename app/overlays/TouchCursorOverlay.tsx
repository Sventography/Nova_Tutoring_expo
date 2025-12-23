import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, StyleSheet, Animated } from "react-native";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

type Pt = { x: number; y: number };
type Props = { p: Pt; down: boolean };

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  bornAt: number;
  life: number;
  hue: number;
};

export default function TouchCursorOverlay({ p, down }: Props) {
  // Native only
  if (Platform.OS === "web") return null;

  const { cursorId } = useCursor();
  const { tokens } = useTheme();

  if (!cursorId || cursorId === "none") return null;

  const accent = tokens?.accent ?? "#00e5ff";

  // Smooth follow
  const ax = useRef(new Animated.Value(-9999)).current;
  const ay = useRef(new Animated.Value(-9999)).current;

  useEffect(() => {
    Animated.spring(ax, {
      toValue: p.x,
      useNativeDriver: true,
      speed: 26,
      bounciness: 0,
    }).start();
    Animated.spring(ay, {
      toValue: p.y,
      useNativeDriver: true,
      speed: 26,
      bounciness: 0,
    }).start();
  }, [p.x, p.y, ax, ay]);

  /* -------------------- star trail (native) -------------------- */
  const [stars, setStars] = useState<Star[]>([]);
  const nextId = useRef(0);
  const lastP = useRef<Pt>({ x: -9999, y: -9999 });
  const baseHues = useMemo(() => [190, 200, 210, 280, 300, 320], []);

  useEffect(() => {
    if (cursorId !== "starTrailCursor") return;
    // prune loop
    const t = setInterval(() => {
      const now = Date.now();
      setStars((prev) => prev.filter((s) => now - s.bornAt < s.life));
    }, 60);
    return () => clearInterval(t);
  }, [cursorId]);

  useEffect(() => {
    if (cursorId !== "starTrailCursor") return;

    // only spawn when finger is down and moving on-screen
    if (!down) return;
    if (p.x < 0 || p.y < 0) return;

    const dx = p.x - lastP.current.x;
    const dy = p.y - lastP.current.y;
    const dist = Math.hypot(dx, dy);

    // spawn every ~12px moved
    if (dist < 12) return;

    lastP.current = p;
    const count = Math.max(1, Math.min(3, Math.floor(dist / 12)));
    const now = Date.now();

    const out: Star[] = [];
    for (let i = 0; i < count; i++) {
      const size = 5 + Math.random() * 10;
      const hue =
        baseHues[Math.floor(Math.random() * baseHues.length)] +
        (Math.random() * 10 - 5);
      const life = 450 + Math.random() * 650;
      const jitter = () => (Math.random() - 0.5) * 16;

      out.push({
        id: nextId.current++,
        x: p.x + jitter(),
        y: p.y + jitter(),
        size,
        bornAt: now,
        life,
        hue,
      });
    }

    setStars((prev) => {
      const next = [...prev, ...out];
      return next.slice(Math.max(0, next.length - 80));
    });
  }, [p.x, p.y, down, cursorId, baseHues]);

  // don’t show cursor until user touches at least once
  const hasTouch = p.x > 0 && p.y > 0;

  const orbSize = 34;
  const haloSize = 26;

  return (
    <View pointerEvents="none" style={S.wrap}>
      {/* Glow cursor */}
      {cursorId === "glowCursor" && hasTouch ? (
        <Animated.View
          style={[
            S.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize,
              opacity: down ? 0.95 : 0.75,
              transform: [
                { translateX: Animated.subtract(ax, haloSize / 2) as any },
                { translateY: Animated.subtract(ay, haloSize / 2) as any },
              ],
              shadowColor: accent,
              shadowOpacity: 0.9,
              shadowRadius: 12,
            },
          ]}
        />
      ) : null}

      {/* Orb cursor */}
      {cursorId === "orbCursor" && hasTouch ? (
        <Animated.View
          style={[
            S.orb,
            {
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize,
              opacity: down ? 0.98 : 0.88,
              transform: [
                { translateX: Animated.subtract(ax, orbSize / 2) as any },
                { translateY: Animated.subtract(ay, orbSize / 2) as any },
              ],
              shadowColor: accent,
              shadowOpacity: 0.9,
              shadowRadius: 18,
            },
          ]}
        >
          <View
            style={{
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          />
        </Animated.View>
      ) : null}

      {/* Star trail */}
      {cursorId === "starTrailCursor" ? (
        <>
          {stars.map((s) => {
            const age = Date.now() - s.bornAt;
            const t = Math.max(0, Math.min(1, age / s.life));
            const opacity = 1 - t;
            const color = `hsl(${s.hue}, 100%, 60%)`;
            return (
              <View
                key={s.id}
                style={{
                  position: "absolute",
                  left: s.x - s.size / 2,
                  top: s.y - s.size / 2,
                  width: s.size,
                  height: s.size,
                  opacity,
                  borderRadius: 999,
                  backgroundColor: color,
                  shadowColor: color,
                  shadowOpacity: 0.95,
                  shadowRadius: 10,
                }}
              />
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
  },
  halo: { position: "absolute", backgroundColor: "transparent" },
  orb: { position: "absolute", backgroundColor: "transparent" },
});
