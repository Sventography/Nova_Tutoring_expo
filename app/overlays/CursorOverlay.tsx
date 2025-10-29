import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

type Pt = { x: number; y: number };

function useMousePos() {
  const [p, setP] = useState<Pt>({ x: 0, y: 0 });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: MouseEvent) => setP({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return p;
}

export default function CursorOverlay() {
  const { cursorId } = useCursor();
  const { tokens } = useTheme();
  const pos = useMousePos();
  const isWeb = typeof document !== "undefined" && Platform.OS === "web";

  // Hide native cursor ONLY for orb & starTrail. Keep it for default/none & glow.
  useEffect(() => {
    if (!isWeb) return;
    const shouldHide = cursorId === "orbCursor" || cursorId === "starTrailCursor";
    document.body.style.cursor = shouldHide ? "none" : "auto";
    return () => { document.body.style.cursor = "auto"; };
  }, [isWeb, cursorId]);

  if (!isWeb) return null;

  if (cursorId === "glowCursor") {
    // Regular pointer visible; add a soft neon halo that follows.
    const size = 28;
    const halo: React.CSSProperties = {
      position: "fixed",
      left: pos.x - size / 2,
      top: pos.y - size / 2,
      width: size,
      height: size,
      borderRadius: size,
      pointerEvents: "none",
      boxShadow: `0 0 12px ${tokens.accent}, 0 0 28px ${tokens.accent}`,
      opacity: 0.85,
      zIndex: 2147483647,
      mixBlendMode: "screen",
    };
    return <div style={halo} />;
  }

  if (cursorId === "orbCursor") {
    const size = 36;
    const style: React.CSSProperties = {
      position: "fixed",
      left: pos.x - size / 2,
      top: pos.y - size / 2,
      width: size,
      height: size,
      borderRadius: size,
      pointerEvents: "none",
      background: `radial-gradient(circle at 30% 30%, ${tokens.accent}, transparent 60%)`,
      boxShadow: tokens.glow,
      opacity: 0.95,
      zIndex: 2147483647
    };
    return <div style={style} />;
  }

  if (cursorId === "starTrailCursor") {
    return <NeonStarTrail />;
  }

  // default / none
  return null;
}

/* --------------------------- Sparkling Neon Star Trail --------------------------- */

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;      // px
  hue: number;       // 0..360
  rotate: number;    // deg
  life: number;      // ms total
  bornAt: number;    // timestamp
  twinkle: number;   // 0..1 amplitude
};

function NeonStarTrail() {
  const pos = useMousePos();
  const [stars, setStars] = useState<Star[]>([]);
  const nextId = useRef(0);
  const lastP = useRef<Pt>(pos);

  // palette and spawn tuning
  const baseHues = useMemo(() => [190, 200, 210, 280, 300, 320], []); // neon cyans & purples
  const spawnEveryPx = 12; // spawn roughly every N px moved
  const maxStars = 60;

  // spawn stars on movement
  useEffect(() => {
    const dx = pos.x - lastP.current.x;
    const dy = pos.y - lastP.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= spawnEveryPx) {
      const count = Math.max(1, Math.min(3, Math.floor(dist / spawnEveryPx)));
      const now = performance.now();
      const newStars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const id = nextId.current++;
        const size = 6 + Math.random() * 10; // 6–16px
        const hue = baseHues[(Math.floor(Math.random() * baseHues.length))] + (Math.random() * 10 - 5);
        const rotate = Math.random() * 360;
        const life = 500 + Math.random() * 700; // ms
        const twinkle = 0.3 + Math.random() * 0.7;
        const jitter = () => (Math.random() - 0.5) * 14; // slight scatter
        newStars.push({
          id,
          x: pos.x + jitter(),
          y: pos.y + jitter(),
          size,
          hue,
          rotate,
          life,
          twinkle,
          bornAt: now
        });
      }
      setStars((prev) => {
        const next = [...prev, ...newStars];
        return next.slice(Math.max(0, next.length - maxStars));
      });
      lastP.current = pos;
    }
  }, [pos.x, pos.y, baseHues]);

  // prune & rerender on animation frame
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      setStars((prev) => prev.filter((s) => now - s.bornAt < s.life));
      setTick((t) => (t + 1) % 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {stars.map((s) => {
        const now = performance.now();
        const age = now - s.bornAt;
        const t = Math.max(0, Math.min(1, age / s.life)); // 0..1
        const fade = 1 - t; // fade out
        const scale = 0.8 + 0.4 * (1 - t); // slight shrink
        const twinkle = 0.5 + 0.5 * Math.sin((age / 80) + s.id) * s.twinkle;
        const opacity = Math.max(0, Math.min(1, fade * twinkle));

        // neon glow using multiple shadows
        const color = `hsl(${s.hue} 100% 60%)`;
        const glow = `0 0 8px ${color}, 0 0 18px ${color}`;

        // CSS star via clip-path polygon (5-point)
        const starStyle: React.CSSProperties = {
          position: "fixed",
          left: s.x - s.size / 2,
          top: s.y - s.size / 2,
          width: s.size,
          height: s.size,
          pointerEvents: "none",
          transform: `rotate(${s.rotate + t * 180}deg) scale(${scale})`,
          opacity,
          zIndex: 2147483647,
          background: color,
          boxShadow: glow,
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          mixBlendMode: "screen",
        };
        return <div key={s.id} style={starStyle} />;
      })}
    </>
  );
}
