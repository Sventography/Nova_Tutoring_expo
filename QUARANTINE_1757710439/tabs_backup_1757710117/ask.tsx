import React, { useState } from "react";
import { useThemeColors } from "@/providers/ThemeBridge";
import { View, Text, TextInput, Pressable } from "react-native";
import {
  awardAskQuestion,
  awardVoiceUsed,
} from "../_lib/hooks/useNovaAchievements";
export default function Ask() {
  const palette = useThemeColors();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      await awardAskQuestion();
      setAnswer("Nova is thinking… then answers beautifully.");
    } finally {
      setBusy(false);
      setQ("");
    }
  }
  async function onVoice() {
    await awardVoiceUsed();
    setQ("Voice captured question");
  }
  return (
    <View
      variant="bg"
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        padding: 16,
        paddingTop: 60,
      }}
    >
      <Text
        tone="text"
        style={{
          color: "#e5e7eb",
          fontSize: 24,
          fontWeight: "800",
          marginBottom: 16,
        }}
      >
        Ask
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Ask anything…"
        placeholderTextColor="#7d7d92"
        style={{
          backgroundColor: "#151522",
          borderWidth: 1,
          borderColor: "#2a2a3a",
          borderRadius: 12,
          color: "white",
          padding: 12,
          marginBottom: 12,
        }}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={send}
          disabled={busy}
          style={{
            backgroundColor: busy ? "#2a2a3a" : "#6d57ff",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {busy ? "…" : "Send"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onVoice}
          style={{ backgroundColor: "#0ea5e9", padding: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Voice</Text>
        </Pressable>
      </View>
      {!!answer && (
        <Text style={{ color: "#c7d2fe", marginTop: 16 }}>{answer}</Text>
      )}
    </View>
  );
}
