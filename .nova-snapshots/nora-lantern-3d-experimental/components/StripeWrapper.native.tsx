import React from "react";
import { View } from "react-native";

/**
 * Native wrapper: We rely on server-hosted Checkout links.
 * If a publishable key exists, great; if not, we still render children safely.
 */
export default function StripeWrapper({ children }: { children?: React.ReactNode }) {
  const pk = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!pk) {
    console.warn("Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY on native. Using URL Checkout flow.");
  }
  return <View style={{ flex: 1 }}>{children}</View>;
}
