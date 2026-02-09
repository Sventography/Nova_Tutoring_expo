// Wherever this lives (e.g. app/_lib/api.ts or app/api.ts)
const BASE =
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined) ??
  (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined) ??
  "http://127.0.0.1:8787";

export async function createPaymentIntent(
  amountCents: number,
  currency: string,
  note?: string
) {
  try {
    const res = await fetch(`${BASE}/api/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountCents, currency, note }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { clientSecret: null, error: `HTTP ${res.status}: ${txt}` };
    }

    const json = await res.json();
    return { clientSecret: json.clientSecret as string, error: null };
  } catch (e: any) {
    return { clientSecret: null, error: e?.message ?? String(e) };
  }
}
