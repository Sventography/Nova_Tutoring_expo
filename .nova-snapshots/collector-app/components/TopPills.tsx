// app/components/TopPills.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";

export default function TopPills() {
  const router = useRouter();
  // expected fields; fallbacks keep it safe
  const { username = "Guest", avatarUri, coins = 0 } = useUser() as any;

  return (
    <View style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 50 }}>
      {/* left: user pill */}
      <TouchableOpacity
        onPress={() => router.push("/account/profile")}
        style={{
          position: "absolute",
          left: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "rgba(0,229,255,0.12)",
          borderColor: "#00e5ff",
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 22, height: 22, borderRadius: 11 }} />
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#00e5ff", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#00131a", fontWeight: "800", fontSize: 12 }}>{(username || "G").slice(0,1).toUpperCase()}</Text>
          </View>
        )}
        <Text style={{ color: "#e6fcff", fontWeight: "800" }}>{username || "Guest"}</Text>
      </TouchableOpacity>

      {/* right: coin pill */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/shop")}
        style={{
          position: "absolute",
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "rgba(0,229,255,0.12)",
          borderColor: "#00e5ff",
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: "#e6fcff", fontWeight: "800" }}>⭑ {coins}</Text>
      </TouchableOpacity>
    </View>
  );
}

