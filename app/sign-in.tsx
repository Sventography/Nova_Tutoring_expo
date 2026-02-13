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

  const { signUpWithEmailPassword, loginWithEmailPassword } = useUser() as any;

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
    if (mode === next) return;
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

    // Hard limit: 8 characters for username (matches Account screen + normalizeUsername)
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
      await signUpWithEmailPassword(username, email, password);
      showToast("Account created! You’re signed in.");
      router.replace("/(tabs)/account");
    } catch (e: any) {
      console.log("signUp error:", e);
      const code = e?.code;
      const rawMessage = String(e?.message || "");

      const lower = rawMessage.toLowerCase();

      if (code === "USERNAME_TAKEN") {
        Alert.alert(
          "Username taken",
          "That username is already taken. Please choose another."
        );
      } else if (lower.includes("rate limit")) {
        Alert.alert(
          "Too many sign ups",
          "You’ve tried to sign up too many times in a short period. Please wait a little while and try again."
        );
      } else if (lower.includes("user already registered")) {
        Alert.alert(
          "Email already used",
          "There is already an account using that email. Try logging in instead."
        );
      } else {
        Alert.alert(
          "Sign up error",
          rawMessage || "Could not sign up right now."
        );
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
      const rawMessage = String(e?.message || "");
      const lower = rawMessage.toLowerCase();

      if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
        Alert.alert(
          "Login error",
          "Email or password is incorrect. Please double-check and try again."
        );
      } else if (lower.includes("email not confirmed")) {
        Alert.alert(
          "Email not confirmed",
          "Please confirm your email address using the link we sent you before logging in."
        );
      } else {
        Alert.alert(
          "Login error",
          rawMessage || "Could not log you in right now."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    mode === "signup"
      ? "Create an account to save your progress!"
      : "Log In to save your progress!";

  const isSignup = mode === "signup";

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
          <View style={styles.card}>
            {/* Toggle header */}
            <View style={styles.headerRow}>
              <Pressable
                style={[
                  styles.headerTab,
                  isSignup && styles.headerTabActive,
                ]}
                onPress={() => switchMode("signup")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    isSignup && styles.headerTabTextActive,
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
                onPress={() => switchMode("login")}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.headerTabText,
                    !isSignup && styles.headerTabTextActive,
                  ]}
                >
                  Log In
                </Text>
              </Pressable>
            </View>

            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* SIGN UP FORM */}
            {isSignup ? (
              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  value={suUsername}
                  onChangeText={setSuUsername}
                  placeholder="NovaStu"
                  maxLength={32}
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={suEmail}
                  onChangeText={setSuEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType={
                    Platform.OS === "web" ? "default" : "email-address"
                  }
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={suPassword}
                  onChangeText={setSuPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  value={suConfirmPassword}
                  onChangeText={setSuConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Pressable
                  onPress={handleSignUp}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.8 },
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
              /* LOGIN FORM */
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={liEmail}
                  onChangeText={setLiEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType={
                    Platform.OS === "web" ? "default" : "email-address"
                  }
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={liPassword}
                  onChangeText={setLiPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor="#6b7685"
                  style={styles.input}
                />

                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.8 },
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
    backgroundColor: "rgba(0, 8, 16, 0.9)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,229,255,0.35)",
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 8,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.4)",
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
  headerTabTextActive: {
    color: "#e8fbff",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 10,
    color: "#cfeff6",
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    marginTop: 4,
  },
  label: {
    color: "#a6c4d6",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.3,
    borderColor: "rgba(0,229,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: "#e8fbff",
    backgroundColor: "rgba(2,20,32,0.9)",
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 18,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00e5ff",
  },
  primaryBtnText: {
    color: "#001018",
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
