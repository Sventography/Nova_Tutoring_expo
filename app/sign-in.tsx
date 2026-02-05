// app/sign-in.tsx
import React, { useEffect, useState } from "react";
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
import { useUser } from "./context/UserContext";
import { showToast } from "./utils/toast";

type Mode = "signup" | "login";

export default function SignInScreen() {
  const router = useRouter();
  const {
    signUpWithEmailPassword,
    loginWithEmailPassword,
    resetPassword,
    supabaseUserId,
    ready,
  } = useUser() as any;

  const [mode, setMode] = useState<Mode>("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const goToAccount = () => {
    try {
      (router as any).replace?.("/(tabs)/account");
    } catch {
      try {
        (router as any).replace?.("/(tabs)/ask");
      } catch {
        // ignore
      }
    }
  };

  // 👉 If already signed in, skip this screen and go straight to Account
  useEffect(() => {
    if (ready && supabaseUserId) {
      goToAccount();
    }
  }, [ready, supabaseUserId]);

  const onSwitchMode = (next: Mode) => {
    setMode(next);
  };

  const handleSignUp = async () => {
    const name = username.trim() || "Student";
    const mail = email.trim();

    if (!mail || !password || !confirm) {
      Alert.alert("Missing info", "Please fill in email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Password should be at least 6 characters."
      );
      return;
    }

    if (password !== confirm) {
      Alert.alert("Passwords do not match", "Please confirm your password.");
      return;
    }

    try {
      setLoading(true);
      await signUpWithEmailPassword?.(name, mail, password);
      showToast("Account created – you're signed in");
      goToAccount();
    } catch (e: any) {
      Alert.alert(
        "Sign up failed",
        e?.message ? String(e.message) : "Could not create account."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const mail = email.trim();

    if (!mail || !password) {
      Alert.alert("Missing info", "Please fill in email and password.");
      return;
    }

    try {
      setLoading(true);
      await loginWithEmailPassword?.(mail, password);
      showToast("Signed in");
      goToAccount();
    } catch (e: any) {
      Alert.alert(
        "Sign in failed",
        e?.message ? String(e.message) : "Could not sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const mail = email.trim();
    if (!mail) {
      Alert.alert(
        "Email needed",
        "Enter your email above, then tap “Forgot password?” again."
      );
      return;
    }

    try {
      setLoading(true);
      await resetPassword?.(mail);
      showToast("Password reset link sent. Check your email.");
    } catch (e: any) {
      Alert.alert(
        "Reset problem",
        e?.message
          ? String(e.message)
          : "Could not send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#020617", "#020617", "#041727"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={S.card}>
            <Text style={S.title}>Nova Tutoring Account</Text>
            <Text style={S.subtitle}>
              Create an account or sign in to sync your name, avatar, coins, and
              progress across devices.
            </Text>

            {/* Mode toggle */}
            <View style={S.modeRow}>
              <Pressable
                style={[
                  S.modeBtn,
                  isSignup ? S.modeBtnActive : S.modeBtnInactive,
                ]}
                onPress={() => onSwitchMode("signup")}
              >
                <Text
                  style={[
                    S.modeText,
                    isSignup ? S.modeTextActive : S.modeTextInactive,
                  ]}
                >
                  Create account
                </Text>
              </Pressable>
              <Pressable
                style={[
                  S.modeBtn,
                  !isSignup ? S.modeBtnActive : S.modeBtnInactive,
                ]}
                onPress={() => onSwitchMode("login")}
              >
                <Text
                  style={[
                    S.modeText,
                    !isSignup ? S.modeTextActive : S.modeTextInactive,
                  ]}
                >
                  Sign in
                </Text>
              </Pressable>
            </View>

            {isSignup && (
              <>
                <Text style={S.label}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Your display name"
                  placeholderTextColor="#6b7685"
                  style={S.input}
                />
              </>
            )}

            <Text style={S.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType={
                Platform.OS === "web" ? "default" : "email-address"
              }
              placeholderTextColor="#6b7685"
              style={S.input}
            />

            <Text style={S.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#6b7685"
              style={S.input}
            />

            {isSignup && (
              <>
                <Text style={S.label}>Confirm password</Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#6b7685"
                  style={S.input}
                />
              </>
            )}

            {/* Main button */}
            <Pressable
              style={[
                S.primaryBtn,
                loading ? { opacity: 0.6 } : null,
              ]}
              disabled={loading}
              onPress={isSignup ? handleSignUp : handleLogin}
            >
              <Text style={S.primaryText}>
                {isSignup
                  ? loading
                    ? "Creating..."
                    : "Create account"
                  : loading
                  ? "Signing in..."
                  : "Sign in"}
              </Text>
            </Pressable>

            {/* Forgot password */}
            <Pressable
              style={S.forgotRow}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={S.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* Info about username */}
            <Text style={S.infoText}>
              You log in with your email and password. Your username is just the
              display name shown in the app, and you can change it anytime from
              the Account tab.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(4,15,26,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.4)",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#e8fbff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9fb4c3",
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: "rgba(10,30,45,0.9)",
    padding: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: {
    backgroundColor: "rgba(0,229,255,0.22)",
  },
  modeBtnInactive: {
    backgroundColor: "transparent",
  },
  modeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  modeTextActive: {
    color: "#e8fbff",
  },
  modeTextInactive: {
    color: "#7b94a5",
  },
  label: {
    marginTop: 6,
    marginBottom: 4,
    color: "#9fb4c3",
    fontSize: 13,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderColor: "rgba(67,140,170,0.9)",
    backgroundColor: "rgba(3,9,18,0.9)",
    color: "#e8fbff",
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00e5ff",
  },
  primaryText: {
    fontWeight: "800",
    color: "#020617",
    fontSize: 15,
  },
  forgotRow: {
    marginTop: 10,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 13,
    color: "#9ad8ff",
    textDecorationLine: "underline",
  },
  infoText: {
    marginTop: 14,
    fontSize: 11,
    color: "#7b94a5",
  },
});
