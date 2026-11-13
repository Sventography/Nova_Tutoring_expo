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

  // hostUri/debuggerHost often looks like: "192.168.1.50:19000"
  const host = hostUri.split(":")[0];
  return host || null;
}

/** Resolve the backend base URL.
 * Priority:
 *  1) EXPO_PUBLIC_BACKEND_URL (wins)
 *  2) Web: mirror page host if LAN IP or localhost; else 127.0.0.1
 *  3) Native:
 *     - Android emulator: 10.0.2.2
 *     - iOS simulator: 127.0.0.1
 *     - Physical device: infer Expo dev host (LAN IP)
 *
 * Default port is **8787**
 */
function getBackend(): string {
  // 1) Env wins
  const envRaw = (process?.env?.EXPO_PUBLIC_BACKEND_URL as string) || "";
  if (envRaw.trim()) {
    const out = stripTrailingSlashes(ensureHttp(envRaw));
    if (__DEV__) console.warn("[checkout] BACKEND(env)", out);
    return out;
  }

  // 2) Web host mirror
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const h = window.location.hostname || "";
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(h);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(h);
    const host = isLanIp || isLocal ? h : "127.0.0.1";
    const base = `http://${host}:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(auto-web)", base);
    return base;
  }

  // 3) Native fallback
  if (Platform.OS === "android") {
    // Android emulator -> host machine
    const base = `http://10.0.2.2:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(android-emulator)", base);
    return base;
  }

  // iOS: could be simulator or physical device
  // Simulator can reach 127.0.0.1, physical cannot.
  const expoHost = getExpoDevHost(); // usually LAN IP of your Mac in dev
  if (expoHost) {
    const base = `http://${expoHost}:${DEFAULT_PORT}`;
    if (__DEV__) console.warn("[checkout] BACKEND(expo-host)", base);
    return base;
  }

  // last resort
  const base = `http://127.0.0.1:${DEFAULT_PORT}`;
  if (__DEV__) console.warn("[checkout] BACKEND(fallback)", base);
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
    title: (input as any).title,
    image: (input as any).image,
    images: (input as any).images,
    description: (input as any).description,
  };

  const endpoints = [
    `${BACKEND}/checkout/start`,
    `${BACKEND}/api/checkout/start`,
    `${BACKEND}/payments/checkout/start`,
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

    if (checkoutUrl) {
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

    lastErr = new Error("No url/sessionId in response");
  }

  const msg =
    (lastErr && (lastErr.message || String(lastErr))) ||
    "All checkout endpoints failed.";
  return { ok: false, error: msg };
}
