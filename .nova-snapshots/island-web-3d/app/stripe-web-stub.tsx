import * as React from "react";

/** No-op provider so children still render on web */
export const StripeProvider: React.FC<React.PropsWithChildren<{
  publishableKey?: string;
  merchantIdentifier?: string;
  urlScheme?: string;
}>> = ({ children }) => <React.Fragment>{children}</React.Fragment>;

/** No-op hook with the methods your code might call */
export function useStripe() {
  return {
    // Payment Sheet
    initPaymentSheet: async (_opts?: any) => ({ error: undefined }),
    presentPaymentSheet: async () => ({ error: undefined }),
    // Apple/Google Pay (not supported on web)
    isApplePaySupported: false,
    presentApplePay: async (_opts?: any) => ({ error: "not-supported" }),
    confirmApplePayPayment: async (_clientSecret?: string) => ({ error: "not-supported" }),
    // Generic confirm (safe no-op)
    confirmPayment: async (_clientSecret?: string, _params?: any) => ({ error: undefined }),
  };
}

/** Dummy UI components (render nothing on web) */
export const CardField: React.FC<any> = () => null;
export const AuBECSDebitForm: React.FC<any> = () => null;
export const StripeContainer: React.FC<React.PropsWithChildren> = ({ children }) => (
  <React.Fragment>{children}</React.Fragment>
);

/** Default export so any "default" import doesn't crash */
export default {};
