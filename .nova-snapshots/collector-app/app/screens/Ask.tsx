import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { API } from "../_lib/config";

const INPUT_H = 56;

function ThinkingBadge() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 500, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Animated.Text style={{ color: "#67e8f9", opacity, fontWeight: "700" }}>
      Nova is thinking…
    </Animated.Text>
  );
}

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false); // UI only for now

  async function onAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const r = await fetch(API.ask, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!r.ok) {
        const msg = (await r.text()) || `HTTP ${r.status}`;
        throw new Error(msg);
      }
      const data = await r.json();
      const a = data?.answer || "";
      setAnswer(a || "No answer returned.");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0f1a" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        {/* Response area */}
        <View
          style={{
            flex: 1,
            padding: 12,
            paddingBottom: 12 + INPUT_H + 12,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#06b6d4",
              backgroundColor: "#0a0e19",
              padding: 14,
            }}
          >
            {loading ? (
              <View style={{ gap: 10 }}>
                <ThinkingBadge />
                <ActivityIndicator />
              </View>
            ) : error ? (
              <Text style={{ color: "#fca5a5" }}>{error}</Text>
            ) : answer ? (
              <Text selectable style={{ color: "#e5e7eb", lineHeight: 20 }}>
                {answer}
              </Text>
            ) : (
              <Text style={{ color: "#94a3b8" }}>
                Ask me anything — math, science, writing…
              </Text>
            )}
          </View>
        </View>

        {/* Ask bar (floating at bottom) */}
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            height: INPUT_H,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              height: "100%",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#06b6d4",
              backgroundColor: "#0a0e19",
              paddingHorizontal: 12,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Type your question…"
              placeholderTextColor="#94a3b8"
              style={{ color: "white", fontSize: 16 }}
              returnKeyType="send"
              onSubmitEditing={onAsk}
            />
          </View>

          {/* Voice toggle (visual only for now) */}
          <Pressable
            onPress={() => setVoiceOn(v => !v)}
            style={{
              height: "100%",
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: voiceOn ? "rgba(178,102,255,0.7)" : "rgba(0,229,255,0.9)",
              backgroundColor: voiceOn ? "rgba(178,102,255,0.15)" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#e6f7fb", fontWeight: "800" }}>
              🎤 Voice
            </Text>
          </Pressable>

          <Pressable
            onPress={onAsk}
            disabled={loading}
            style={{
              height: "100%",
              paddingHorizontal: 18,
              borderRadius: 14,
              backgroundColor: loading ? "rgba(6,182,212,0.6)" : "#06b6d4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Ask</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
