/**
 * Native Stripe implementation isolated from the Expo Router bundle.
 * This file is NOT inside app/, so it won't be imported on web.
 * You can import it manually from native entry points if needed.
 */

import { initStripe } from "@stripe/stripe-react-native";

let initialized = false;

export async function ensureNativeStripe() {
  if (initialized) return true;

  try {
    const pk = process.env.EXPO_PUBLIC_STRIPE_PK || "";
    if (!pk) return false;

    await initStripe({ publishableKey: pk });
    initialized = true;
    return true;
  } catch (e) {
    console.warn("Native Stripe init failed:", e);
    return false;
  }
}
