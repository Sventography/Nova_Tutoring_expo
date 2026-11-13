let stripePromise: Promise<import("@stripe/stripe-js").Stripe | null> | null = null;

function getPublishableKey(): string {
  const key = (process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string) || "";
  if (!key) console.warn("[Stripe] Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY. Falling back to Checkout URL redirect.");
  return key;
}

export async function getStripe() {
  if (!stripePromise) {
    const pk = getPublishableKey();
    if (!pk) return null;
    stripePromise = import("@stripe/stripe-js").then((m: any) => {
      const loadStripe = m?.loadStripe ?? (m?.default?.loadStripe);
      if (typeof loadStripe !== "function") {
        throw new Error("[Stripe] loadStripe not found (module resolution issue).");
      }
      return loadStripe(pk);
    });
  }
  return stripePromise;
}
