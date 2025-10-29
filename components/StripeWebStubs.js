import React from "react";

export function CardField() {
  return <div style={{ color: "#888" }}>CardField (web stub)</div>;
}

export function AuBECSDebitForm() {
  return <div style={{ color: "#888" }}>AuBECSDebitForm (web stub)</div>;
}

export function ApplePayButton() {
  return <button disabled style={{ color: "#888" }}>Apple Pay (web stub)</button>;
}

export function StripeProvider({ children }) {
  return <>{children}</>;
}

export function useStripe() {
  return {
    confirmPayment: async () => ({ error: "Stripe not available on web" }),
  };
}

export default {};
