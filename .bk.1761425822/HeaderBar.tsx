import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated, Share, DeviceEventEmitter } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFx } from "../context/FxProvider";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import StreakPill from "./StreakPill";

const DEFAULT_AVATAR = require("../assets/shop/nova_bunny_front.png");

export default function HeaderBar() {
  const router = useRouter();
  const coinsCtx = (() => { try { return useCoins(); } catch { return {} as any; } })() as any;
  const { user } = useUser();

  const coins = Number(coinsCtx?.coins ?? coinsCtx?.balance ?? 0);
  const [streak, setStreak] = useState<number>(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("streak:update", ({ days }) => setStreak(days ?? 0));
    return () => sub.remove();
  }, []);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });

  const displayName = (user?.username ?? (user as any)?.name ?? "Guest") as string;
  const storedAvatar = (user?.avatarUri ?? (user as any)?.avatar ?? (user as any)?.avatarUrl ?? "") as string;

  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => { setAvatarError(false); setAvatarVersion(v => v + 1); }, [storedAvatar]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("USER_CHANGED", () => setAvatarVersion(v => v + 1));
    return () => sub.remove();
  }, []);

  const isHttp = /^https?:/i.test(storedAvatar);
  const avatarUri = storedAvatar
    ? (isHttp ? `${storedAvatar}${storedAvatar.includes("?") ? "&" : "?"}v=${avatarVersion}` : storedAvatar)
    : "";
  const avatarSource = !avatarError && avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR;

  async function onShare() {
    try {
      await Share.share({
        message: "Check out Nova Tutoring — learn, quiz, shop, and collect rewards!",
        url: "https://novatutoring-eoq65leh2-contactnovatutoring-8350s-projects.vercel.app",
        title: "Nova Tutoring",
      });
    } catch {}
  }
  function onDonate() { Linking.openURL("https://buymeacoffee.com/sventography"); }

  return (
    <View style={S.wrap}>
      <LinearGradient colors={["#000000", "#0c1830"]} style={S.container}>
        <View style={S.left}>
          <Pressable onPress={() => router.push("/(tabs)/account")} style={S.avatarWrap} hitSlop={8}>
            <Image
              key={avatarVersion}
              source={avatarSource}
              onError={() => setAvatarError(true)}
              style={S.avatar}
            />
            <Text style={S.username}>{displayName}</Text>
          </Pressable>

          <View style={S.coinPill}>
            {(() => {
              try { return <Image source={require("../assets/coin.png")} style={S.coinIcon} />; }
              catch { try { return <Image source={require("../../assets/coin.png")} style={S.coinIcon} />; }
              catch { return <Ionicons name="sparkles" size={16} color="#00e5ff" style={{ marginRight: 6 }} />; } }
            })()}
            <Text style={S.coinText}>{coins}</Text>
          </View>
        </View>

        <View style={S.right}>
          {(() => { const { enabled, toggle } = useFx(); return (
            <Pressable onPress={toggle} hitSlop={8} style={({pressed})=>[S.fxBtn,pressed?{opacity:0.85}:null]}>
              <Ionicons name={enabled? "sparkles" : "sparkles-outline"} size={18} color={enabled? "#00e5ff" : "#cfeff6"} />
            </Pressable>
          ); })()}

          <Pressable onPress={onShare} hitSlop={8} style={({ pressed }) => [S.shareBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="share-outline" size={18} color="#cfeff6" />
          </Pressable>

          <Animated.View style={[S.donateWrap, { transform: [{ scale }], shadowOpacity: glow as any }]}>
            <Pressable onPress={onDonate} hitSlop={10} style={({ pressed }) => [S.donateBtn, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={["#0b2a5a", "#000000"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.donateGrad}>
                <Ionicons name="heart" size={16} color="#66e0ff" />
                <Text style={S.donateText}>Donate</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        <StreakPill />
      </View>
      </LinearGradient>
      <View style={S.divider} />
    </View>
  );
}

export const S = StyleSheet.create({
  fxBtn:{height:32,minWidth:36,paddingHorizontal:10,borderRadius:16,backgroundColor:"rgba(0,0,0,0.6)",borderWidth:1,borderColor:"rgba(0,229,255,0.5)",alignItems:"center",justifyContent:"center",marginRight:8},
  wrap: { width: "100%", backgroundColor: "#000" },
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  left: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  username: { color: "#ffffff", fontWeight: "600", marginRight: 6 },
  coinPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  coinIcon: { width: 16, height: 16, marginRight: 6, resizeMode: "contain" },
  coinText: { color: "#00e5ff", fontWeight: "700" },
  right: { flexDirection:"row", alignItems:"center", justifyContent:"flex-end" },
  shareBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 6, marginLeft: 8 },
  donateWrap: { shadowColor: "#66e0ff", shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, borderRadius: 18, marginLeft: 8 },
  donateBtn: { borderRadius: 18, overflow: "hidden" },
  donateGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: "rgba(102,224,255,0.5)" },
  donateText: { color: "#cfeff6", fontWeight: "700", marginLeft: 6 },
  divider: { height: 2, backgroundColor: "#00e5ff", width: "100%" },});