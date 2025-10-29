import React from "react";

/** Web build: keep it simple and avoid importing the native Stripe SDK */
export default function StripePay() {
  return (
    <div style={{ padding: 12, color: "#cfe8ef" }}>
      Card payment is native-only in this build. Use Apple/Google Pay or Web Checkout.
    </div>
  );
}
