import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

type Pt = { x: number; y: number };

function useMousePos() {
  const [p, setP] = useState<Pt>({ x: 0, y: 0 });

  useEffect(() => {
    // Only run mouse tracking on real web DOM
    if (Platform.OS !== "web") return;

    const w: any = typeof window !== "undefined" ? (window as any) : null;
    if (!w || typeof w.addEventListener !== "function") return;

    const onMove = (e: any) => setP({ x: e.clientX ?? 0, y: e.clientY ?? 0 });
    w.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      try {
        w.removeEventListener("mousemove", onMove);
      } catch {}
    };
  }, []);

  return p;
}

export default function CursorOverlay() {
  const { cursorId } = (useCursor?.() || {}) as any;
  const { tokens } = (useTheme?.() || {}) as any;

  const isWeb =
    Platform.OS === "web" &&
    typeof document !== "undefined" &&
    typeof (window as any)?.addEventListener === "function";

  const pos = useMousePos();

  // Hide native cursor ONLY for orb & starTrail. Keep it for default/none & glow.
  useEffect(() => {
    if (!isWeb) return;

    const shouldHide =
      cursorId === "orbCursor" || cursorId === "starTrailCursor";

    try {
      document.body.style.cursor = shouldHide ? "none" : "auto";
    } catch {}

    return () => {
      try {
        document.body.style.cursor = "auto";
      } catch {}
    };
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
      boxShadow: `0 0 12px ${tokens?.accent ?? "#00e5ff"}, 0 0 28px ${
        tokens?.accent ?? "#00e5ff"
      }`,
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
      background: `radial-gradient(circle at 30% 30%, ${
        tokens?.accent ?? "#00e5ff"
      }, transparent 60%)`,
      boxShadow: tokens?.glow ?? "0 0 18px rgba(0,229,255,0.35)",
      opacity: 0.95,
      zIndex: 2147483647,
      mixBlendMode: "screen",
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
  size: number; // px
  hue: number; // 0..360
  rotate: number; // deg
  life: number; // ms total
  bornAt: number; // timestamp
  twinkle: number; // 0..1 amplitude
};

function NeonStarTrail() {
  const isWeb =
    Platform.OS === "web" &&
    typeof document !== "undefined" &&
    typeof (window as any)?.addEventListener === "function";

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
    if (!isWeb) return;

    const dx = pos.x - lastP.current.x;
    const dy = pos.y - lastP.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist >= spawnEveryPx) {
      const count = Math.max(1, Math.min(3, Math.floor(dist / spawnEveryPx)));
      const now =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      const newStars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const id = nextId.current++;
        const size = 6 + Math.random() * 10; // 6–16px
        const hue =
          baseHues[Math.floor(Math.random() * baseHues.length)] +
          (Math.random() * 10 - 5);
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
          bornAt: now,
        });
      }

      setStars((prev) => {
        const next = [...prev, ...newStars];
        return next.slice(Math.max(0, next.length - maxStars));
      });

      lastP.current = pos;
    }
  }, [isWeb, pos.x, pos.y, baseHues]);

  // prune & rerender on animation frame
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isWeb) return;

    const w: any = typeof window !== "undefined" ? (window as any) : null;
    if (!w || typeof w.requestAnimationFrame !== "function") return;

    let raf = 0;

    const loop = () => {
      const now =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      setStars((prev) => prev.filter((s) => now - s.bornAt < s.life));
      setTick((t) => (t + 1) % 1000);

      raf = w.requestAnimationFrame(loop);
    };

    raf = w.requestAnimationFrame(loop);
    return () => {
      try {
        w.cancelAnimationFrame(raf);
      } catch {}
    };
  }, [isWeb]);

  if (!isWeb) return null;

  return (
    <>
      {stars.map((s) => {
        const now =
          typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now()
            : Date.now();

        const age = now - s.bornAt;
        const t = Math.max(0, Math.min(1, age / s.life)); // 0..1
        const fade = 1 - t; // fade out
        const scale = 0.8 + 0.4 * (1 - t); // slight shrink
        const tw = 0.5 + 0.5 * Math.sin(age / 80 + s.id) * s.twinkle;
        const opacity = Math.max(0, Math.min(1, fade * tw));

        const color = `hsl(${s.hue} 100% 60%)`;
        const glow = `0 0 8px ${color}, 0 0 18px ${color}`;

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
          clipPath:
            "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          mixBlendMode: "screen",
        };

        return <div key={s.id} style={starStyle} />;
      })}
    </>
  );
}
