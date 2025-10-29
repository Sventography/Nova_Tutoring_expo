import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: W, height: H } = Dimensions.get("window");
const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const ri = (a:number,b:number) => Math.floor(a + Math.random() * (b - a + 1));
type Palette = { glyphs: string[]; colors: string[]; size:[number,number] };
const RAIN: Palette = { glyphs:["•"], colors:["#01e5ff","#76f0ff"], size:[6,10] };
const PALETTES: Record<string, Palette> = {
  "theme:neon": RAIN,
  "theme:starry":    { glyphs:["★","✦","☽"], colors:["#ffd966","#ffefa1","#cde2ff"], size:[12,18] },
  "theme:pink":      { glyphs:["❤","✦","◆"], colors:["#ffeef9","#ffd6ef","#fff2fb"], size:[12,18] },
  "theme:dark":      { glyphs:["✦","◆","✶"], colors:["#b8dfff","#e8f4ff","#d6e9ff"], size:[10,16] },
  "theme:mint":      { glyphs:["✳","●","✦"], colors:["#e9fff8","#d6ffef","#f2fffb"], size:[10,16] },
  "theme:glitter":   { glyphs:["✦","◆","★"], colors:["#f5eaff","#ffe9ff","#fff4ff"], size:[10,18] },
  "theme:blackgold": { glyphs:["◆","✦","★"], colors:["#ffe9a8","#fff2c9","#fff9dd"], size:[12,18] },
  "theme:neonpurple":{ glyphs:["✦","◆","★"], colors:["#faeaff","#f3d6ff","#fff2ff"], size:[10,18] },
  "theme:silver":    { glyphs:["✶","✦","◆"], colors:["#f0f6fa","#e5f0f6","#ffffff"], size:[10,16] },
  "theme:emerald":   { glyphs:["◆","✦","●"], colors:["#eafff5","#d4ffef","#ffffff"], size:[10,16] },
  "theme:crimson":   { glyphs:["❤","✦","◆"], colors:["#ffe9ee","#ffd3dd","#fff0f3"], size:[12,18] },
};
const MAX = 36, SPAWN_MS = 180, FALL_MIN = 3500, FALL_MAX = 6500;
type Drop = { id:number; x:number; size:number; lifeMs:number; glyph:string; color:string; drift:number; };
let NEXT = 1;

export default function FxOverlay() {
  const [storeId, setStoreId] = useState<string>("theme:neon");

  // poll AsyncStorage (storage-first)
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const raw = (await AsyncStorage.getItem("@nova/themeId")) || "theme:neon";
        if (live) setStoreId(prev => prev === raw ? prev : raw);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 800);
    return () => { live = false; clearInterval(t); };
  }, []);

  const themeId = storeId ?? "theme:neon";
  useEffect(() => { try { console.log("[FxOverlay] using=", themeId); } catch {} }, [themeId]);

  const palette = useMemo<Palette>(() => PALETTES[themeId] ?? RAIN, [themeId]);

  const [drops, setDrops] = useState<Drop[]>([]);
  const anims = useRef<Record<number, { y: Animated.Value; r: Animated.Value; a: Animated.Value }>>({});

  // spawn loop — restarts on palette change
  useEffect(() => {
    const timer = setInterval(() => {
      setDrops(prev => {
        const next = prev.length >= MAX ? prev.slice(1) : prev.slice();
        next.push({
          id: NEXT++,
          x: Math.random() * W,
          size: ri(palette.size[0], palette.size[1]),
          lifeMs: ri(FALL_MIN, FALL_MAX),
          glyph: pick(palette.glyphs),
          color: pick(palette.colors),
          drift: (Math.random() * 1.4 - 0.7) * 40,
        });
        return next;
      });
    }, SPAWN_MS);
    return () => clearInterval(timer);
  }, [palette]);

  // animate new drops
  useEffect(() => {
    drops.forEach(d => {
      if (anims.current[d.id]) return;
      const y = new Animated.Value(-40);
      const r = new Animated.Value(0);
      const a = new Animated.Value(0);
      Animated.parallel([
        Animated.timing(y, { toValue: H + 40, duration: d.lifeMs, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.9, duration: d.lifeMs - 600, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.loop(Animated.timing(r, { toValue: 1, duration: 2200 + Math.random() * 1200, easing: Easing.linear, useNativeDriver: true })),
      ]).start();
      anims.current[d.id] = { y, r, a };
    });
  }, [drops]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Big center label so it’s obvious */}
      <View style={{ position:"absolute", top: H/2 - 40, left: 0, right: 0, alignItems:"center" }}>
        <Text style={{ color:"#ffffff", fontWeight:"900", fontSize: 18 }}>
          THEME → {themeId}
        </Text>
      </View>
      {drops.map(d => {
        const anim = anims.current[d.id];
        if (!anim) return null;
        const rotate = anim.r.interpolate({ inputRange:[0,1], outputRange:["0deg","360deg"] });
        return (
          <Animated.View key={d.id} style={{ position:"absolute", left:d.x, transform:[{ translateY: anim.y }, { translateX: d.drift }, { rotate }], opacity: anim.a }}>
            <Text style={{ fontSize: d.size, color: d.color, textShadowColor:"rgba(0,0,0,0.25)", textShadowRadius: 6 }}>{d.glyph}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
