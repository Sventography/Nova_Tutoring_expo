// app/lib/supabase.ts

import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const extra =
  (Constants.expoConfig?.extra as Record<string, any> | undefined) ??
  ((Constants as any).manifest2?.extra as Record<string, any> | undefined) ??
  ((Constants as any).manifest?.extra as Record<string, any> | undefined) ??
  {};

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  "";

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const SUPABASE_STORAGE_KEY = "nova.supabase.auth.v3";

console.log("[SUPABASE CONFIG]", {
  url: SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY,
  keyPrefix: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 12) : "",
  storageKey: SUPABASE_STORAGE_KEY,
  hasExpoExtraUrl: !!extra.EXPO_PUBLIC_SUPABASE_URL,
  hasExpoExtraAnonKey: !!extra.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  hasProcessUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  hasProcessAnonKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[SUPABASE] Missing config", {
    hasUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
  });

  throw new Error(
    "Missing Supabase configuration. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS env/app.config.js."
  );
}

const supabaseFetch: typeof fetch = async (input: any, init?: any) => {
  const url =
    typeof input === "string"
      ? input
      : input?.url
      ? input.url
      : String(input);

  console.log("[SUPABASE FETCH START]", url);

  try {
    const res = await fetch(input, init);
    console.log("[SUPABASE FETCH OK]", url, res.status);
    return res;
  } catch (err: any) {
    console.log("[SUPABASE FETCH FAILED]", url, err?.message || err);
    throw err;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: supabaseFetch,
  },
  auth: {
    storage: AsyncStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "implicit",
  },
});