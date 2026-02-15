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
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";
import { showToast } from "./utils/toast";

export default function SignInScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { signUpWithEmailPassword, loginWithEmailPassword } =
    useUser() as any;

  const [mode, setMode] = useState<"signup" | "login">("signup");

  // Sign Up fields
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirmPassword, setSuConfirmPassword] = useState("");

  // Login fields
  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const hapticTap = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // ignore
      }
    }
  };

  const switchMode = async (next: "signup" | "login") => {
    if (mode === next || loading) return;
    await hapticTap();
    setMode(next);
  };

  const handleSignUp = async () => {
    const username = suUsername.trim();
    const email = suEmail.trim().toLowerCase();
    const password = suPassword;
    const confirmPassword = suConfirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill out all fields.");
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
      await signUpWithEmailPassword(username, email, password);

      // tiny delay so auth listeners + contexts can settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      showToast("Account created! You’re signed in.");
      router.replace("/(tabs)/account");
    } catch (e: any) {
      console.log("signUp error:", e);
      const code = e?.code || "";
      const msg = e?.message ? String(e.message) : String(e ?? "");

      // Username already taken (from UserContext)
      if (
        code === "USERNAME_TAKEN" ||
        msg.toLowerCase().includes("already taken")
      ) {
        Alert.alert(
          "Username already taken",
          "That username is already taken. Please choose another."
        );
      }
      // Supabase email rate-limiting (too many signups / reset emails)
      else if (
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
    const email = liEmail.trim().toLowerCase();
    const password = liPassword;

    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmailPassword(email, password);

      // tiny delay so auth listeners + contexts can settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      showToast("Welcome back! You’re signed in.");
      router.replace("/(tabs)/account");
    } catch (e: any) {
      console.log("login error:", e);
      const msg = e?.message ? String(e.message) : String(e ?? "");
      Alert.alert("Login error", msg || "Could not log you in right now.");
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    mode === "signup"
      ? "Create an account to save your progress!"
      : "Log in to see your saved progress!";

  const isSignup = mode === "signup";

  const inputBaseStyle = {
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    color: tokens.text,
  } as const;

  const labelColor = { color: tokens.cardText } as const;
  const subtitleColor = { color: tokens.cardText } as const;
  const headerCardBg = {
    backgroundColor: tokens.isDark
      ? "rgba(0, 8, 16, 0.9)"
      : "rgba(255,255,255,0.9)",
  } as const;

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              headerCardBg,
              { borderColor: tokens.border },
            ]}
          >
            {/* Toggle header */}
            <View
              style={[
                styles.headerRow,
                { borderColor: tokens.border, backgroundColor: "transparent" },
              ]}
            >
              <Pressable
                style={[
                  styles.headerTab,
                  isSignup && {
                    backgroundColor: tokens.isDark
                      ? "rgba(0,229,255,0.18)"
                      : "rgba(0,120,200,0.18)",
                  },
                ]}
                onPress={() => switchMode("signup")}
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
                  !isSignup && {
                    backgroundColor: tokens.isDark
                      ? "rgba(0,229,255,0.18)"
                      : "rgba(0,120,200,0.18)",
                  },
                ]}
                onPress={() => switchMode("login")}
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

            <Text style={[styles.subtitle, subtitleColor]}>{subtitle}</Text>

            {/* SIGN UP FORM */}
            {isSignup ? (
              <View style={styles.form}>
                <Text style={[styles.label, labelColor]}>Username</Text>
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
                />

                <Text style={[styles.label, labelColor]}>Email</Text>
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
                />

                <Text style={[styles.label, labelColor]}>Password</Text>
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
                />

                <Text style={[styles.label, labelColor]}>
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
                />

                <Pressable
                  onPress={handleSignUp}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: tokens.accent,
                    },
                    pressed && { opacity: 0.8 },
                    loading && { opacity: 0.7 },
                  ]}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      {
                        color: tokens.isDark ? "#001018" : "#001018",
                      },
                    ]}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* LOGIN FORM */
              <View style={styles.form}>
                <Text style={[styles.label, labelColor]}>Email</Text>
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
                />

                <Text style={[styles.label, labelColor]}>Password</Text>
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
                />

                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: tokens.accent,
                    },
                    pressed && { opacity: 0.8 },
                    loading && { opacity: 0.7 },
                  ]}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      {
                        color: tokens.isDark ? "#001018" : "#001018",
                      },
                    ]}
                  >
                    {loading ? "Logging in..." : "Log In"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Back to home */}
            <Pressable
              style={styles.backRow}
              onPress={() => router.replace("/")}
              disabled={loading}
            >
              <Text style={styles.backText}>← Back to Home</Text>
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
  },
  headerTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "transparent",
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
});
