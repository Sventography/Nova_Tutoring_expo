// app/reset-password.tsx

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useTheme } from "./context/ThemeContext";
import { useUser } from "./context/UserContext";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { session, updatePassword } = useUser() as any;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!session?.user?.id) {
      Alert.alert(
        "Reset link required",
        "Open the newest password-reset email and tap its button again."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password too short",
        "Use a password with at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Enter the same new password in both fields."
      );
      return;
    }

    setSaving(true);

    try {
      await updatePassword(password);

      Alert.alert(
        "Password updated!",
        "Your new password is ready. You are still signed in on this device.",
        [
          {
            text: "Continue",
            onPress: () =>
              (router as any).replace("/(tabs)/account"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Could not update password",
        error?.message || "Please request a new reset email and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient colors={tokens.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: tokens.text }]}>
              Choose a New Password
            </Text>

            <Text style={[styles.explainer, { color: tokens.cardText }]}>
              Enter a new password for your Nova Tutoring account.
            </Text>

            <Text style={[styles.label, { color: tokens.cardText }]}>
              New password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              placeholder="At least 8 characters"
              placeholderTextColor="#77798a"
              style={[
                styles.input,
                {
                  color: tokens.text,
                  borderColor: tokens.border,
                  backgroundColor: tokens.isDark
                    ? "rgba(0,0,0,0.24)"
                    : "rgba(255,255,255,0.75)",
                },
              ]}
            />

            <Text style={[styles.label, { color: tokens.cardText }]}>
              Confirm new password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              placeholder="Enter it again"
              placeholderTextColor="#77798a"
              style={[
                styles.input,
                {
                  color: tokens.text,
                  borderColor: tokens.border,
                  backgroundColor: tokens.isDark
                    ? "rgba(0,0,0,0.24)"
                    : "rgba(255,255,255,0.75)",
                },
              ]}
            />

            <Pressable
              onPress={submit}
              disabled={saving}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tokens.accent,
                  opacity: saving ? 0.55 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#001018" />
              ) : (
                <Text style={styles.primaryText}>
                  Update Password
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    margin: 20,
    marginTop: 72,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  explainer: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  primaryText: {
    color: "#001018",
    fontSize: 15,
    fontWeight: "900",
  },
});
