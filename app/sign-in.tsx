// app/sign-in.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useUser } from "./context/UserContext";

type Mode = "login" | "signup";

export default function SignInScreen() {
  const router = useRouter();
  const user = (useUser() || {}) as any;

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const haptic = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  };

  const submit = async () => {
    await haptic();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup") {
      if (!username) {
        setError("Username is required.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await user.login(email.trim(), password);
      } else {
        await user.signup({
          username: username.trim(),
          email: email.trim(),
          password,
        });
      }

      // Success → go to Account
      router.replace("/(tabs)/account");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          {mode === "login" ? "Log In" : "Create Account"}
        </Text>

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setMode("login")}>
            <Text
              style={[
                styles.toggle,
                mode === "login" && styles.toggleActive,
              ]}
            >
              Log In
            </Text>
          </Pressable>
          <Pressable onPress={() => setMode("signup")}>
            <Text
              style={[
                styles.toggle,
                mode === "signup" && styles.toggleActive,
              ]}
            >
              Sign Up
            </Text>
          </Pressable>
        </View>

        {mode === "signup" && (
          <TextInput
            placeholder="Username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        {mode === "signup" && (
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#666"
            value={confirm}
            onChangeText={setConfirm}
            style={styles.input}
            secureTextEntry
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={submit} disabled={loading}>
          <LinearGradient
            colors={["#00e5ff", "#66b2ff", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submit}
          >
            <Text style={styles.submitText}>
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Log In"
                : "Create Account"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#050b12",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.25)",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 20,
  },
  toggle: {
    color: "#777",
    fontSize: 15,
    fontWeight: "700",
  },
  toggleActive: {
    color: "#00e5ff",
  },
  input: {
    backgroundColor: "#0b2030",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    marginBottom: 12,
  },
  submit: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 8,
    textAlign: "center",
  },
});
