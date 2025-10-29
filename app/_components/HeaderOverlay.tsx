import React from "react";
import { View, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../_providers/AuthProvider";

export default function HeaderOverlay() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const name = user?.username || "Guest";
  const coins = user?.coins ?? 0;
  const avatar = user?.avatar_url || "";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        zIndex: 200,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: "#0a0e19",
          borderWidth: 1,
          borderColor: "#06b6d4",
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={{ width: 20, height: 20, borderRadius: 999 }} />
        ) : (
          <Text style={{ fontSize: 16 }}>👤</Text>
        )}
        <Text style={{ color: "#a5b4fc", fontWeight: "700" }}>{name}</Text>
      </View>

      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: "#0a0e19",
          borderWidth: 1,
          borderColor: "#06b6d4",
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16 }}>🪙</Text>
        <Text style={{ color: "#67e8f9", fontWeight: "800" }}>{coins}</Text>
      </View>
    </View>
  );
}

