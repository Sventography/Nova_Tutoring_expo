// app/utils/checkout.ts
import { Platform, Linking as RNLinking } from "react-native";
import Constants from "expo-constants";

/** Public types for callers */
export type CheckoutPayload = {
  sku?: string;
  priceId?: string;
  productId?: string;
  amount?: number; // cents
  currency?: string; // "usd"
  quantity?: number;
  meta?: Record<string, any>;
  success_url?: string;
  cancel_url?: string;
  /** Backend expects "coins" or "card". For Stripe/cash we use "card". */
  method?: "coins" | "card";
};

export type CheckoutResult =
  | { ok: true; url?: string; sessionId?: string }
  | { ok: false; error: string };

const DEFAULT_PORT = 8787;

function stripTrailingSlashes(s: string) {
  return s.replace(/\/+$/g, "");
}

function ensureHttp(s: string) {
  const t = s.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `http://${t}`;
}

function getExpoDevHost(): string | null {
  // These differ depending on Expo Go / dev-client / SDK versions
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (typeof hostUri !== "string" || !hostUri) return null;

  // hostUri/debuggerHost often looks like: "192.168.1.74:19000"
  const host = hostUri.split(":")[0];
  return host || null;
}

/**
 * Resolve the backend base URL.
 *
 * DEV MODE:
 *  - Web: mirror the page host
 *  - Device/simulator: use Expo's dev host (e.g. 192.168.1.74)
 *  - Fallbacks: 10.0.2.2 for Android emulator, 127.0.0.1 last-resort
 */
function getBackend(): string {
  // 1) Web: use current page host
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const h = window.location.hostname || "";
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(h);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(h);
    const host = isLanIp || isLocal ? h : "127.0.0.1";
    const base = `http://${host}:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(web-host)", base);
    return base;
  }

  // 2) Expo dev host (works for physical devices + simulators)
  const expoHost = getExpoDevHost();
  if (expoHost) {
    const base = `http://${expoHost}:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(expo-host)", base);
    return base;
  }

  // 3) Android emulator fallback
  if (Platform.OS === "android") {
    const base = `http://10.0.2.2:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(android-emulator)", base);
    return base;
  }

  // 4) Last resort: assume local machine
  const base = `http://127.0.0.1:${DEFAULT_PORT}`;
  if (__DEV__) console.warn("[checkout] BACKEND(fallback-127)", base);
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
      json = null;
    }

    if (__DEV__) console.log("[checkout] status", res.status, json ?? text);
    return { ok: res.ok, status: res.status, json, text };
  } catch (e: any) {
    console.error("[checkout] network error", e?.message || e, { url });
    return { ok: false, status: 0, json: null, text: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/** Safer URL opener (native/web) */
function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    (window as any).location.assign(url);
  } else {
    RNLinking.openURL(url).catch((e) => {
      console.error("[checkout] failed to open url", e);
    });
  }
}

/** Main entry: start a Stripe Checkout session and redirect. */
export async function startCheckout(
  input: CheckoutPayload
): Promise<CheckoutResult> {
  const BACKEND = getBackend();

  const payload: Record<string, any> = {
    sku: input.sku,
    priceId: input.priceId,
    productId: input.productId,
    amount: typeof input.amount === "number" ? input.amount : undefined,
    currency: (input.currency || "usd").toLowerCase(),
    quantity: input.quantity ?? 1,
    success_url: input.success_url,
    cancel_url: input.cancel_url,
    meta: input.meta,
    // 🔑 method is REQUIRED by your backend: "coins" or "card"
    method: input.method || "card",
    // extra fields we sometimes send along
    title: (input as any).title,
    image: (input as any).image,
    images: (input as any).images,
    description: (input as any).description,
  };

  // We ONLY call the routes that exist on your Flask backend:
  //   POST /checkout/start
  //   POST /api/checkout/start
  const endpoints = [
    `${BACKEND}/checkout/start`,
    `${BACKEND}/api/checkout/start`,
  ];

  let lastErr: any = null;

  for (const url of endpoints) {
    const { ok, json, text, status } = await postJSON(url, payload);

    if (!ok) {
      lastErr = new Error(
        `[${status || "no-status"}] ${text || json?.error || "bad status"}`
      );
      continue;
    }

    const checkoutUrl: string | undefined = json?.url ?? json?.checkout_url;
    const sessionId: string | undefined = json?.id ?? json?.sessionId;

    // ✅ Preferred path: backend returns a Stripe Checkout URL
    if (checkoutUrl) {
      openUrl(checkoutUrl);
      return { ok: true, url: checkoutUrl };
    }

    // Web-only: if backend gives a sessionId instead, use Stripe.js
    if (Platform.OS === "web" && sessionId) {
      try {
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
          throw new Error(
            (res as any).error?.message || "redirectToCheckout failed"
          );
        }
        return { ok: true, sessionId };
      } catch (e) {
        lastErr = e;
        console.error("[checkout] stripe redirect failed", e);
        continue;
      }
    }

    // If we got here, the response didn't have url or sessionId
    lastErr = new Error("No url/sessionId in response");
  }

  const msg =
    (lastErr && (lastErr.message || String(lastErr))) ||
    "All checkout endpoints failed.";
  return { ok: false, error: msg };
}
