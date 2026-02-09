// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useUser } from "../context/UserContext";

export default function AccountLogin() {
  const router = useRouter();
  const {
    signUpWithEmailPassword,
    loginWithEmailPassword,
    setUsername,
  } = useUser();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsernameInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // ignore
      }
    }
  };

  const goAccount = () => {
    // After successful auth, always jump into the account tab
    router.replace("/(tabs)/account");
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    await hapticTap();

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedUsername = username.trim();

      if (!trimmedEmail || !trimmedPassword) {
        throw new Error("Please enter both email and password.");
      }

      if (mode === "signup") {
        if (!trimmedUsername) {
          throw new Error("Please choose a username to sign up.");
        }

        // Create a new Supabase user + profile
        await signUpWithEmailPassword(
          trimmedUsername,
          trimmedEmail,
          trimmedPassword
        );

        // Extra safety: ensure username is set in the local profile too
        await setUsername(trimmedUsername);

        Alert.alert(
          "Welcome 🎉",
          "Your account has been created and you’re now signed in."
        );
        goAccount();
      } else {
        // Login mode
        await loginWithEmailPassword(trimmedEmail, trimmedPassword);

        // If they typed a username here, treat it as "update my display name"
        if (trimmedUsername) {
          await setUsername(trimmedUsername);
        }

        goAccount();
      }
    } catch (e: any) {
      console.warn("[login screen] submit error:", e);
      Alert.alert(
        "Authentication error",
        e?.message ? String(e.message) : "Could not sign in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = async () => {
    await hapticTap();
    setMode((m) => (m === "login" ? "signup" : "login"));
  };

  const isSignup = mode === "signup";
  const title = isSignup ? "Create Your Account" : "Log In";
  const primaryLabel = busy
    ? "Please wait…"
    : isSignup
    ? "Sign Up"
    : "Sign In";
  const toggleLabel = isSignup
    ? "Already have an account? Log In"
    : "New here? Sign Up";

  return (
    <LinearGradient
      colors={["#050816", "#050816", "#020b14"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {isSignup
                ? "Pick a username, then sign up with your email and password."
                : "Log in with your email and password. You can also set a username here."}
            </Text>

            {/* Username (used for header + profile name) */}
            <Text style={styles.label}>
              Username {isSignup ? "" : "(optional)"}
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsernameInput}
              placeholder="NovaStudent"
              placeholderTextColor="#7d7d92"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#7d7d92"
              style={styles.input}
              keyboardType={
                Platform.OS === "web" ? "default" : "email-address"
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#7d7d92"
              style={styles.input}
              secureTextEntry
            />

            {/* Primary submit button */}
            <Pressable
              onPress={submit}
              disabled={busy}
              style={[
                styles.button,
                { opacity: busy ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>{primaryLabel}</Text>
            </Pressable>

            {/* Toggle between login / signup */}
            <Pressable
              onPress={toggleMode}
              disabled={busy}
              style={styles.modeToggle}
            >
              <Text style={styles.modeToggleText}>{toggleLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: "rgba(5, 10, 24, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#a0aec0",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    color: "#cbd5f5",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#151522",
    borderWidth: 1,
    borderColor: "#2a2a3a",
    borderRadius: 12,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#6d57ff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  modeToggle: {
    marginTop: 14,
    alignItems: "center",
  },
  modeToggleText: {
    color: "#9ad8ff",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
