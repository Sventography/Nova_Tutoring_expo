// app/change-email.tsx

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

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              "The request took too long. Check the new inbox first—the confirmation email may still have been sent."
            )
          );
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  const {
    isLoggedIn,
    session,
    requestEmailChange,
  } = useUser() as any;

  const currentEmail = normalizeEmail(session?.user?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!isLoggedIn) {
      Alert.alert(
        "Sign in required",
        "Please sign in before changing your login email."
      );
      return;
    }

    const nextEmail = normalizeEmail(newEmail);
    const confirmation = normalizeEmail(confirmEmail);

    if (!currentPassword) {
      Alert.alert(
        "Password required",
        "Enter your current password to authorize this change."
      );
      return;
    }

    if (!looksLikeEmail(nextEmail)) {
      Alert.alert("Invalid email", "Enter a valid new email address.");
      return;
    }

    if (nextEmail !== confirmation) {
      Alert.alert(
        "Emails do not match",
        "Enter the same new email address in both fields."
      );
      return;
    }

    if (nextEmail === currentEmail) {
      Alert.alert(
        "No change",
        "That is already your login email."
      );
      return;
    }

    setSending(true);

    try {
      await withTimeout(
        requestEmailChange(
          nextEmail,
          currentPassword
        ),
        18000
      );

      Alert.alert(
        "Check your new inbox",
        `We sent a confirmation message to:\n\n${nextEmail}\n\nYour email will change after you confirm that message. Your username, avatar, purchases, coins, streak, and progress stay on the same account.`,
        [
          {
            text: "Done",
            onPress: () =>
              (router as any).replace("/(tabs)/account"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Could not change email",
        error?.message || "Please try again."
      );
    } finally {
      setSending(false);
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
              Change Login Email
            </Text>

            <Text style={[styles.label, { color: tokens.cardText }]}>
              Current login email
            </Text>
            <Text style={[styles.current, { color: tokens.text }]}>
              {currentEmail || "—"}
            </Text>

            <Text style={[styles.explainer, { color: tokens.cardText }]}>
              This changes only the login address on your existing account.
              Your user ID and all progress remain unchanged.
            </Text>

            <Text style={[styles.label, { color: tokens.cardText }]}>
              Current password
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!sending}
              placeholder="Enter current password"
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
              New email
            </Text>
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={
                Platform.OS === "web" ? "default" : "email-address"
              }
              editable={!sending}
              placeholder="new@example.com"
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
              Confirm new email
            </Text>
            <TextInput
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={
                Platform.OS === "web" ? "default" : "email-address"
              }
              editable={!sending}
              placeholder="new@example.com"
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

            <View style={styles.warning}>
              <Text style={styles.warningText}>
                A confirmation will be sent to the new address. You will keep
                the same password and all account data.
              </Text>
            </View>

            <Pressable
              onPress={submit}
              disabled={sending}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tokens.accent,
                  opacity: sending ? 0.55 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#001018" />
              ) : (
                <Text style={styles.primaryText}>
                  Send Confirmation to New Email
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    marginTop: 46,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  current: {
    fontSize: 17,
    fontWeight: "900",
  },
  explainer: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  warning: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(255,183,77,0.55)",
    backgroundColor: "rgba(255,183,77,0.12)",
    borderRadius: 12,
    padding: 12,
  },
  warningText: {
    color: "#ffd59b",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#001018",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 18,
  },
  cancelText: {
    color: "#9ad8ff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
