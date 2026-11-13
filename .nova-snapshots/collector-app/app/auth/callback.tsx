// app/auth/callback.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";
import { callbackPathWithoutCredentials, hasCallbackProof, readAuthParams, type CallbackParams } from "../_lib/authCallback";

type CallbackStage = "loading" | "success" | "error";
type CallbackBrowserWindow = {
  location: { href: string };
  history: {
    state: unknown;
    replaceState(data: unknown, unused: string, url: string): void;
  };
};

const PENDING_CONFIRMATION_EMAIL_KEY =
  "nova.auth.pending-confirmation-email.v1";
const PENDING_EMAIL_CHANGE_KEY =
  "nova.auth.pending-email-change.v1";

const AUTH_TIMEOUT_MS = 8000;

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function safelyDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/\+/g, " ");
  }
}

function friendlyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error || "Unknown authentication error");

  const lower = message.toLowerCase();

  if (lower.includes("timed out")) {
    return "Nova could not finish in time. Reopen the newest email link and try again.";
  }

  if (lower.includes("expired") || lower.includes("otp_expired")) {
    return "That link has expired. Request a new email and use the newest link.";
  }

  if (lower.includes("invalid")) {
    return "That link is no longer valid. Use the newest email.";
  }

  return message;
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${milliseconds}ms`));
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function AuthCallback() {
  const router = useRouter();
  const incomingUrl = Linking.useLinkingURL();

  const attemptIdRef = useRef(0);
  // Capture once before removing browser credentials. Effect reruns must still
  // use the email link, rather than the scrubbed URL or an existing session.
  const browserParamsRef = useRef<CallbackParams | null>(null);
  const sessionAttemptRef = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  const redirectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] =
    useState<CallbackStage>("loading");
  const [title, setTitle] =
    useState("Finishing your request…");
  const [message, setMessage] = useState(
    "Please keep Nova Tutoring open for a moment."
  );
  const [destination, setDestination] =
    useState<"account" | "login" | "reset">("account");
  const [loginEmail, setLoginEmail] = useState("");

  function clearRedirectTimer() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }

  function goNext() {
    clearRedirectTimer();

    if (destination === "reset") {
      (router as any).replace("/reset-password");
      return;
    }

    if (destination === "login") {
      (router as any).replace({
        pathname: "/sign-in",
        params: {
          mode: "login",
          email: loginEmail,
        },
      });
      return;
    }

    (router as any).replace("/(tabs)/account");
  }

  function showSuccess(
    nextTitle: string,
    nextMessage: string,
    nextDestination: "account" | "login" | "reset",
    autoContinue = false
  ) {
    setStage("success");
    setTitle(nextTitle);
    setMessage(nextMessage);
    setDestination(nextDestination);

    if (autoContinue) {
      clearRedirectTimer();
      redirectTimerRef.current = setTimeout(() => {
        if (nextDestination === "reset") {
          (router as any).replace("/reset-password");
        } else if (nextDestination === "login") {
          (router as any).replace({
            pathname: "/sign-in",
            params: {
              mode: "login",
              email: loginEmail,
            },
          });
        } else {
          (router as any).replace("/(tabs)/account");
        }
      }, 1800);
    }
  }

  useEffect(() => {
    const attemptId = ++attemptIdRef.current;
    let cancelled = false;

    function isCurrent() {
      return !cancelled && attemptId === attemptIdRef.current;
    }

    async function establishSessionOnce(
      params: CallbackParams
    ): Promise<boolean> {
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;
      const code = params.code;
      const tokenHash = params.token_hash;
      const type = params.type;

      if (accessToken && refreshToken) {
        const result = await withTimeout(
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
          AUTH_TIMEOUT_MS,
          "Starting your Nova session"
        );

        if (result.error) throw result.error;
        return !!result.data.session;
      }

      if (code) {
        const result = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          AUTH_TIMEOUT_MS,
          "Completing the request"
        );

        if (result.error) throw result.error;
        return !!result.data.session;
      }

      if (tokenHash && type) {
        const result = await withTimeout(
          supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          }),
          AUTH_TIMEOUT_MS,
          "Verifying the request"
        );

        if (result.error) throw result.error;
        return !!result.data.session;
      }

      const current = await withTimeout(
        supabase.auth.getSession(),
        5000,
        "Checking your Nova session"
      );

      if (current.error) throw current.error;
      return !!current.data.session;
    }

    function establishSession(params: CallbackParams): Promise<boolean> {
      const key = JSON.stringify(params);
      if (sessionAttemptRef.current?.key === key) {
        return sessionAttemptRef.current.promise;
      }
      const promise = establishSessionOnce(params);
      sessionAttemptRef.current = { key, promise };
      return promise;
    }

    async function run() {
      try {
        let params: CallbackParams;
        const browser = (globalThis as typeof globalThis & {
          window?: CallbackBrowserWindow;
        }).window;
        if (Platform.OS === "web" && browser) {
          if (!browserParamsRef.current) {
            const url = browser.location.href;
            browserParamsRef.current = readAuthParams(url);
            // Do this before storage or auth awaits. Credentials remain only in
            // this mounted callback's memory while the request is completed.
            browser.history.replaceState(browser.history.state, "", callbackPathWithoutCredentials(url));
          }
          params = browserParamsRef.current;
        } else {
          const url = incomingUrl || await withTimeout(
            Linking.getInitialURL(), 4000, "Reading the email link"
          );
          if (!url) throw new Error("Nova did not receive the email link.");
          params = readAuthParams(url);
        }

        const pendingSignupEmail = normalizeEmail(
          await AsyncStorage.getItem(
            PENDING_CONFIRMATION_EMAIL_KEY
          )
        );
        const pendingChangedEmail = normalizeEmail(
          await AsyncStorage.getItem(PENDING_EMAIL_CHANGE_KEY)
        );

        setLoginEmail(pendingChangedEmail || pendingSignupEmail);

        const flowType = String(params.type || "").toLowerCase();

        const providerError =
          params.error_description ||
          params.error ||
          params.error_code;

        if (providerError) {
          throw new Error(safelyDecode(providerError));
        }

        /*
         * Password recovery must establish a recovery session before the
         * user can call updateUser({ password }).
         */
        if (flowType === "recovery") {
          if (!hasCallbackProof(params)) {
            throw new Error("This reset link is missing its verification details. Request a new reset email and open its newest link.");
          }
          const hasSession = await establishSession(params);

          if (!isCurrent()) return;

          if (!hasSession) {
            throw new Error(
              "Nova could not start the password-recovery session."
            );
          }

          showSuccess(
            "Reset link verified!",
            "Opening the screen where you can choose a new password…",
            "reset",
            true
          );
          return;
        }

        /*
         * Email changes are already verified by Supabase before this app
         * callback opens. Refresh the session, but never show the old generic
         * signup error screen if the email-change link itself succeeded.
         */
        if (flowType === "email_change" || pendingChangedEmail) {
          try {
            await establishSession(params);
          } catch (error) {
            console.warn("[AUTH CALLBACK] email-change session could not be refreshed");
          }

          try {
            const refreshed = await withTimeout(
              supabase.auth.refreshSession(),
              6000,
              "Refreshing the changed email"
            );

            const refreshedEmail = normalizeEmail(
              refreshed.data.user?.email ||
              refreshed.data.session?.user?.email
            );

            if (
              pendingChangedEmail &&
              refreshedEmail === pendingChangedEmail
            ) {
              await AsyncStorage.removeItem(
                PENDING_EMAIL_CHANGE_KEY
              );
            }
          } catch (error) {
            console.warn("[AUTH CALLBACK] email-change refresh did not complete");
          }

          if (!isCurrent()) return;

          showSuccess(
            "Email address confirmed!",
            "Your login email was updated on the same Nova account. Your username, avatar, purchases, coins, streak, and progress are unchanged.",
            "account",
            true
          );
          return;
        }

        const hasSession = await establishSession(params);

        if (!isCurrent()) return;

        if (hasSession) {
          await AsyncStorage.removeItem(
            PENDING_CONFIRMATION_EMAIL_KEY
          );

          showSuccess(
            "Account confirmed!",
            "Your Nova Tutoring account is ready. Opening your account…",
            "account",
            true
          );
          return;
        }

        showSuccess(
          "Email confirmed!",
          "Your email is verified. Continue to Login with the email and password you registered.",
          "login",
          false
        );
      } catch (error) {
        console.warn("[AUTH CALLBACK] request could not be completed");

        if (!isCurrent()) return;

        setStage("error");
        setDestination("login");
        setTitle("We couldn’t finish the request");
        setMessage(friendlyError(error));
      }
    }

    void run();

    return () => {
      cancelled = true;
      clearRedirectTimer();
    };
  }, [incomingUrl, router]);

  return (
    <View style={s.container}>
      {stage === "loading" ? (
        <ActivityIndicator size="large" color="#8b74ff" />
      ) : null}

      {stage === "success" ? (
        <View style={s.successCircle}>
          <Text style={s.successCheck}>✓</Text>
        </View>
      ) : null}

      {stage === "error" ? (
        <View style={s.errorCircle}>
          <Text style={s.errorMark}>!</Text>
        </View>
      ) : null}

      <Text style={s.title}>{title}</Text>

      <Text
        style={[
          s.message,
          stage === "error" ? s.errorMessage : null,
        ]}
      >
        {message}
      </Text>

      {stage !== "loading" ? (
        <Pressable style={s.button} onPress={goNext}>
          <Text style={s.buttonText}>
            {destination === "reset"
              ? "Choose New Password"
              : destination === "login"
              ? "Continue to Login"
              : "Open My Account"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b10",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1d4938",
    borderWidth: 2,
    borderColor: "#75e6b0",
    alignItems: "center",
    justifyContent: "center",
  },
  successCheck: {
    color: "#75e6b0",
    fontSize: 40,
    fontWeight: "900",
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4a2028",
    borderWidth: 2,
    borderColor: "#ff9ea8",
    alignItems: "center",
    justifyContent: "center",
  },
  errorMark: {
    color: "#ff9ea8",
    fontSize: 38,
    fontWeight: "900",
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: "#b9b9cb",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 360,
  },
  errorMessage: {
    color: "#ffb2ba",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#8b74ff",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});
