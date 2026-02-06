// app/utils/stripeCheckout.ts
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

import { startCheckout } from "./checkout";

/**
 * Launches Stripe PaymentSheet for a cash (card / Apple Pay) purchase.
 *
 * Flow:
 * 1. Ask backend for PaymentIntent (via startCheckout)
 * 2. Initialize Stripe PaymentSheet
 * 3. Present UI
 * 4. Resolve on success, throw on failure
 */
export async function stripeCheckout(
  sku: string,
  quantity: number = 1
): Promise<{ ok: true }> {
  // 1️⃣ Create PaymentIntent on backend (or other checkout response)
  const result = await startCheckout({
    sku,
    method: "card",
    quantity,
  });

  // Basic failure guard
  if (!result || (result as any).ok === false) {
    const errMsg =
      (result as any)?.error || "Stripe checkout failed (no ok=true response)";
    throw new Error(errMsg);
  }

  const clientSecret = (result as any).clientSecret as string | undefined;
  const url = (result as any).url as string | undefined;

  // If startCheckout opened a hosted Checkout URL instead of PaymentSheet,
  // there may be no clientSecret, and that's still a valid success path.
  if (!clientSecret) {
    if (url) {
      // Hosted Checkout Session flow already started in startCheckout
      return { ok: true };
    }
    throw new Error("Stripe clientSecret missing from backend response");
  }

  // 2️⃣ Initialize Stripe Payment Sheet
  const initResult = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: "Nova Tutoring",
    allowsDelayedPaymentMethods: true,
  });

  if (initResult.error) {
    throw new Error(initResult.error.message);
  }

  // 3️⃣ Present the Stripe UI
  const presentResult = await presentPaymentSheet();

  if (presentResult.error) {
    throw new Error(presentResult.error.message);
  }

  // 4️⃣ Success 🎉
  return { ok: true };
}
