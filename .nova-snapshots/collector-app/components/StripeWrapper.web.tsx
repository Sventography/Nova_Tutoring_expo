import * as React from "react";

/**
 * Web wrapper: NO Stripe SDK. Just renders children.
 * Prevents Metro from touching native-only modules on web.
 */
export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
