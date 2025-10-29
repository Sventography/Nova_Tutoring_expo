import React, { useState } from "react";
import { View, Text, TextInput, Pressable, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { API } from "./_lib/config";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    setMsg(null);
    if (!token.trim() || !password.trim() || !confirm.trim()) {
      setErr("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API.auth}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password, confirm }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      setMsg("Password updated. You can log in now.");
      setToken("");
      setPassword("");
      setConfirm("");
    } catch (e: any) {
      setErr(e?.message || "Network error");
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
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: "#e6f7fb", fontSize: 20, fontWeight: "800" }}>Reset Password</Text>

          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Reset token"
            placeholderTextColor="#94a3b8"
            style={{
              color: "#e6f7fb",
              borderWidth: 1,
              borderColor: "#06b6d4",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            autoCapitalize="none"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={{
              color: "#e6f7fb",
              borderWidth: 1,
              borderColor: "#06b6d4",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />

          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm new password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={{
              color: "#e6f7fb",
              borderWidth: 1,
              borderColor: "#06b6d4",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={{
              marginTop: 6,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: loading ? "rgba(6,182,212,0.6)" : "#06b6d4",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800" }}>Update Password</Text>
            )}
          </Pressable>

          {err ? <Text style={{ color: "#fca5a5" }}>{err}</Text> : null}
          {msg ? <Text style={{ color: "#86efac" }}>{msg}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
