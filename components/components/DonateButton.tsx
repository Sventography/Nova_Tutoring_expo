// app/components/DonateButton.tsx
import React from "react";
import { Pressable, Text, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";

const HIDE_SEGMENTS = ["ask", "brainteasers", "relax"];

export default function DonateButton() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname() || "";

  const hide = HIDE_SEGMENTS.some((seg) => pathname.includes(`/${seg}`));
  if (hide) return null;

  const open = () => Linking.openURL("https://buymeacoffe.com/sventography");

  return (
    <Pressable
      onPress={open}
      style={{
        position: "absolute",
        right: 12,
        bottom: Math.max(12, insets.bottom + 12),
        zIndex: 999,
      }}
      accessibilityRole="button"
      accessibilityLabel="Donate"
    >
      <LinearGradient
        colors={["#ffb6c1", "#ff8fb3", "#ffe6f2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <Text style={{ color: "#1a1033", fontWeight: "900", letterSpacing: 0.8 }}>
          DONATE ❤️
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
