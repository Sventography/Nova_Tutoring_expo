// app/_layout.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";

import React from "react";

import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import AppProviders from "./AppProviders";
import { StreakProvider } from "./context/StreakContext";
import ThemeOverlay from "./components/ThemeOverlay";
import { FxProvider } from "./context/FxProvider";
import { coinsAutoBoot } from "./utils/coins-autoboot";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔧 DEV-ONLY: one-time Supabase auth/profile reset to clear bad refresh tokens
// You can manually re-enable this by adding <SupabaseAuthResetOnce /> into RootLayout.
function SupabaseAuthResetOnce() {
  React.useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.multiRemove([
          "user.profile.v1", // PROFILE_KEY in UserContext
          "auth.supabase.jwt", // SUPABASE_JWT_KEY in UserContext
          "@supabase.auth.token", // Supabase's own stored token
        ]);
        console.log("[Debug] Cleared Supabase auth + profile keys (once)");
      } catch (e) {
        console.log("[Debug] Error clearing auth keys", e);
      }
    })();
  }, []);

  return null;
}

export default function RootLayout() {
  // ✅ client-only autoboot (prevents 'window is not defined' during web bundling)
  React.useEffect(() => {
    coinsAutoBoot();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* DEV-ONLY: if you need to clear stale Supabase tokens, temporarily re-add:
          <SupabaseAuthResetOnce /> 
       */}

      <AppProviders>
        <StreakProvider>
          <FxProvider>
            <ThemeOverlay />
            <Slot />
          </FxProvider>
        </StreakProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

// --- DEV ONLY: catch bad relative checkout calls ---
if (
  typeof globalThis !== "undefined" &&
  !(globalThis as any).__FETCH_PATCHED__
) {
  const _fetch = globalThis.fetch?.bind(globalThis);
  (globalThis as any).__FETCH_PATCHED__ = true;
  if (_fetch) {
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url ?? "";
      if (/^\/(api\/)?checkout\/start/.test(url)) {
        console.error("[DEV] Relative fetch detected:", url, init);
      }
      return _fetch(input, init);
    };
  }
}