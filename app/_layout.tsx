// app/_layout.tsx
import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect } from "react";

import "./_dev/seed_coins";

import { Slot } from "expo-router";
import AppProviders from "./AppProviders";
import { StreakProvider } from "./context/StreakContext";
import ThemeOverlay from "./components/ThemeOverlay";
import { FxProvider } from "./context/FxProvider";
import StripeProbe from "./_dev/StripeProbe"; // ✅ DEV Stripe env probe

function DevHooks() {
  // DEV coins bootstrap (moved out of top-level)
  useEffect(() => {
    if (!__DEV__) return;

    (async () => {
      try {
        const AS = (await import("@react-native-async-storage/async-storage")).default;
        await AS.setItem("@nova/coins.v1", "999999");
        console.log("💰 Dev coins granted");
      } catch (e) {
        console.warn("Dev coins bootstrap failed:", e);
      }
    })();
  }, []);

  // DEV fetch patch to catch bad relative checkout calls
  useEffect(() => {
    if (typeof globalThis === "undefined") return;

    const g: any = globalThis as any;
    if (g.__FETCH_PATCHED__) return;

    const _fetch = g.fetch?.bind(g);
    if (!_fetch) return;

    g.__FETCH_PATCHED__ = true;
    g.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url ?? "";
      if (/^\/(api\/)?checkout\/start/.test(url)) {
        console.error("[DEV] Relative fetch detected:", url, init);
      }
      return _fetch(input, init);
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <StreakProvider>
      <AppProviders>
        <FxProvider>
          <ThemeOverlay />
          <StripeProbe />
          {__DEV__ && <DevHooks />}
          <Slot />
        </FxProvider>
      </AppProviders>
    </StreakProvider>
  );
}
