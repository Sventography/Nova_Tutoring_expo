import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

type Track = { id: string; title: string; source: any };

const TRACKS: Track[] = [
  { id: "calm",      title: "Calm",      source: require("app/assets/sounds/calm.mp3") },
  { id: "ocean",     title: "Ocean",     source: require("app/assets/sounds/ocean.mp3") },
  { id: "fireplace", title: "Fireplace", source: require("app/assets/sounds/fireplace.mp3") },
  { id: "rain",      title: "Rain",      source: require("app/assets/sounds/rain.mp3") },
];

export default function SoundBar() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      }).catch(() => {});
    })();
    return () => { stopAll(); };
  }, []);

  async function stopAll() {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    } finally {
      setCurrent(null);
    }
  }

  async function toggle(track: Track) {
    if (loading) return;
    setLoading(true);
    try {
      if (current === track.id) {
        await stopAll();
        return;
      }
      await stopAll();
      const sound = new Audio.Sound();
      await sound.loadAsync(track.source, { shouldPlay: true, isLooping: true });
      soundRef.current = sound;
      setCurrent(track.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
      {TRACKS.map(t => (
        <Pressable
          key={t.id}
          onPress={() => toggle(t)}
          style={({ pressed }) => ({
            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#fff", backgroundColor: "#ffffff",
            borderWidth: 1, borderColor: current === t.id ? "#00e5ff" : "#00e5ff",
            opacity: pressed ? 0.7 : 1
          })}
        >
          <Text style={{ color: current === t.id ? "#111111" : "#222222", fontWeight: "600" }}>
            {current === t.id ? `Stop ${t.title}` : `Play ${t.title}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
