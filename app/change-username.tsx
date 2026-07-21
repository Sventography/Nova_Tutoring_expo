// app/change-username.tsx

import React, { useEffect, useMemo, useState } from "react";
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

const STATUS_TEXT: Record<string, string> = {
  empty: "Enter a username.",
  too_short: "Use at least 3 characters.",
  too_long: "Use no more than 8 characters.",
  invalid_chars: "Use only letters, numbers, and underscores.",
  taken: "That username is already taken.",
  same: "That is already your username.",
  cooldown: "Username changes are limited to once every 30 days.",
  ok: "That username is available.",
  error: "Could not check availability right now.",
};

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function localUsernameStatus(value: string): string {
  const trimmed = String(value || "").trim();

  if (!trimmed) return "";
  if (trimmed.length < 3) return "too_short";
  if (trimmed.length > 8) return "too_long";
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) return "invalid_chars";
  return "needs_remote_check";
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
          reject(new Error(`Timed out after ${milliseconds}ms`));
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function ChangeUsernameScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  const {
    isLoggedIn,
    username,
    usernameChangedAt,
    checkUsername,
    changeUsername,
  } = useUser() as any;

  const [candidate, setCandidate] = useState("");
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const nextAllowedDate = useMemo(() => {
    if (!usernameChangedAt) return null;

    const date = new Date(usernameChangedAt);
    if (Number.isNaN(date.getTime())) return null;

    date.setDate(date.getDate() + 30);
    return date;
  }, [usernameChangedAt]);

  const cooldownActive =
    !!nextAllowedDate && nextAllowedDate.getTime() > Date.now();

  useEffect(() => {
    const trimmed = candidate.trim();
    const localStatus = localUsernameStatus(trimmed);

    // Immediately clear spinner for all local-validation states.
    setChecking(false);

    if (!trimmed) {
      setStatus("");
      return;
    }

    if (localStatus !== "needs_remote_check") {
      setStatus(localStatus);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      if (!active) return;

      setChecking(true);
      setStatus("");

      try {
        const result = await withTimeout(
          checkUsername(trimmed),
          4000
        );

        if (active) {
          setStatus(String(result || "error"));
        }
      } catch (error) {
        console.warn("[ChangeUsername] availability check failed:", error);

        if (active) {
          setStatus("error");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [candidate, checkUsername]);

  async function submit() {
    if (!isLoggedIn) {
      Alert.alert(
        "Sign in required",
        "Please sign in before changing your username."
      );
      return;
    }

    const trimmed = candidate.trim();
    const localStatus = localUsernameStatus(trimmed);

    if (localStatus && localStatus !== "needs_remote_check") {
      Alert.alert(
        "Invalid username",
        STATUS_TEXT[localStatus] || "Please choose another username."
      );
      return;
    }

    if (status !== "ok") {
      Alert.alert(
        "Username unavailable",
        STATUS_TEXT[status] || "Please choose another username."
      );
      return;
    }

    setSaving(true);

    try {
      const result = await changeUsername(trimmed);

      Alert.alert(
        "Username changed",
        `Your username is now ${result.username}.`,
        [
          {
            text: "Done",
            onPress: () => (router as any).replace("/(tabs)/account"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Could not change username",
        error?.message || "Please try again."
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
              Change Username
            </Text>

            <Text style={[styles.label, { color: tokens.cardText }]}>
              Current username
            </Text>
            <Text style={[styles.current, { color: tokens.text }]}>
              {username || "—"}
            </Text>

            <Text style={[styles.explainer, { color: tokens.cardText }]}>
              Usernames must be 3–8 characters and may contain letters,
              numbers, and underscores. Each username can belong to only one
              account.
            </Text>

            {cooldownActive ? (
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  You can change your username again on{" "}
                  {formatDate(nextAllowedDate?.toISOString())}.
                </Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: tokens.cardText }]}>
              New username
            </Text>

            <TextInput
              value={candidate}
              onChangeText={(value) =>
                setCandidate(
                  value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 8)
                )
              }
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={8}
              editable={!saving && !cooldownActive}
              placeholder="New username"
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

            <View style={styles.statusRow}>
              {checking ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : null}

              <Text
                style={[
                  styles.status,
                  {
                    color:
                      status === "ok"
                        ? "#72e6ad"
                        : status
                        ? "#ffb0b8"
                        : tokens.cardText,
                  },
                ]}
              >
                {checking
                  ? "Checking availability..."
                  : STATUS_TEXT[status] || ""}
              </Text>
            </View>

            <Pressable
              onPress={submit}
              disabled={
                saving ||
                checking ||
                cooldownActive ||
                status !== "ok"
              }
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tokens.accent,
                  opacity:
                    saving ||
                    checking ||
                    cooldownActive ||
                    status !== "ok"
                      ? 0.5
                      : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#001018" />
              ) : (
                <Text style={styles.primaryText}>
                  Confirm Username Change
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
    marginTop: 70,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  current: {
    fontSize: 20,
    fontWeight: "900",
  },
  explainer: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
  },
  statusRow: {
    minHeight: 30,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  warning: {
    marginTop: 16,
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
    marginTop: 16,
  },
  primaryText: {
    color: "#001018",
    fontSize: 15,
    fontWeight: "900",
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
