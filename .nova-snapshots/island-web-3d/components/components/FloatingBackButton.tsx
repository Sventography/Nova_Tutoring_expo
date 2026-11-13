import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function FloatingBackButton({
  to = "/(tabs)/index",
}: {
  to?: string;
}) {
  const router = useRouter();
  async function go() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (to) router.push(to);
    else router.back();
  }
  return (
    <View style={{ position: "absolute", bottom: 24, left: 18 }}>
      <Pressable
        onPress={go}
        style={{
          backgroundColor: "#0b0f14",
          borderColor: "#38bdf8",
          borderWidth: 2,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>
          ‹ Back to Topics
        </Text>
      </Pressable>
    </View>
  );
}
