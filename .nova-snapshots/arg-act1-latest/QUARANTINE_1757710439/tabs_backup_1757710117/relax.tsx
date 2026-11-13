import React, { useEffect } from "react";
import { useThemeColors } from "@/providers/ThemeBridge";
import { View, Text, Pressable } from "react-native";
import {
  awardRelaxOpened,
  awardBreathingSession,
  awardGroundingSession,
} from "../_lib/hooks/useNovaAchievements";
export default function Relax() {
  const palette = useThemeColors();
  useEffect(() => {
    awardRelaxOpened();
  }, []);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        padding: 16,
        paddingTop: 60,
      }}
    >
      <Text
        style={{
          color: "#e5e7eb",
          fontSize: 24,
          fontWeight: "800",
          marginBottom: 16,
        }}
      >
        Relax
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => awardBreathingSession()}
          style={{ backgroundColor: "#34d399", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Breathing Done
          </Text>
        </Pressable>
        <Pressable
          onPress={() => awardGroundingSession()}
          style={{ backgroundColor: "#f59e0b", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Grounding Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
