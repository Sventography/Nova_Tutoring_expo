import React, { useEffect, useRef, useState } from "react";
import { View, Image, Platform, Pressable } from "react-native";

type Dot = { id: number; x: number; y: number; life: number; rot: number };

export default function CursorStarTrail() {
  const [dots, setDots] = useState<Dot[]>([]);
  const idRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pressed = useRef(false);
  const lastSpawn = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setDots((prev) =>
        prev
          .map((d) => ({ ...d, life: d.life - dt }))
          .filter((d) => d.life > 0)
          .slice(-60)
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const shouldSpawn = (x: number, y: number) => {
    const now = Date.now();
    if (!lastSpawn.current) return true;
    const dx = x - lastSpawn.current.x;
    const dy = y - lastSpawn.current.y;
    const dist2 = dx * dx + dy * dy;
    return dist2 > 36 && now - lastSpawn.current.time > 12;
  };

  const spawn = (x: number, y: number) => {
    if (!shouldSpawn(x, y)) return;
    const id = ++idRef.current;
    const rot = Math.random() * 40 - 20;
    setDots((prev) => [...prev, { id, x: x - 5, y: y - 5, life: 0.45, rot }]);
    lastSpawn.current = { x, y, time: Date.now() };
  };

  const onMouseMove = (e: any) => {
    if (Platform.OS === "web") spawn(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const onTouch = (e: any) => {
    if (!pressed.current) return;
    const t = e.nativeEvent;
    const x = t.locationX ?? t.pageX ?? 0;
    const y = t.locationY ?? t.pageY ?? 0;
    spawn(x, y);
  };

  return (
    <Pressable
      onPressIn={() => (pressed.current = true)}
      onPressOut={() => (pressed.current = false)}
      onMouseMove={onMouseMove}
      onTouchMove={onTouch}
      style={{ position: "absolute", inset: 0 }}
    >
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        {dots.map((d) => {
          const t = d.life / 0.45;
          const opacity = Math.max(0, t);
          const scale = 0.9 + 0.1 * t;
          return (
            <Image
              key={d.id}
              source={require("../assets/shop/trail_star.png")}
              style={{
                position: "absolute",
                left: d.x,
                top: d.y,
                width: 10,
                height: 10,
                opacity,
                transform: [{ rotate: `${d.rot}deg` }, { scale }],
              }}
            />
          );
        })}
      </View>
    </Pressable>
  );
}
