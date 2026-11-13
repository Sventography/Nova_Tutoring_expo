import React, { useEffect } from "react";
import { useThemeColors } from "@/providers/ThemeBridge";
import { View, Text } from "react-native";
import { awardHistoryOpen } from "../_lib/hooks/useNovaAchievements";
export default function History() {
  const palette = useThemeColors();
  useEffect(() => {
    awardHistoryOpen();
  }, []);
  return (
    <View
      variant="bg"
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        padding: 16,
        paddingTop: 60,
      }}
    >
      <Text
        tone="text"
        style={{ color: "#e5e7eb", fontSize: 24, fontWeight: "800" }}
      >
        History
      </Text>
      <Text style={{ color: "#9ca3af", marginTop: 8 }}>
        Your quiz runs, scores, and milestones appear here.
      </Text>
    </View>
  );
}
