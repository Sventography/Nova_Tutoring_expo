import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { createCertificate } from "../utils/certificates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USER_STORAGE_KEY } from "../context/UserContext";
import { useRouter } from "expo-router";

export default function DevTestCertificate() {
  const router = useRouter();

  async function makeOne() {
    let name = "Student";
    try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const u = raw ? JSON.parse(raw) : null;
      name = u?.username || u?.name || "Student";
    } catch {}

    const quizTitle = "DEV TEST — Algebra I";
    const scorePct = 95;

    await createCertificate({ name, quizTitle, scorePct });
    router.push("/certificates");
  }

  return (
    <View style={S.wrap}>
      <Text style={S.h1}>Dev Test</Text>
      <Text style={S.p}>Creates a real certificate record, then opens Certificates tab.</Text>

      <Pressable onPress={makeOne} style={S.btn}>
        <Text style={S.btnText}>Create Test Certificate</Text>
      </Pressable>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { flex: 1, padding: 18, justifyContent: "center" },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  p: { fontSize: 14, opacity: 0.8, marginBottom: 14 },
  btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#111", alignSelf: "flex-start" },
  btnText: { color: "white", fontWeight: "700" },
});
