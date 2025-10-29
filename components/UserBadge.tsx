// app/components/UserBadge.tsx
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** Try to load the bunny from app/assets first, then fall back to root/assets. */
let AVATAR: any = null;
try {
  // correct path from app/components → app/assets
  AVATAR = require("../assets/shop/nova_bunny_front.png");
} catch {
  try {
    // fallback if you only have root-level assets/
    AVATAR = require("../assets/shop/nova_bunny_front.png");
  } catch {
    AVATAR = null;
  }
}

/** Safe username reader — works even if provider shape differs or is missing. */
function useUsername(): string {
  try {
    const mod = require("../_providers/UserProvider");
    const useUser = mod?.useUser ?? mod?.useAuth ?? null;
    if (typeof useUser === "function") {
      const u = useUser();
      return String(u?.username ?? u?.name ?? u?.displayName ?? "Guest");
    }
  } catch {}
  // legacy shim (if our earlier context shim is present)
  try {
    const m2 = require("../../context/UserContext");
    const useUserContext = m2?.useUserContext ?? null;
    if (typeof useUserContext === "function") {
      const u = useUserContext();
      return String(u?.username ?? u?.name ?? u?.displayName ?? "Guest");
    }
  } catch {}
  return "Guest";
}

export default function UserBadge({ compact = false }: { compact?: boolean }) {
  const username = useUsername();

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {AVATAR ? (
        <Image source={AVATAR} style={styles.avatar} />
      ) : (
        <View style={styles.fallbackAvatar}>
          <MaterialCommunityIcons name="account-circle" size={20} color="#9BB7C9" />
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {username}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 209, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(0, 209, 255, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 4 },
  avatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  fallbackAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  name: { color: "#CFEAF7", fontWeight: "700", maxWidth: 140 },
});
