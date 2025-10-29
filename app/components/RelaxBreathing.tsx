import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type ModeKey = "box" | "fourSevenEight" | "equal" | "custom";
type Phase = "inhale" | "hold" | "exhale";

const PRESETS: Record<ModeKey, { inhale: number; hold: number; exhale: number; label: string }> = {
  box: { inhale: 4, hold: 4, exhale: 4, label: "Box 4–4–4" },
  fourSevenEight: { inhale: 4, hold: 7, exhale: 8, label: "4–7–8" },
  equal: { inhale: 5, hold: 0, exhale: 5, label: "Equal 5–0–5" },
  custom: { inhale: 3, hold: 3, exhale: 3, label: "Custom" },
};

export default function RelaxBreathing() {
  const [mode, setMode] = useState<ModeKey>("box");
  const [dur, setDur] = useState(PRESETS.box);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [remaining, setRemaining] = useState<number>(dur.inhale);
  const [running, setRunning] = useState(false);

  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDur(PRESETS[mode]);
  }, [mode]);

  useEffect(() => {
    if (!running) return;
    setPhase("inhale");
    setRemaining(dur.inhale || 1);

    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // move to next phase
        setPhase((p) => {
          const next = nextPhase(p, dur);
          setRemaining(phaseDuration(next, dur) || 1);
          return next;
        });
        return 0; // briefly 0; immediately replaced next tick
      });
    }, 1000);

    return () => {
      timer.current && clearInterval(timer.current);
    };
  }, [running, dur]);

  function nextPhase(p: Phase, d: typeof dur): Phase {
    if (p === "inhale") return d.hold > 0 ? "hold" : "exhale";
    if (p === "hold") return "exhale";
    return "inhale";
  }

  function phaseDuration(p: Phase, d: typeof dur) {
    if (p === "inhale") return d.inhale;
    if (p === "hold") return d.hold;
    return d.exhale;
  }

  return (
    <View style={{ gap: 16 }}>
      {/* mode buttons */}
      <View style={styles.modeRow}>
        {(["box","fourSevenEight","equal","custom"] as ModeKey[]).map((k) => (
          <Pressable
            key={k}
            onPress={() => setMode(k)}
            style={[styles.chip, mode === k && styles.chipActive]}
          >
            <Text style={[styles.chipText, mode === k && styles.chipTextActive]}>
              {PRESETS[k].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* bubble + label */}
      <View style={styles.center}>
        <View style={[styles.bubble, phaseColor(phase)]}>
          <Text style={styles.bubbleNumber}>{remaining}</Text>
        </View>
        <Text style={styles.phaseText}>{phase.toUpperCase()}</Text>
      </View>

      {/* controls */}
      <View style={styles.controls}>
        <Pressable style={[styles.btn, running && styles.btnStop]} onPress={() => setRunning((r) => !r)}>
          <Text style={styles.btnText}>{running ? "Pause" : "Start"}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => { setRunning(false); setPhase("inhale"); setRemaining(dur.inhale || 1); }}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function phaseColor(phase: Phase) {
  if (phase === "inhale") return { backgroundColor: "rgba(121,209,230,0.25)", borderColor: "#79d1e6" };
  if (phase === "hold") return { backgroundColor: "rgba(255,223,128,0.22)", borderColor: "#ffd480" };
  return { backgroundColor: "rgba(255,155,155,0.22)", borderColor: "#ff9b9b" };
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  chipActive: { backgroundColor: "#ffe6f0", borderColor: "#ffb3cc" },
  chipText: { color: "#333", fontWeight: "600" },
  chipTextActive: { color: "#cc3d7a" },

  center: { alignItems: "center", gap: 8, marginTop: 8 },
  bubble: {
    width: 140, height: 140, borderRadius: 140,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2,
  },
  bubbleNumber: { fontSize: 48, fontWeight: "800", color: "#333" },
  phaseText: { fontWeight: "800", color: "#333" },

  controls: { flexDirection: "row", gap: 10, justifyContent: "center" },
  btn: {
    backgroundColor: "#ffd6e6", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#ffb3cc",
  },
  btnStop: { backgroundColor: "#ffe6b3", borderColor: "#ffd480" },
  btnText: { fontWeight: "800", color: "#333" },
});
