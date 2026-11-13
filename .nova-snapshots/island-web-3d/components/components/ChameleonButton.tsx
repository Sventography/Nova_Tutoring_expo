import React, { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
export default function ChameleonButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const palettes = [
    ["#ff0033", "#ff9900"],
    ["#ff9900", "#ffee00"],
    ["#ffee00", "#ff0033"],
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % palettes.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 14, overflow: "hidden" }}
    >
      <LinearGradient
        colors={palettes[i]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 }}
      >
        <Text
          style={{
            color: "#000",
            fontWeight: "800",
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
