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

export default function RootLayout() {
  // ✅ client-only autoboot (prevents 'window is not defined' during web bundling)
  React.useEffect(() => {
    coinsAutoBoot();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
