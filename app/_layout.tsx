// app/_layout.tsx
import React from "react";
import "./_dev/seed_coins";

import { Slot } from "expo-router";
import AppProviders from "./AppProviders";
import { StreakProvider } from "./context/StreakContext";
import ThemeOverlay from "./components/ThemeOverlay";

import { FxProvider } from "./context/FxProvider"; // ✅ root-level FX context

export default function RootLayout() {
  return (
    <StreakProvider>
      <AppProviders>
        <FxProvider>
          <ThemeOverlay />
          <Slot />
        </FxProvider>
      </AppProviders>
    </StreakProvider>
  );
}

if (__DEV__) {
  import("@react-native-async-storage/async-storage").then(AS => {
    AS.default.setItem("@nova/coins.v1", "999999").then(() =>
      console.log("💰 Dev coins granted")
    );
  });
}

// --- DEV ONLY: Stripe env probe ---
import StripeProbe from "./_dev/StripeProbe";

// --- DEV ONLY: catch bad relative checkout calls ---
if (typeof globalThis !== "undefined" && !(globalThis as any).__FETCH_PATCHED__) {
  const _fetch = globalThis.fetch?.bind(globalThis);
  (globalThis as any).__FETCH_PATCHED__ = true;
  if (_fetch) {
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : (input?.url ?? "");
      if (/^\/(api\/)?checkout\/start/.test(url)) {
        console.error("[DEV] Relative fetch detected:", url, init);
      }
      return _fetch(input, init);
    };
  }
}

// inside your RootLayout component's JSX, add <StripeProbe /> near the top-level:
