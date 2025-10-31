import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SoundBar from "../../components/SoundBar";

type Technique = {
  id: string;
  name: string;
  inhale: number;
  holdTop: number;
  exhale: number;
  holdBottom: number;
};

const TECHNIQUES: Technique[] = [
  { id: "box",       name: "Box 4-4-4-4",       inhale: 4, holdTop: 4, exhale: 4, holdBottom: 4 },
  { id: "478",       name: "4-7-8",             inhale: 4, holdTop: 7, exhale: 8, holdBottom: 0 },
  { id: "resonant",  name: "Resonant 4-0-6-0",  inhale: 4, holdTop: 0, exhale: 6, holdBottom: 0 },
  { id: "triangle",  name: "Triangle 4-4-4",    inhale: 4, holdTop: 4, exhale: 4, holdBottom: 0 },
  { id: "calm",      name: "Calm 5-5-5-5",      inhale: 5, holdTop: 5, exhale: 5, holdBottom: 5 },
];

type Phase = "inhale" | "holdTop" | "exhale" | "holdBottom";

/* === Pink palette === */
const PINK_BG_TOP = "#ffe6f1";
const PINK_BG_BOTTOM = "#ffffff";
const PINK_ACCENT = "#ff6ea8";
const PINK_ACCENT_SOFT = "rgba(255, 110, 168, 0.12)";
const PINK_ACCENT_SOFTER = "rgba(255, 110, 168, 0.08)";
const TEXT_PRIMARY = "#612c43";
const TEXT_SECONDARY = "#8a566a";

export default function RelaxScreen() {
  const [techId, setTechId] = useState<Technique["id"]>("box");
  const tech = useMemo(() => TECHNIQUES.find(t => t.id === techId)!, [techId]);

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [timeLeft, setTimeLeft] = useState<number>(tech.inhale);

  const scale = useRef(new Animated.Value(0.7)).current;

  function animateForPhase(next: Phase, durMs: number) {
    if (next === "inhale") {
      Animated.timing(scale, { toValue: 1.25, duration: durMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    } else if (next === "exhale") {
      Animated.timing(scale, { toValue: 0.7, duration: durMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    } else {
      scale.stopAnimation(); // holds: bubble pauses
    }
  }

  function nextPhase(curr: Phase): Phase {
    if (curr === "inhale")     return tech.holdTop   > 0 ? "holdTop"    : "exhale";
    if (curr === "holdTop")    return "exhale";
    if (curr === "exhale")     return tech.holdBottom> 0 ? "holdBottom" : "inhale";
    return "inhale";
  }

  useEffect(() => {
    if (!running) return;
    const durMs = (phase === "inhale" ? tech.inhale : phase === "holdTop" ? tech.holdTop : phase === "exhale" ? tech.exhale : tech.holdBottom) * 1000;
    animateForPhase(phase, durMs);

    setTimeLeft(durMs / 1000);
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, Math.round(durMs / 1000) - elapsed);
      setTimeLeft(left);
      if (elapsed >= durMs / 1000) {
        clearInterval(timer);
        setPhase(nextPhase(phase));
      }
    }, 250);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, tech]);

  useEffect(() => {
    if (!running) return;
    setRunning(false);
    const t = setTimeout(() => setRunning(true), 0);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    setPhase("inhale");
    setTimeLeft(tech.inhale);
    scale.setValue(0.7);
  }, [techId]);

  function startPause() { setRunning(r => !r); }
  function reset() {
    setRunning(false);
    setPhase("inhale");
    setTimeLeft(tech.inhale);
    scale.setValue(0.7);
  }

  const [g5, setG5] = useState("");
  const [g4, setG4] = useState("");
  const [g3, setG3] = useState("");
  const [g2, setG2] = useState("");
  const [g1, setG1] = useState("");

  const phaseLabel: Record<Phase, string> = { inhale: "Inhale", holdTop: "Hold", exhale: "Exhale", holdBottom: "Hold" };

  return (
    <LinearGradient colors={[PINK_BG_TOP, PINK_BG_BOTTOM]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: TEXT_PRIMARY, fontWeight: "800", fontSize: 22, marginBottom: 10 }}>Relax</Text>

        {/* Technique picker */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {TECHNIQUES.map(t => (
            <Pressable
              key={t.id}
              onPress={() => setTechId(t.id)}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                borderWidth: 1,
                borderColor: t.id === techId ? PINK_ACCENT : "rgba(97,44,67,0.25)",
                backgroundColor: pressed ? "rgba(255,110,168,0.12)" : t.id === techId ? "rgba(255,110,168,0.10)" : "transparent",
              })}
            >
              <Text style={{ color: t.id === techId ? TEXT_PRIMARY : TEXT_SECONDARY, fontWeight: "700" }}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Bubble */}
        <View style={{ alignItems: "center", marginVertical: 16 }}>
          <Animated.View
            style={{
              width: 180, height: 180, borderRadius: 999,
              backgroundColor: PINK_ACCENT_SOFT,
              borderWidth: 2, borderColor: PINK_ACCENT,
              transform: [{ scale }],
              shadowColor: PINK_ACCENT, shadowOpacity: 0.4, shadowRadius: 12,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: TEXT_PRIMARY, fontSize: 18, fontWeight: "800" }}>{phaseLabel[phase]}</Text>
            <Text style={{ color: TEXT_PRIMARY, fontSize: 40, fontWeight: "900", marginTop: 4 }}>{timeLeft}</Text>
          </Animated.View>

          {/* Controls */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={startPause}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                borderWidth: 1, borderColor: PINK_ACCENT,
                backgroundColor: pressed ? "rgba(255,110,168,0.15)" : PINK_ACCENT_SOFT
              })}
            >
              <Ionicons name={running ? "pause" : "play"} size={16} color={PINK_ACCENT} />
              <Text style={{ color: PINK_ACCENT, fontWeight: "800" }}>{running ? "Pause" : "Start"}</Text>
            </Pressable>

            <Pressable
              onPress={reset}
              style={({ pressed }) => ({
                paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                borderWidth: 1, borderColor: "rgba(97,44,67,0.35)",
                backgroundColor: pressed ? "rgba(97,44,67,0.10)" : PINK_ACCENT_SOFTER
              })}
            >
              <Text style={{ color: TEXT_SECONDARY, fontWeight: "800" }}>Reset</Text>
            </Pressable>
          </View>
        </View>

        {/* Technique timings preview */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
          <Chip label={`In: ${tech.inhale}s`} />
          <Chip label={`Hold: ${tech.holdTop}s`} />
          <Chip label={`Out: ${tech.exhale}s`} />
          <Chip label={`Hold: ${tech.holdBottom}s`} />
        </View>

        {/* Sounds */}
        <SoundBar />

        {/* Grounding */}
        <Text style={{ color: TEXT_PRIMARY, fontWeight: "800", fontSize: 18, marginTop: 14, marginBottom: 6 }}>
          Grounding (5-4-3-2-1)
        </Text>

        <GroundRow n={5} label="Things you can SEE"  placeholder="List 5 things you see…"  value={g5} onChange={setG5} />
        <GroundRow n={4} label="Things you can FEEL" placeholder="List 4 things you feel…" value={g4} onChange={setG4} />
        <GroundRow n={3} label="Things you can HEAR" placeholder="List 3 things you hear…" value={g3} onChange={setG3} />
        <GroundRow n={2} label="Things you can SMELL" placeholder="List 2 things you smell…" value={g2} onChange={setG2} />
        <GroundRow n={1} label="Thing you can TASTE" placeholder="List 1 thing you taste…" value={g1} onChange={setG1} />
      </ScrollView>
    </LinearGradient>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(97,44,67,0.25)", backgroundColor: "rgba(255,110,168,0.08)" }}>
      <Text style={{ color: "#7a4159", fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function GroundRow({
  n, label, value, onChange, placeholder,
}: { n: number; label: string; value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: "#7a4159", marginBottom: 6, fontWeight: "700" }}>{n} — {label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a8738f"
        multiline
        style={{
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "rgba(97,44,67,0.25)",
          color: TEXT_PRIMARY,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "rgba(255,255,255,0.6)",
        }}
      />
    </View>
  );
}
