// app/utils/checkout.ts
import { Platform, Linking as RNLinking, Alert } from "react-native";
import Constants from "expo-constants";

/** Public types for callers */
export type CheckoutPayload = {
  sku?: string;
  priceId?: string;
  productId?: string;
  /**
   * amount in **DOLLARS** (e.g. 12.99)
   *
   * We will convert this to **cents** before sending to the backend.
   */
  amount?: number;
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
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (typeof hostUri !== "string" || !hostUri) return null;

  const host = hostUri.split(":")[0];
  return host || null;
}

/**
 * Resolve the backend base URL.
 *
 * PROD:
 *  - Use extra.backendBase or EXPO_PUBLIC_BACKEND_URL
 *
 * DEV MODE:
 *  - Web: mirror the page host
 *  - Device/simulator: use Expo's dev host
 *  - Fallbacks: 10.0.2.2 for Android emulator, 127.0.0.1 last-resort
 */
function getBackend(): string {
  const extra =
    ((Constants.expoConfig as any)?.extra ??
      (Constants.manifest as any)?.extra) || {};

  const configured =
    (extra.backendBase ||
      (process.env as any)?.EXPO_PUBLIC_BACKEND_URL ||
      "").trim();

  if (configured) {
    const base = ensureHttp(stripTrailingSlashes(configured));
    if (__DEV__) console.log("[checkout] BACKEND(configured)", base);
    return base;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const h = window.location.hostname || "";
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(h);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(h);
    const host = isLanIp || isLocal ? h : "127.0.0.1";
    const base = `http://${host}:${DEFAULT_PORT}`;
    if (__DEV__) console.log("[checkout] BACKEND(web-host)", base);
    return base;
  }

  const expoHost = getExpoDevHost();
  if (expoHost) {
    const base = `http://${expoHost}:${DEFAULT_PORT}`;
    if (__DEV__) console.log("[checkout] BACKEND(expo-host)", base);
    return base;
  }

  if (Platform.OS === "android") {
    const base = `http://10.0.2.2:${DEFAULT_PORT}`;
    if (__DEV__) console.log("[checkout] BACKEND(android-emulator)", base);
    return base;
  }

  const base = `http://127.0.0.1:${DEFAULT_PORT}`;
  if (__DEV__) console.log("[checkout] BACKEND(fallback-127)", base);
  return base;
}

function buildAbsoluteAppUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  const linkingUri = (Constants as any)?.expoConfig?.scheme
    ? `${(Constants as any).expoConfig.scheme}://${normalized.replace(/^\//, "")}`
    : null;

  return linkingUri || `novatutoring://${normalized.replace(/^\//, "")}`;
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

    if (__DEV__) {
      console.log("[checkout] status", res.status, {
        url,
        body: json ?? text,
      });
    }

    return { ok: res.ok, status: res.status, json, text, url };
  } catch (e: any) {
    const msg = String(e?.message || e || "Network request failed");
    if (__DEV__) {
      console.log("[checkout] request failed", { url, message: msg });
    }
    return { ok: false, status: 0, json: null, text: msg, url };
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
      Alert.alert(
        "Checkout error",
        "We couldn't open the checkout page. Please try again."
      );
    });
  }
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

/** Main entry: start a Stripe Checkout session and redirect. */
export async function startCheckout(
  input: CheckoutPayload
): Promise<CheckoutResult> {
  const BACKEND = getBackend();
  if (__DEV__) console.log("[checkout] using BACKEND", BACKEND);

  const amountDollars =
    typeof input.amount === "number" ? input.amount : undefined;

  const amountCents =
    typeof amountDollars === "number"
      ? Math.round(amountDollars * 100)
      : undefined;

  const successUrl =
    input.success_url || buildAbsoluteAppUrl("/shop?checkout=success");
  const cancelUrl =
    input.cancel_url || buildAbsoluteAppUrl("/shop?checkout=cancel");

  const payload: Record<string, any> = {
    sku: input.sku,
    priceId: input.priceId,
    productId: input.productId,

    // send cents
    amount: amountCents,
    amount_cents: amountCents,

    currency: (input.currency || "usd").toLowerCase(),
    quantity: input.quantity ?? 1,
    success_url: successUrl,
    cancel_url: cancelUrl,
    meta: input.meta,
    method: input.method || "card",

    // extra optional fields
    title: (input as any).title,
    image: (input as any).image,
    images: (input as any).images,
    description: (input as any).description,
  };

  // Best endpoint first, then legacy fallbacks.
  // Dedupe in case some bases/paths collapse to the same URL.
  const endpoints = unique([
    `${BACKEND}/api/checkout`,
    `${BACKEND}/api/checkout/start`,
    `${BACKEND}/checkout`,
    `${BACKEND}/checkout/start`,
  ]);

  let lastErr: any = null;
  const tried: string[] = [];

  for (const url of endpoints) {
    tried.push(url);

    const { ok, json, text, status } = await postJSON(url, payload);

    if (!ok) {
      lastErr = new Error(
        `[${status || "no-status"}] ${
          text || json?.error || "bad status from checkout"
        }`
      );
      continue;
    }

    const checkoutUrl: string | undefined =
      json?.url ?? json?.checkout_url ?? json?.checkoutUrl;

    const sessionId: string | undefined =
      json?.id ?? json?.sessionId ?? json?.session_id;

    if (checkoutUrl) {
      if (__DEV__) {
        console.log("[checkout] opening checkout URL", checkoutUrl);
      }
      openUrl(checkoutUrl);
      return { ok: true, url: checkoutUrl };
    }

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

    lastErr = new Error("No url/sessionId in checkout response");
  }

  const msg =
    (lastErr && (lastErr.message || String(lastErr))) ||
    "All checkout endpoints failed.";

  console.error("[checkout] final error", msg, { tried });

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert?.(`Checkout error: ${msg}`);
  } else {
    Alert.alert("Checkout error", msg);
  }

  return { ok: false, error: msg };
}