import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import CoinPill from "./CoinPill";
import { getUserProfile, type UserProfile } from "../lib/user";

export default function AppHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ username: "Nova" });

  useEffect(() => { getUserProfile().then(setProfile); }, []);
  const canGoBack = (nav as any)?.canGoBack?.() ?? false;

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={s.row}>
        <View style={s.left}>
          {canGoBack && (
            <TouchableOpacity onPress={() => router.back()} style={s.back}>
              <Text style={s.backTxt}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={s.avatarWrap}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.initials}>{(profile.username||"N").slice(0,1).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={s.user} numberOfLines={1}>{profile.username}</Text>
        </View>
        <CoinPill />
      </View>
      {!!title && <Text style={s.title}>{title}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: "#071018", paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  back: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", marginRight: 4 },
  backTxt: { color: "#eaffff", fontSize: 18, fontWeight: "900", lineHeight: 18 },
  avatarWrap: { width: 32, height: 32 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: "rgba(0,229,255,0.12)", alignItems: "center", justifyContent: "center",
    borderWidth: 1.2, borderColor: "rgba(0,229,255,0.35)" },
  initials: { color: "#9fe6ff", fontWeight: "900" },
  user: { color: "#eaffff", fontWeight: "900", maxWidth: 160 },
  title: { color: "#9fe6ff", fontWeight: "800", marginTop: 6 }
});
