import type { Stripe } from "@stripe/stripe-js";
import { initStripe } from "@stripe/stripe-react-native";

/** Read from env just like web */
export function getPublishableKey(): string {
  return (process.env.EXPO_PUBLIC_STRIPE_PK as string) || "";
}

/** No Stripe.js on native; initialize the RN SDK (no-op if already init). */
let _inited = false;
export async function ensureStripe(): Promise<boolean> {
  if (_inited) return true;
  const pk = getPublishableKey();
  if (!pk) return false;
  try {
    await initStripe({ publishableKey: pk });
    _inited = true;
    return true;
  } catch {
    return false;
  }
}

/** Web returns a Stripe.js object; on native we don’t have one — return null. */
export async function getStripe(): Promise<Stripe | null> {
  // Not applicable on native (use @stripe/stripe-react-native components/APIs instead).
  return null;
}

/** Web uses redirectToCheckout; on native this is not supported here. */
export async function redirectToCheckout(_opts: any): Promise<{ error?: any }> {
  return { error: "redirectToCheckout is web-only" };
}
