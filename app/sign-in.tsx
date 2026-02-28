// app/sign-in.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";
import { showToast } from "./utils/toast";

const DISCORD_INVITE_URL = "https://discord.gg/NR9PAjtrg";

export default function SignInScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { signUpWithEmailPassword, loginWithEmailPassword } =
    (useUser() || {}) as any;

  const [mode, setMode] = useState<"signup" | "login">("signup");

  // sign up fields
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirmPassword, setSuConfirmPassword] = useState("");

  // login fields
  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  };

  const goToMainTabs = () => {
    try {
      router.replace("/(tabs)/ask");
    } catch {
      router.replace("/");
    }
  };

  const handleSwitchMode = async (next: "signup" | "login") => {
    if (next === mode || loading) return;
    await hapticTap();
    setMode(next);
  };

  const handleSignUp = async () => {
    if (loading) return;

    const username = suUsername.trim();
    const email = suEmail.trim().toLowerCase();
    const password = suPassword;
    const confirmPassword = suConfirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill out all fields.");
      return;
    }

    if (username.length > 8) {
      Alert.alert(
        "Username too long",
        "Usernames can be up to 8 characters long."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Please use a password with at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Make sure your password and confirm password are the same."
      );
      return;
    }

    setLoading(true);
    try {
      await hapticTap();
      await signUpWithEmailPassword(username, email, password);
      await new Promise((resolve) => setTimeout(resolve, 150));

      showToast("Account created! You’re signed in.");
      goToMainTabs();
    } catch (e: any) {
      console.log("signUp error:", e);
      const code = e?.code || "";
      const msg = e?.message ? String(e.message) : String(e ?? "");

      if (
        code === "USERNAME_TAKEN" ||
        msg.toLowerCase().includes("already taken")
      ) {
        Alert.alert(
          "Username already taken",
          "That username is already taken. Please choose another."
        );
      } else if (
        code === "over_email_send_rate_limit" ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("rate-limit") ||
        msg.toLowerCase().includes("too many") ||
        msg.toLowerCase().includes("email rate")
      ) {
        Alert.alert(
          "Too many emails",
          "We’ve sent too many emails recently. Please wait a little while and then try again."
        );
      } else {
        Alert.alert("Sign up error", msg || "Could not sign up right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;

    const email = liEmail.trim().toLowerCase();
    const password = liPassword;

    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await hapticTap();
      await loginWithEmailPassword(email, password);
      await new Promise((resolve) => setTimeout(resolve, 150));

      showToast("Welcome back! You’re signed in.");
      goToMainTabs();
    } catch (e: any) {
      console.log("login error:", e);
      const msg = e?.message ? String(e.message) : String(e ?? "");
      Alert.alert("Login error", msg || "Could not log you in right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDiscord = () => {
    if (!DISCORD_INVITE_URL) {
      Alert.alert(
        "Discord link not set",
        "Please update the Discord invite link before opening."
      );
      return;
    }
    try {
      Linking.openURL(DISCORD_INVITE_URL);
    } catch {
      Alert.alert(
        "Could not open Discord",
        "Please check your internet connection or open the link from the App Store page."
      );
    }
  };

  const inputBaseStyle = {
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    color: tokens.text,
  } as const;

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.outer}>
          <View
            style={[
              styles.card,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.isDark
                  ? "rgba(0, 8, 16, 0.92)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
          >
            {/* Toggle header */}
            <View style={styles.headerRow}>
              <Pressable
                style={[
                  styles.headerTab,
                  isSignup && styles.headerTabActive,
                ]}
                onPress={() => handleSwitchMode("signup")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    isSignup && { color: tokens.text },
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.headerTab,
                  !isSignup && styles.headerTabActive,
                ]}
                onPress={() => handleSwitchMode("login")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    !isSignup && { color: tokens.text },
                  ]}
                >
                  Log In
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.subtitle, { color: tokens.cardText }]}>
              {isSignup
                ? "Create an account to save your progress!"
                : "Log in to see your saved progress!"}
            </Text>

            {isSignup ? (
              <View style={styles.form}>
                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Username
                </Text>
                <TextInput
                  value={suUsername}
                  onChangeText={setSuUsername}
                  placeholder="NovaStudent"
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={16}
                  editable={!loading}
                />

                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Email
                </Text>
                <TextInput
                  value={suEmail}
                  onChangeText={setSuEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType={
                    Platform.OS === "web" ? "default" : "email-address"
                  }
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCorrect={false}
                  editable={!loading}
                />

                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Password
                </Text>
                <TextInput
                  value={suPassword}
                  onChangeText={setSuPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCorrect={false}
                  editable={!loading}
                />

                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Confirm Password
                </Text>
                <TextInput
                  value={suConfirmPassword}
                  onChangeText={setSuConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCorrect={false}
                  editable={!loading}
                />

                <Pressable
                  onPress={handleSignUp}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: tokens.accent },
                    pressed && { opacity: 0.85 },
                    loading && { opacity: 0.7 },
                  ]}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Email
                </Text>
                <TextInput
                  value={liEmail}
                  onChangeText={setLiEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType={
                    Platform.OS === "web" ? "default" : "email-address"
                  }
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCorrect={false}
                  editable={!loading}
                />

                <Text
                  style={[styles.label, { color: tokens.cardText }]}
                >
                  Password
                </Text>
                <TextInput
                  value={liPassword}
                  onChangeText={setLiPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={
                    tokens.isDark ? "#6b7685" : "#607080"
                  }
                  style={[styles.input, inputBaseStyle]}
                  autoCorrect={false}
                  editable={!loading}
                />

                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: tokens.accent },
                    pressed && { opacity: 0.85 },
                    loading && { opacity: 0.7 },
                  ]}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? "Logging in..." : "Log In"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Discord + back */}
            <View style={{ marginTop: 16, alignItems: "center" }}>
              <Pressable onPress={handleOpenDiscord} disabled={loading}>
                <Text style={styles.discordLinkText}>
                  💬 Join the Nova Tutoring Discord
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.backRow}
              onPress={() => router.replace("/")}
              disabled={loading}
            >
              <Text style={styles.backText}>← Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 40,
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 8,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  headerTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  headerTabActive: {
    backgroundColor: "rgba(0,229,255,0.18)",
  },
  headerTabText: {
    color: "#7ea3b8",
    fontWeight: "700",
    fontSize: 14,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 18,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#001018",
  },
  backRow: {
    marginTop: 16,
    alignItems: "center",
  },
  backText: {
    color: "#9ad8ff",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  discordLinkText: {
    color: "#9ad8ff",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});