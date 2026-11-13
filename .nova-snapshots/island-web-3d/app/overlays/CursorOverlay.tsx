import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useCursor } from "../context/CursorContext";
import { useTheme } from "../context/ThemeContext";

// Canonicalize a cursor ID (matches Shop + Context)
function canonId(id?: string | null) {
  if (!id) return "";
  let v = String(id).trim().toLowerCase();
  v = v.replace(/-/g, "_");

  // prefix cursor:
  if (!v.includes(":") && v.startsWith("cursor")) {
    v = "cursor:" + v.replace(/^cursor[_:]?/, "");
  }

  // alias bare names too (just in case)
  if (v === "glow") v = "cursor:glow";
  if (v === "orb") v = "cursor:orb";
  if (v === "startrail" || v === "star_trail") v = "cursor:star_trail";

  if (v === "cursor:startrail") v = "cursor:star_trail";
  return v;
}

type Pt = { x: number; y: number };

function useMousePos() {
  const [p, setP] = useState<Pt>({ x: 0, y: 0 });

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w: any = typeof window !== "undefined" ? window : null;
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
  const { cursorId } = useCursor();
  const { tokens } = useTheme();
  const canon = canonId(cursorId);

  const isWeb =
    Platform.OS === "web" &&
    typeof document !== "undefined" &&
    typeof (window as any)?.addEventListener === "function";

  const pos = useMousePos();

  // IMPORTANT: we NEVER hide the native cursor anymore.
  // We just draw pretty things on top.
  useEffect(() => {
    if (!isWeb) return;
    try {
      document.body.style.cursor = "auto";
    } catch {}
    return () => {
      try {
        document.body.style.cursor = "auto";
      } catch {}
    };
  }, [isWeb]);

  if (!isWeb) return null;

  /* ---------- GLOW CURSOR: bright halo around the mouse pointer ---------- */
  if (canon === "cursor:glow") {
    const outerSize = 46;
    const innerSize = 22;

    const outer: React.CSSProperties = {
      position: "fixed",
      left: pos.x - outerSize / 2,
      top: pos.y - outerSize / 2,
      width: outerSize,
      height: outerSize,
      borderRadius: outerSize,
      pointerEvents: "none",
      border: `1px solid ${tokens.accent}`,
      background:
        "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
      boxShadow: `0 0 14px ${tokens.accent}, 0 0 30px ${tokens.accent}, 0 0 60px ${tokens.accent}`,
      opacity: 0.9,
      zIndex: 2147483647,
      mixBlendMode: "screen",
    };

    const inner: React.CSSProperties = {
      position: "fixed",
      left: pos.x - innerSize / 2,
      top: pos.y - innerSize / 2,
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize,
      pointerEvents: "none",
      background: tokens.accent as any,
      opacity: 0.25,
      zIndex: 2147483647,
      mixBlendMode: "screen",
    };

    return (
      <>
        <div style={outer} />
        <div style={inner} />
      </>
    );
  }

  /* ---------------- ORB CURSOR: glowing blob that follows ---------------- */
  if (canon === "cursor:orb") {
    const size = 36;
    const color = tokens.accent as string;
    const glow = `0 0 16px ${color}, 0 0 32px ${color}`;

    const style: React.CSSProperties = {
      position: "fixed",
      left: pos.x - size / 2,
      top: pos.y - size / 2,
      width: size,
      height: size,
      borderRadius: size,
      pointerEvents: "none",
      background: `radial-gradient(circle at 30% 30%, ${color}, transparent 65%)`,
      boxShadow: glow,
      opacity: 0.95,
      zIndex: 2147483647,
      mixBlendMode: "screen",
    };
    return <div style={style} />;
  }

  /* ----------------- STAR TRAIL: sparkling tail -------------------------- */
  if (canon === "cursor:star_trail") {
    return <NeonStarTrail />;
  }

  // default / none
  return null;
}

/* -------- Sparkling Neon Star Trail -------- */
type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  hue: number;
  rotate: number;
  life: number;
  bornAt: number;
  twinkle: number;
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

  const baseHues = useMemo(() => [190, 200, 210, 280, 300, 320], []);
  const spawnEveryPx = 12;
  const maxStars = 60;

  useEffect(() => {
    if (!isWeb) return;
    const dx = pos.x - lastP.current.x;
    const dy = pos.y - lastP.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= spawnEveryPx) {
      const count = Math.max(1, Math.min(3, Math.floor(dist / spawnEveryPx)));
      const now =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const newStars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const id = nextId.current++;
        const size = 6 + Math.random() * 10;
        const hue =
          baseHues[Math.floor(Math.random() * baseHues.length)] +
          (Math.random() * 10 - 5);
        const rotate = Math.random() * 360;
        const life = 500 + Math.random() * 700;
        const twinkle = 0.3 + Math.random() * 0.7;
        const jitter = () => (Math.random() - 0.5) * 14;
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

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isWeb) return;
    const w: any = typeof window !== "undefined" ? window : null;
    if (!w || typeof w.requestAnimationFrame !== "function") return;
    let raf = 0;
    const loop = () => {
      const now =
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
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
          typeof performance !== "undefined" &&
          typeof performance.now === "function"
            ? performance.now()
            : Date.now();
        const age = now - s.bornAt;
        const t = Math.max(0, Math.min(1, age / s.life));
        const fade = 1 - t;
        const scale = 0.8 + 0.4 * (1 - t);
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
