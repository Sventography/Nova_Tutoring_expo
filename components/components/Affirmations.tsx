import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Speech from "expo-speech";
import { AFFIRMATIONS } from "../constants/affirmations";

type V = {
  identifier: string;
  name?: string;
  quality?: number;
  language?: string;
};

export default function Affirmations() {
  const [voices, setVoices] = useState<V[]>([]);
  const [open, setOpen] = useState(false);
  const [voiceId, setVoiceId] = useState<string>("");
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    (async () => {
      const vs = await Speech.getAvailableVoicesAsync().catch(() => []);
      const sorted = (vs || []).sort((a: any, b: any) =>
        String(a.language).localeCompare(String(b.language)),
      );
      setVoices(sorted as V[]);
      if (sorted && sorted.length > 0) setVoiceId(sorted[0].identifier);
    })();
    return () => {
      Speech.stop();
    };
  }, []);

  const current = useMemo(() => AFFIRMATIONS[i], [i]);

  const speak = async () => {
    if (!current) return;
    speakingRef.current = true;
    setPlaying(true);
    Speech.stop();
    Speech.speak(current, {
      voice: voiceId || undefined,
      rate: 1.0,
      pitch: 1.0,
      onDone: () => {
        speakingRef.current = false;
        setPlaying(false);
      },
    });
  };

  const toggle = async () => {
    if (playing) {
      Speech.stop();
      speakingRef.current = false;
      setPlaying(false);
    } else await speak();
  };

  const next = async () => {
    Speech.stop();
    const ni = (i + 1) % AFFIRMATIONS.length;
    setI(ni);
    setTimeout(() => {
      speak();
    }, 100);
  };

  const prev = async () => {
    Speech.stop();
    const pi = (i - 1 + AFFIRMATIONS.length) % AFFIRMATIONS.length;
    setI(pi);
    setTimeout(() => {
      speak();
    }, 100);
  };

  return (
    <View variant="bg" style={s.wrap}>
      <Pressable style={s.select} onPress={() => setOpen((v) => !v)}>
        <Text style={s.selectT}>
          {voices.find((v) => v.identifier === voiceId)?.name || "Choose Voice"}
        </Text>
      </Pressable>
      {open && (
        <View style={s.menu}>
          {voices.map((v) => (
            <Pressable
              key={v.identifier}
              style={s.item}
              onPress={() => {
                setVoiceId(v.identifier);
                setOpen(false);
              }}
            >
              <Text style={s.itemT}>
                {v.name || v.identifier} ({v.language})
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.text}>{current}</Text>
      </View>
      <View style={s.row}>
        <Pressable style={s.btn} onPress={prev}>
          <Text style={s.btnT}>Prev</Text>
        </Pressable>
        <Pressable style={s.btn} onPress={toggle}>
          <Text style={s.btnT}>{playing ? "Pause" : "Play"}</Text>
        </Pressable>
        <Pressable style={s.btn} onPress={next}>
          <Text style={s.btnT}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 14, alignItems: "center" },
  select: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#111",
  },
  selectT: { color: "#0ff", fontWeight: "800" },
  menu: {
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    backgroundColor: "#111",
    padding: 6,
    marginTop: 6,
    maxHeight: 220,
  },
  item: { padding: 8, borderRadius: 8 },
  itemT: { color: "#cfe6ff" },
  card: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#0ff",
    borderRadius: 12,
    backgroundColor: "#111",
    padding: 14,
    width: 320,
  },
  text: { color: "#cfe6ff", fontSize: 16, textAlign: "center" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
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
