import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

type CallbackParams = Record<string, string>;

type CallbackStage = "loading" | "success" | "error";

type Destination = "/(tabs)/account" | "/(auth)/login";

function readAuthParams(url: string): CallbackParams {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");

  const query =
    queryStart >= 0
      ? url.slice(
          queryStart + 1,
          hashStart >= 0 && hashStart > queryStart
            ? hashStart
            : undefined
        )
      : "";

  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : "";

  const combined = [query, hash].filter(Boolean).join("&");

  const search = new URLSearchParams(combined);

  const params: CallbackParams = {};

  search.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

function safelyDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/\+/g, " ");
  }
}

function friendlyCallbackError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error || "Unknown confirmation error");

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("expired") ||
    lowerMessage.includes("otp_expired")
  ) {
    return "That confirmation link has expired. Please request a new confirmation email.";
  }

  if (
    lowerMessage.includes("already") &&
    lowerMessage.includes("confirmed")
  ) {
    return "Your account has already been confirmed. You can return to Nova Tutoring and log in.";
  }

  if (lowerMessage.includes("invalid")) {
    return "That confirmation link is no longer valid. Please use the newest confirmation email.";
  }

  return message;
}

export default function AuthCallback() {
  const router = useRouter();

  const incomingUrl = Linking.useLinkingURL();

  const handledUrlRef = useRef<string | null>(null);

  const redirectTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [stage, setStage] = useState<CallbackStage>("loading");

  const [title, setTitle] = useState("Confirming your account…");

  const [message, setMessage] = useState(
    "Please keep Nova Tutoring open for a moment."
  );

  const [destination, setDestination] =
    useState<Destination>("/(tabs)/account");

  function openDestination(nextDestination: Destination) {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    router.replace(nextDestination);
  }

  function showSuccess(
    successMessage: string,
    nextDestination: Destination
  ) {
    setStage("success");
    setTitle("Account confirmed!");
    setMessage(successMessage);
    setDestination(nextDestination);

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      router.replace(nextDestination);
    }, 3000);
  }

  useEffect(() => {
    let cancelled = false;

    async function finishConfirmation(url: string) {
      if (!url || handledUrlRef.current === url) {
        return;
      }

      handledUrlRef.current = url;

      try {
        console.log("[AUTH CALLBACK] URL received:", url);

        setStage("loading");
        setTitle("Confirming your account…");
        setMessage(
          "Please keep Nova Tutoring open for a moment."
        );

        const params = readAuthParams(url);

        const providerError =
          params.error_description ||
          params.error ||
          params.error_code;

        if (providerError) {
          throw new Error(safelyDecode(providerError));
        }

        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const code = params.code;
        const tokenHash = params.token_hash;
        const type = params.type;

        let hasAuthenticatedSession = false;

        /*
         * Standard Supabase mobile confirmation:
         * nova://auth/callback#access_token=...&refresh_token=...
         */
        if (accessToken && refreshToken) {
          const { data, error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            throw error;
          }

          hasAuthenticatedSession = !!data.session;
        }

        /*
         * PKCE callback support:
         * nova://auth/callback?code=...
         */
        else if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          hasAuthenticatedSession = !!data.session;
        }

        /*
         * Token-hash callback support.
         */
        else if (tokenHash && type) {
          const { data, error } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any,
            });

          if (error) {
            throw error;
          }

          hasAuthenticatedSession = !!data.session;
        }

        /*
         * The app may already have received the session through
         * Supabase's authentication listener.
         */
        else {
          const { data, error } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          hasAuthenticatedSession = !!data.session;
        }

        if (cancelled) {
          return;
        }

        if (hasAuthenticatedSession) {
          showSuccess(
            "Your Nova Tutoring account is ready. Opening your account…",
            "/(tabs)/account"
          );
        } else {
          /*
           * The email can still be successfully verified even when an
           * email provider or browser does not pass the login session
           * back into the app. Give the user a clear success message
           * and send them to the login screen instead of showing a
           * confusing technical error.
           */
          showSuccess(
            "Your email has been verified. Opening the login screen so you can sign in…",
            "/(auth)/login"
          );
        }
      } catch (error) {
        console.warn(
          "[AUTH CALLBACK] confirmation failed:",
          error
        );

        if (cancelled) {
          return;
        }

        setStage("error");
        setTitle("We couldn’t confirm your account");
        setMessage(friendlyCallbackError(error));
        setDestination("/(auth)/login");
      }
    }

    async function resolveUrl() {
      try {
        const url =
          incomingUrl || (await Linking.getInitialURL());

        if (!url) {
          if (cancelled) {
            return;
          }

          setStage("error");
          setTitle("Confirmation link missing");
          setMessage(
            "Nova Tutoring did not receive the confirmation link. Please reopen the newest confirmation email and tap Confirm Email again."
          );
          setDestination("/(auth)/login");

          return;
        }

        await finishConfirmation(url);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn(
          "[AUTH CALLBACK] unable to read incoming URL:",
          error
        );

        setStage("error");
        setTitle("We couldn’t open the confirmation link");
        setMessage(friendlyCallbackError(error));
        setDestination("/(auth)/login");
      }
    }

    void resolveUrl();

    return () => {
      cancelled = true;

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [incomingUrl, router]);

  const isLoading = stage === "loading";
  const isSuccess = stage === "success";
  const isError = stage === "error";

  return (
    <View style={s.container}>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#8b74ff"
        />
      ) : null}

      {isSuccess ? (
        <View style={s.successCircle}>
          <Text style={s.successCheck}>✓</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={s.errorCircle}>
          <Text style={s.errorMark}>!</Text>
        </View>
      ) : null}

      <Text style={s.title}>{title}</Text>

      <Text
        style={[
          s.message,
          isError ? s.errorMessage : null,
        ]}
      >
        {message}
      </Text>

      {isSuccess ? (
        <Pressable
          style={s.button}
          onPress={() => openDestination(destination)}
        >
          <Text style={s.buttonText}>
            {destination === "/(tabs)/account"
              ? "Open My Account"
              : "Continue to Login"}
          </Text>
        </Pressable>
      ) : null}

      {isError ? (
        <Pressable
          style={s.button}
          onPress={() => openDestination("/(auth)/login")}
        >
          <Text style={s.buttonText}>
            Return to Login
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
    marginBottom: 4,
  },

  successCheck: {
    color: "#75e6b0",
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 46,
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
    marginBottom: 4,
  },

  errorMark: {
    color: "#ff9ea8",
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 44,
  },

  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
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
    minWidth: 180,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});