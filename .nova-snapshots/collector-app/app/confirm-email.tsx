// app/confirm-email.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "./lib/supabase";

export const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";

const CONFIRMATION_REDIRECT_URL =
  "https://confirm.sventographystudios.com/auth/confirmed";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 8;

function normalizeEmail(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "").trim().toLowerCase();
}

function normalizeCode(value: string): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, OTP_MAX_LENGTH);
}

function friendlyMessage(error: unknown): string {
  const message = String((error as any)?.message || error || "").trim();
  const lower = message.toLowerCase();

  if (lower.includes("expired") || lower.includes("invalid")) {
    return "That code is invalid or has expired. Tap Resend Email and use the newest code you receive.";
  }

  if (lower.includes("rate") || lower.includes("too many")) {
    return "Please wait a little before requesting another email.";
  }

  return message || "Something went wrong. Please try again.";
}

async function verifySignupCode(email: string, token: string) {
  const signupAttempt = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup" as any,
  });

  if (!signupAttempt.error && signupAttempt.data?.session) {
    return signupAttempt.data;
  }

  const emailAttempt = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (emailAttempt.error) {
    throw emailAttempt.error;
  }

  return emailAttempt.data;
}

export default function ConfirmEmailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    email?: string | string[];
  }>();

  const initialParamEmail = useMemo(
    () => normalizeEmail(params.email),
    [params.email]
  );

  const [email, setEmail] = useState(initialParamEmail);
  const [code, setCode] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(!initialParamEmail);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPendingEmail() {
      try {
        if (initialParamEmail) {
          await AsyncStorage.setItem(
            PENDING_CONFIRMATION_EMAIL_KEY,
            initialParamEmail
          );

          if (active) {
            setEmail(initialParamEmail);
          }

          return;
        }

        const savedEmail = normalizeEmail(
          await AsyncStorage.getItem(PENDING_CONFIRMATION_EMAIL_KEY)
        );

        if (active) {
          setEmail(savedEmail);
        }
      } catch (error) {
        console.warn("[ConfirmEmail] Could not load pending email:", error);
      } finally {
        if (active) {
          setLoadingEmail(false);
        }
      }
    }

    loadPendingEmail();

    return () => {
      active = false;
    };
  }, [initialParamEmail]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      return;
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setCooldown((current) => Math.max(0, current - 1));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cooldown]);

  async function confirmCode() {
    const trimmedEmail = normalizeEmail(email);
    const trimmedCode = normalizeCode(code);

    if (!trimmedEmail) {
      Alert.alert(
        "Email missing",
        "Return to registration and enter your email address again."
      );
      return;
    }

    if (
      trimmedCode.length < OTP_MIN_LENGTH ||
      trimmedCode.length > OTP_MAX_LENGTH
    ) {
      Alert.alert(
        "Enter the code",
        "Enter the complete confirmation code from the Nova Tutoring email."
      );
      return;
    }

    setVerifying(true);

    try {
      const data = await verifySignupCode(
        trimmedEmail,
        trimmedCode
      );

      let activeSession = data?.session ?? null;

      if (!activeSession) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        activeSession = sessionData.session ?? null;
      }

      if (!activeSession) {
        throw new Error(
          "Your email was confirmed, but Nova could not start your session. Continue to Login with the email and password you registered."
        );
      }

      await AsyncStorage.removeItem(PENDING_CONFIRMATION_EMAIL_KEY);

      Alert.alert(
        "Account confirmed!",
        "You are now signed in to Nova Tutoring.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)/account"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Could not confirm account", friendlyMessage(error));
    } finally {
      setVerifying(false);
    }
  }

  async function resendEmail() {
    const trimmedEmail = normalizeEmail(email);

    if (!trimmedEmail) {
      Alert.alert(
        "Email missing",
        "Return to registration and enter your email address again."
      );
      return;
    }

    if (cooldown > 0 || resending) {
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: {
          emailRedirectTo: CONFIRMATION_REDIRECT_URL,
        },
      });

      if (error) {
        throw error;
      }

      await AsyncStorage.setItem(
        PENDING_CONFIRMATION_EMAIL_KEY,
        trimmedEmail
      );

      setCooldown(RESEND_COOLDOWN_SECONDS);

      Alert.alert(
        "Email sent",
        "Look for an email from Nova Tutoring. Check Inbox, Promotions, Spam, or Junk."
      );
    } catch (error) {
      Alert.alert("Could not resend email", friendlyMessage(error));
    } finally {
      setResending(false);
    }
  }

  function continueToLogin() {
    router.replace({
      pathname: "/sign-in",
      params: {
        email: normalizeEmail(email),
        mode: "login",
      },
    });
  }

  async function changeEmail() {
    await AsyncStorage.removeItem(PENDING_CONFIRMATION_EMAIL_KEY);

    router.replace({
      pathname: "/sign-in",
      params: {
        mode: "register",
      },
    });
  }

  if (loadingEmail) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#9a87ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NOVA TUTORING</Text>

          <Text style={styles.title}>Check your email</Text>

          <Text style={styles.body}>
            We sent a confirmation email and confirmation code to:
          </Text>

          <Text style={styles.email}>
            {email || "Your email address"}
          </Text>

          <Text style={styles.body}>
            Look for a message from{"\n"}
            <Text style={styles.strong}>
              Nova Tutoring &lt;nova@sventographystudios.com&gt;
            </Text>
          </Text>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Gmail may place a new sender in Promotions or Spam. Check Inbox,
              Promotions, Spam, and Junk.
            </Text>
          </View>

          <Text style={styles.label}>Confirmation code</Text>

          <TextInput
            value={code}
            onChangeText={(value) =>
              setCode(normalizeCode(value))
            }
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            placeholder="Enter code"
            placeholderTextColor="#77798a"
            maxLength={OTP_MAX_LENGTH}
            style={styles.codeInput}
            editable={!verifying}
          />

          <Pressable
            onPress={confirmCode}
            disabled={verifying}
            style={({ pressed }) => [
              styles.buttonWrapper,
              pressed && !verifying ? styles.pressed : null,
              verifying ? styles.disabled : null,
            ]}
          >
            <LinearGradient
              colors={["#8d6cff", "#6549d8"]}
              style={styles.primaryButton}
            >
              {verifying ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryText}>Confirm Account</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={resendEmail}
            disabled={resending || cooldown > 0}
            style={[
              styles.secondaryButton,
              resending || cooldown > 0 ? styles.disabled : null,
            ]}
          >
            {resending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.secondaryText}>
                {cooldown > 0
                  ? `Resend Email in ${cooldown}s`
                  : "Resend Email"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={continueToLogin}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              I already confirmed — Continue to Login
            </Text>
          </Pressable>

          <Pressable
            onPress={changeEmail}
            style={styles.linkButton}
          >
            <Text style={styles.mutedLink}>
              Change email address
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: "center",
  },

  screen: {
    flex: 1,
    backgroundColor: "#05050a",
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05050a",
  },

  card: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(139, 116, 255, 0.65)",
    backgroundColor: "#12121e",
  },

  eyebrow: {
    color: "#9a87ff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textAlign: "center",
  },

  title: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },

  body: {
    marginTop: 16,
    color: "#c5c5d4",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  email: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  strong: {
    color: "#ffffff",
    fontWeight: "800",
  },

  notice: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 196, 87, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 196, 87, 0.35)",
  },

  noticeText: {
    color: "#e9d6aa",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  label: {
    marginTop: 22,
    marginBottom: 8,
    color: "#d7d7e4",
    fontSize: 14,
    fontWeight: "700",
  },

  codeInput: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5d4aaa",
    backgroundColor: "#090910",
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 5,
    textAlign: "center",
  },

  buttonWrapper: {
    marginTop: 18,
    borderRadius: 14,
    overflow: "hidden",
  },

  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  primaryText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },

  secondaryButton: {
    minHeight: 50,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#59596b",
  },

  secondaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },

  linkText: {
    color: "#a996ff",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  mutedLink: {
    color: "#9797a9",
    fontSize: 14,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.55,
  },
});
