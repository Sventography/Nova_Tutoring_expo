import React from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompanion } from "../context/CompanionContext";
import { COMPANION_ASSETS } from "../assets/companions/manifest";

export default function CompanionOverlay() {
  const { equippedCompanionId } = useCompanion();
  const insets = useSafeAreaInsets();

  if (!equippedCompanionId) return null;

  const src = (COMPANION_ASSETS as any)[equippedCompanionId];
  if (!src) return null;

  // tuck it under the header area (adjust if you want)
  const top = (Platform.OS === "web" ? 72 : (insets.top ?? 0) + 64);

  return (
    <View pointerEvents="none" style={[S.wrap, { top }]}>
      <Image source={src} style={S.img} resizeMode="contain" />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { position: "absolute", right: 12, zIndex: 950 },
  img: { width: 92, height: 92, opacity: 0.98 },
});
