import React, { useCallback } from "react";
import { View, Text, StyleSheet, Image, Pressable, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
function GlowButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.btnWrap}>
      <LinearGradient colors={["#22d3ee33", "#22d3ee00"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.btnGlow}/>
      <Pressable onPress={onPress} style={styles.btnPress}>
        <LinearGradient colors={["#22d3ee", "#06b6d4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGrad}>
          <Text style={styles.btnText}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
export default function Landing() {
  const router = useRouter();
  const goLearn = useCallback(() => router.push("/ask"), [router]);
  const goLogin = useCallback(() => router.push("/login"), [router]);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.logoWrap}>
        <Image source={require("../assets/logo.png")} resizeMode="contain" style={styles.logo} onError={() => {}} />
      </View>
      <View style={styles.ctaRow}>
        <GlowButton label="Let’s Learn" onPress={goLearn} />
        <GlowButton label="Log In" onPress={goLogin} />
      </View>
      <Text style={styles.footer}>Nova</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000008", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  logoWrap: { width: "100%", alignItems: "center", justifyContent: "center", flexGrow: 1 },
  logo: { width: "90%", height: undefined, aspectRatio: 1 },
  ctaRow: { width: "100%", gap: 14, paddingBottom: 36 },
  btnWrap: { borderRadius: 16, overflow: "visible" },
  btnGlow: { position: "absolute", left: -8, right: -8, top: -8, bottom: -8, borderRadius: 20, ...(Platform.OS==="ios"? { shadowColor: "#22d3ee", shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }: {}) },
  btnPress: { borderRadius: 16 },
  btnGrad: { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#67e8f9" },
  btnText: { color: "#001318", fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  footer: { position: "absolute", top: 52, left: 20, color: "#22d3ee", fontWeight: "800", letterSpacing: 2, opacity: 0.7 }
});
