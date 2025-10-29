import React, { useState } from "react";
import GradientScreen from "../components/GradientScreen";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";

const API = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5055";

export default function Ask() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onAsk() {
    setLoading(true);
    setAnswer("");
    setError("");
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }), // <-- matches Flask
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnswer(data?.answer ?? "No response.");
    } catch (e: any) {
      setError(`Failed to fetch: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientScreen>
      <View style={styles.page}>
        <View style={styles.answerBox}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.answerText}>
              {answer ? answer : (error ? error : "Your answer will appear here...")}
            </Text>
          )}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask Nova anything..."
            placeholderTextColor="rgba(207,232,239,0.6)"
            value={q}
            onChangeText={setQ}
          />
          <Pressable style={[styles.btn, (!q.trim() || loading) && styles.btnDisabled]} onPress={onAsk} disabled={!q.trim() || loading}>
            <Text style={styles.btnText}>{loading ? "…" : "Ask"}</Text>
          </Pressable>
        </View>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "flex-end", padding: 16, gap: 12 },
  answerBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 14,
  },
  answerText: { color: "#cfe8ef" },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#cfe8ef",
    backgroundColor: "rgba(3,25,36,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  btn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#56cfe1",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: "800", color: "#03252e" },
});
