import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { Audio } from "expo-av";
import { useTheme } from "../../app/context/ThemeContext";

const ocean = require("../../assets/sounds/ocean.mp3");

export default function ShoreAmbience() {
  const { tokens } = useTheme();
  const pending = useRef(0);
  const current = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<"off" | "loading" | "on" | "error">("off");

  const stop = useCallback(() => {
    pending.current++;
    const sound = current.current;
    current.current = null;
    if (sound) void sound.unloadAsync().catch(() => {});
    setState("off");
  }, []);

  useFocusEffect(useCallback(() => stop, [stop]));

  async function toggle() {
    if (state === "on" || state === "loading") {
      stop();
      return;
    }
    const request = ++pending.current;
    setState("loading");
    try {
      const { sound } = await Audio.Sound.createAsync(ocean, { volume: 0.2, isLooping: true });
      if (request !== pending.current) {
        await sound.unloadAsync();
        return;
      }
      current.current = sound;
      await sound.playAsync();
      if (request === pending.current) setState("on");
    } catch {
      if (request === pending.current) {
        stop();
        setState("error");
      }
    }
  }

  const label = state === "on" ? "Mute shore waves" : state === "loading"
    ? "Cancel shore audio" : state === "error" ? "Retry shore waves" : "Listen to shore waves";
  return (
    <Pressable accessibilityRole="button" onPress={toggle} style={{minHeight:44, justifyContent:"center"}}>
      <Text style={{color:tokens.text}}>{label}</Text>
    </Pressable>
  );
}
