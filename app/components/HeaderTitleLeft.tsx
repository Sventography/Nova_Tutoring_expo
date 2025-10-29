import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useUser } from "../context/UserContext";

export default function HeaderTitleLeft() {
  // handle cases where context or user might be null during boot
  let username = "Student";
  let avatar: any = null;

  try {
    const uctx: any = useUser?.() ?? null;
    username = uctx?.user?.name ?? "Student";
    avatar = uctx?.user?.avatar ?? null;
  } catch {
    // leave defaults
  }

  return (
    <View style={S.container}>
      {avatar ? <Image source={{ uri: avatar }} style={S.avatar} /> : <View style={S.avatarFallback} />}
      <Text style={S.title}>Nova Student</Text>
      <Text style={S.subtitle}>{username}</Text>
    </View>
  );
}

export const S = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  avatarFallback: {
    width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: "#333",
  },
  title: { color: "#fff", fontWeight: "700", marginRight: 6 },
  subtitle: { color: "#0ff", fontWeight: "600" },
});
