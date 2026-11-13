import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";

function useUserSafe() {
  try {
    const mod = require("../app/context/UserContext");
    const hook = mod.useUser || mod.useProfile || mod.useAuth;
    const u = hook?.();
    if (u?.name || u?.username || u?.avatar) return {
      name: u.name || u.username || "Student",
      avatar: u.avatar || null,
    };
  } catch {}
  return {
    name: "Student",
    avatar: require("../app/assets/shop/avatar_nova.png"),
  };
}

export default function HeaderUser() {
  const router = useRouter();
  const { name, avatar } = useUserSafe();

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/account")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 8,
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel="Open account"
    >
      {avatar ? (
        <Image
          source={avatar}
          style={{ width: 24, height: 24, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}
        />
      ) : null}
      <Text style={{ color: "#cfeaf0", fontWeight: "700" }} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}
