// app/auth/callback.tsx

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

function readAuthParams(url: string): CallbackParams {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");

  const query =
    queryStart >= 0
      ? url.slice(
          queryStart + 1,
          hashStart >= 0 && hashStart > queryStart ? hashStart : undefined
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

function friendlyCallbackError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error || "Unknown error");

  if (message.toLowerCase().includes("expired")) {
    return "That confirmation link has expired. Please request a new confirmation email.";
  }

  return message;
}

export default function AuthCallback() {
  const router = useRouter();
  const incomingUrl = Linking.useLinkingURL();

  const handledUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState("Confirming your email…");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishConfirmation(url: string) {
      if (!url || handledUrlRef.current === url) return;

      handledUrlRef.current = url;

      try {
        console.log("[AUTH CALLBACK] URL received:", url);

        const params = readAuthParams(url);

        const providerError =
          params.error_description || params.error || params.error_code;

        if (providerError) {
          throw new Error(
            decodeURIComponent(providerError.replace(/\+/g, " "))
          );
        }

        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const code = params.code;
        const tokenHash = params.token_hash;
        const type = params.type;

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (!data.session) {
            throw new Error(
              "The confirmation link opened Nova Tutoring, but it did not contain a usable authentication session."
            );
          }
        }

        if (cancelled) return;

        setStatus("Email confirmed! Opening your account…");

        setTimeout(() => {
          if (!cancelled) {
            router.replace("/(tabs)/account");
          }
        }, 500);
      } catch (error) {
        console.warn("[AUTH CALLBACK] confirmation failed:", error);

        if (!cancelled) {
          setErrorMessage(friendlyCallbackError(error));
          setStatus("We couldn’t finish confirming your email.");
        }
      }
    }

    async function resolveUrl() {
      const url = incomingUrl || (await Linking.getInitialURL());

      if (!url) {
        if (!cancelled) {
          setErrorMessage(
            "No confirmation link was received. Please reopen the newest confirmation email and tap Confirm Email again."
          );
          setStatus("Confirmation link missing");
        }

        return;
      }

      await finishConfirmation(url);
    }

    void resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [incomingUrl, router]);

  return (
    <View style={s.container}>
      {!errorMessage ? (
        <ActivityIndicator size="large" color="#8b74ff" />
      ) : null}

      <Text style={s.title}>{status}</Text>

      {errorMessage ? (
        <>
          <Text style={s.error}>{errorMessage}</Text>

          <Pressable
            style={s.button}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={s.buttonText}>Return to Login</Text>
          </Pressable>
        </>
      ) : (
        <Text style={s.help}>
          Please keep Nova Tutoring open for a moment.
        </Text>
      )}
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
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  help: {
    color: "#b9b9cb",
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: "#ff9ea8",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#8b74ff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "800",
  },
});
