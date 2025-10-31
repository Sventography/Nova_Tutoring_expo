import { startCheckout } from "@/utils/checkout";

/** Call this from your "$" (cash) purchase buttons. */
export async function buyWithCash(opts: { priceId?: string; sku?: string; quantity?: number }) {
  const origin = (typeof window !== "undefined" && window.location?.origin) || "http://localhost:8081";
  const payload = {
    priceId: opts.priceId,
    sku: opts.sku,
    quantity: opts.quantity ?? 1,
    success_url: `${origin}/?purchase=success`,
    cancel_url:  `${origin}/?purchase=cancel`,
  };
  return startCheckout(payload);
}
