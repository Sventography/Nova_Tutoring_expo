import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";

export default function CoinPill() {
  const { coins } = useUser();
  const router = useRouter();
  const goProfile = () => router.push("/(tabs)/account?focus=profile");

  return (
    <TouchableOpacity onPress={goProfile} accessibilityRole="button">
      <View style={{
        backgroundColor: "rgba(0, 255, 255, 0.12)",
        borderColor: "#00e5ff", borderWidth: 1,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999, shadowColor: "#00e5ff",
        shadowOpacity: 0.5, shadowRadius: 8
      }}>
        <Text style={{ color: "#baf8ff", fontWeight: "700" }}>⭑ {coins} coins</Text>
      </View>
    </TouchableOpacity>
  );
}
