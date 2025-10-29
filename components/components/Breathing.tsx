import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";

const TECHNIQUES = [
  { id: "box", name: "Box 4-4-4-4", pattern: [4, 4, 4, 4] },
  { id: "478", name: "4-7-8", pattern: [4, 7, 8, 0] },
  { id: "coh", name: "Coherent 5-5", pattern: [5, 0, 5, 0] },
];

export default function Breathing() {
  const [open, setOpen] = useState(false);
  const [tech, setTech] = useState(TECHNIQUES[0]);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(tech.pattern[0]);
  const [running, setRunning] = useState(false);
  const size = useRef(new Animated.Value(120)).current;
  const phases = ["Inhale", "Hold", "Exhale", "Hold"];

  useEffect(() => {
    if (!running) return;
    let i = tech.pattern[phase] || 0;
    setCount(i);
    const int = setInterval(() => {
      i--;
      setCount(i);
      if (i <= 0) {
        const next = (phase + 1) % 4;
        setPhase(next);
        i = tech.pattern[next] || 0;
        setCount(i);
        animate(next);
      }
    }, 1000);
    return () => clearInterval(int);
  }, [running, phase, tech]);

  const animate = (p: number) => {
    if (p === 0)
      Animated.timing(size, {
        toValue: 180,
        duration: (tech.pattern[0] || 1) * 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start();
    if (p === 2)
      Animated.timing(size, {
        toValue: 120,
        duration: (tech.pattern[2] || 1) * 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start();
  };

  const start = () => {
    setPhase(0);
    setRunning(true);
    animate(0);
  };
  const stop = () => {
    setRunning(false);
    size.stopAnimation();
  };

  return (
    <View variant="bg" style={s.wrap}>
      <Pressable style={s.select} onPress={() => setOpen((v) => !v)}>
        <Text style={s.selT}>{tech.name}</Text>
      </Pressable>
      {open && (
        <View style={s.menu}>
          {TECHNIQUES.map((t) => (
            <Pressable
              key={t.id}
              style={s.item}
              onPress={() => {
                setTech(t);
                setOpen(false);
              }}
            >
              <Text style={s.itemT}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Animated.View
        style={[
          s.bubble,
          {
            width: size,
            height: size,
            borderRadius: size.interpolate({
              inputRange: [0, 200],
              outputRange: [0, 100],
            }),
          },
        ]}
      >
        <Text style={s.phase}>{phases[phase]}</Text>
        <Text style={s.count}>{count}s</Text>
      </Animated.View>
      <View style={s.row}>
        {!running ? (
          <Pressable style={s.btn} onPress={start}>
            <Text style={s.btnT}>Start</Text>
          </Pressable>
        ) : (
          <Pressable style={s.btn} onPress={stop}>
            <Text style={s.btnT}>Stop</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12, alignItems: "center" },
  select: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#111",
    marginBottom: 8,
  },
  selT: { color: "#0ff", fontWeight: "800" },
  menu: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    backgroundColor: "#111",
    padding: 6,
    marginBottom: 8,
    width: 240,
  },
  item: { padding: 8, borderRadius: 8 },
  itemT: { color: "#cfe6ff" },
  bubble: {
    backgroundColor: "#112233",
    borderWidth: 2,
    borderColor: "#0ff",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  phase: { color: "#cfe6ff", fontSize: 18, fontWeight: "800" },
  count: { color: "#9bbad6", fontSize: 16, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#111",
  },
  btnT: { color: "#0ff", fontWeight: "800" },
});
