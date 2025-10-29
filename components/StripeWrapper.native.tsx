import * as React from "react";
import { Platform } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";

/**
 * Native wrapper: uses the real Stripe SDK (iOS/Android).
 * Requires:
 *   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *   EXPO_PUBLIC_APPLE_MERCHANT_ID  (for Apple Pay)
 * in your .env (Expo reads EXPO_PUBLIC_* at build time).
 */
export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!publishableKey) {
    console.warn("Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }

  return (
    <StripeProvider
      publishableKey={publishableKey ?? ""}
      merchantIdentifier={process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID}
      urlScheme={Platform.select({ ios: "nova", android: "nova" })}
    >
      {children}
    </StripeProvider>
  );
}
