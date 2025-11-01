// app/utils/checkout.ts
import { Platform, Linking as RNLinking } from "react-native";

/** Public types for callers */
export type CheckoutPayload = {
  sku?: string;
  priceId?: string;
  amount?: number;            // cents
  currency?: string;          // "usd"
  quantity?: number;
  meta?: Record<string, any>;
  success_url?: string;
  cancel_url?: string;
};

export type CheckoutResult =
  | { ok: true; url?: string; sessionId?: string }
  | { ok: false; error: string };

/** Resolve the backend base URL.
 * Priority:
 *  1) EXPO_PUBLIC_BACKEND_URL (wins, trimmed)
 *  2) Web: mirror page host if LAN IP or localhost/127.0.0.1; otherwise fall back to 127.0.0.1
 *  3) Native: emulator-safe loopback (Android: 10.0.2.2, iOS: 127.0.0.1)
 *
 * Default port is **8787** per project checkpoints.
 */
function getBackend(): string {
  // 1) Env wins (Expo public env var)
  const env = (process?.env?.EXPO_PUBLIC_BACKEND_URL as string) || "";
  if (env) {
    const out = env.replace(/\/+$/g, "");
    if (__DEV__) console.warn("[checkout] BACKEND(env)", out);
    return out;
  }

  // 2) Web host mirror
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const h = window.location.hostname || "";
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(h);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(h);
    const port = 8787; // <- your confirmed backend port
    const host = isLanIp || isLocal ? h : "127.0.0.1";
    const base = `http://${host}:${port}`;
    if (__DEV__) console.warn("[checkout] BACKEND(auto-web)", base);
    return base;
  }

  // 3) Native fallback (override on real devices via EXPO_PUBLIC_BACKEND_URL)
  const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const base = `http://${host}:8787`;
  if (__DEV__) console.warn("[checkout] BACKEND(fallback-native)", base);
  return base;
}

/** Small helper with timeout to avoid hanging fetches in dev */
async function postJSON(url: string, body: any, timeoutMs = 15000) {
  if (__DEV__) console.log("[checkout] POST", url, body);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const text = await res.text().catch(() => "");
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body; leave json = null
    }

    if (__DEV__) console.log("[checkout] status", res.status, json ?? text);
    return { ok: res.ok, status: res.status, json, text };
  } catch (e: any) {
    console.error("[checkout] network error", e?.message || e);
    return { ok: false, status: 0, json: null, text: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/** Safer URL opener (native/web) */
function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Use assign to preserve history of where checkout came from
    (window as any).location.assign(url);
  } else {
    RNLinking.openURL(url).catch((e) => {
      console.error("[checkout] failed to open url", e);
    });
  }
}

/** Main entry: start a Stripe Checkout session and redirect. */
export async function startCheckout(input: CheckoutPayload): Promise<CheckoutResult> {
  const BACKEND = getBackend();

  // Minimal payload; server decides price vs amount-based
  const payload: Record<string, any> = {
    sku: input.sku,
    priceId: input.priceId,
    amount: typeof input.amount === "number" ? input.amount : undefined,
    currency: (input.currency || "usd").toLowerCase(),
    quantity: input.quantity ?? 1,
    success_url: input.success_url,
    cancel_url: input.cancel_url,
    meta: input.meta,
  };

  // Try common route variants (top to bottom)
  const endpoints = [
    `${BACKEND}/checkout/start`,
    `${BACKEND}/api/checkout/start`,
    `${BACKEND}/payments/checkout/start`,
  ];

  let lastErr: any = null;

  for (const url of endpoints) {
    const { ok, json, text } = await postJSON(url, payload);
    if (!ok) {
      lastErr = new Error(text || "bad status");
      continue;
    }

    const checkoutUrl: string | undefined = json?.url ?? json?.checkout_url;
    const sessionId: string | undefined = json?.id ?? json?.sessionId;

    // Prefer direct URL when provided
    if (checkoutUrl) {
      openUrl(checkoutUrl);
      return { ok: true, url: checkoutUrl };
    }

    // Web fallback to Stripe.js redirect when we have a sessionId
    if (Platform.OS === "web" && sessionId) {
      try {
        // Load whichever helper exists in your repo
        const mod =
          (await import("./stripeWeb").catch(() => null)) ||
          (await import("./stripe").catch(() => null)) ||
          (await import("./stripe.web").catch(() => null));

        const getStripeSafely =
          (mod && (mod as any).getStripeSafely) ||
          (mod && (mod as any).getStripe) ||
          null;

        if (!getStripeSafely) throw new Error("Stripe.js helper not found");

        const stripe = await getStripeSafely();
        if (!stripe) throw new Error("Stripe.js unavailable");

        const res = await stripe.redirectToCheckout({ sessionId });
        if ((res as any)?.error) {
          throw new Error((res as any).error?.message || "redirectToCheckout failed");
        }
        return { ok: true, sessionId };
      } catch (e) {
        lastErr = e;
        console.error("[checkout] stripe redirect failed", e);
        // fall through to try next endpoint
        continue;
      }
    }

    // If neither url nor sessionId, try the next candidate
    lastErr = new Error("No url/sessionId in response");
  }

  const msg = (lastErr && (lastErr.message || String(lastErr))) || "All checkout endpoints failed.";
  return { ok: false, error: msg };
}
