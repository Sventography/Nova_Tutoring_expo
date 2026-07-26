// app/lib/supabase.ts

import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const extra =
  (Constants.expoConfig?.extra as
    | Record<string, any>
    | undefined) ??
  ((Constants as any).manifest2?.extra as
    | Record<string, any>
    | undefined) ??
  ((Constants as any).manifest?.extra as
    | Record<string, any>
    | undefined) ??
  {};

const SUPABASE_URL = String(
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.EXPO_PUBLIC_SUPABASE_URL ||
    ""
).trim();

const SUPABASE_ANON_KEY = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ""
).trim();

const SUPABASE_STORAGE_KEY =
  "nova.supabase.auth.v3";

if (__DEV__) {
  console.log("[SUPABASE CONFIG]", {
    url: SUPABASE_URL,
    hasAnonKey: Boolean(
      SUPABASE_ANON_KEY
    ),
    storageKey: SUPABASE_STORAGE_KEY,
    hasExpoExtraUrl: Boolean(
      extra.EXPO_PUBLIC_SUPABASE_URL
    ),
    hasExpoExtraAnonKey: Boolean(
      extra.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ),
    hasProcessUrl: Boolean(
      process.env.EXPO_PUBLIC_SUPABASE_URL
    ),
    hasProcessAnonKey: Boolean(
      process.env
        .EXPO_PUBLIC_SUPABASE_ANON_KEY
    ),
  });
}

if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY
) {
  console.error(
    "[SUPABASE] Missing configuration",
    {
      hasUrl: Boolean(SUPABASE_URL),
      hasAnonKey: Boolean(
        SUPABASE_ANON_KEY
      ),
    }
  );

  throw new Error(
    "Missing Supabase configuration. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in EAS environment variables."
  );
}

const supabaseFetch: typeof fetch =
  async (input: any, init?: any) => {
    if (!__DEV__) {
      return fetch(input, init);
    }

    const url =
      typeof input === "string"
        ? input
        : input?.url
        ? input.url
        : String(input);

    console.log(
      "[SUPABASE FETCH START]",
      url
    );

    try {
      const response = await fetch(
        input,
        init
      );

      console.log(
        "[SUPABASE FETCH OK]",
        url,
        response.status
      );

      return response;
    } catch (error: any) {
      console.log(
        "[SUPABASE FETCH FAILED]",
        url,
        error?.message || error
      );
      throw error;
    }
  };

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    global: {
      fetch: supabaseFetch,
    },
    auth: {
      storage: AsyncStorage,
      storageKey:
        SUPABASE_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  }
);