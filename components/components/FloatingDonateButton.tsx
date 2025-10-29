import React, { useEffect } from "react";
// app/components/FloatingDonateButton.tsx
import bus from "../lib/bus";
import { useThemeColors } from "../providers/ThemeBridge";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";

export const FloatingDonateButton: React.FC<{ href?: string }> = ({
  href = "/donate",
}) => {
  return (
    <View
      variant="bg"
      style={{
        position: "absolute",
        right: 16,
        bottom: 20,
      }}
    >
      <Link href={href} asChild>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={({ pressed }) => ({
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.accent,
            backgroundColor: pressed ? "#07131d" : "#06121a",
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          })}
        >
          <Text style={{ color: "#a5f3fc", fontWeight: "800" }}>Donate</Text>
        </Pressable>
      </Link>
    </View>
  );
};
