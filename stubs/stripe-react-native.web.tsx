/**
 * Web stub for @stripe/stripe-react-native.
 * Provides no-op components/hooks so web can compile and run.
 */
import * as React from "react";

export type StripeProviderProps = {
  publishableKey?: string;
  merchantIdentifier?: string;
  urlScheme?: string;
  children?: React.ReactNode;
};

export function StripeProvider(props: StripeProviderProps) {
  return <React.Fragment>{props.children}</React.Fragment>;
}

export function useStripe() {
  return {
    presentPaymentSheet: async () => ({ error: undefined }),
    initPaymentSheet: async () => ({ error: undefined }),
    createPaymentMethod: async () => ({
      paymentMethod: undefined,
      error: undefined,
    }),
  };
}

// Safe fallbacks for native-only UI on web:
export function CardField() { return null; }
export function ApplePayButton() { return null; }
export function GooglePayButton() { return null; }
