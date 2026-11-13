import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
const pk = (process.env.EXPO_PUBLIC_STRIPE_PK as string) || "";
export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  return <StripeProvider publishableKey={pk}>{children}</StripeProvider>;
}
