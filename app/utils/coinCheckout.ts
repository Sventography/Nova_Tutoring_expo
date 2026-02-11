// app/utils/coinCheckout.ts
import * as Linking from "expo-linking";
import Constants from "expo-constants";

type CoinCheckoutOpts = {
  id: string; // sku
  title: string;
  priceCoins: number;
  category: string;
  imageUrl?: string;
  size?: string | null;
  /**
   * Optional user info – once we pass this from Shop, the backend
   * can send a confirmation email directly to the customer.
   */
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
    contactEmail?: string | null;
    email?: string | null;
  };
};

function stripTrailingSlashes(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/\/+$/g, "");
}

function getBackendBase(): string {
  // Prefer extra.backendBase from app config, then EXPO_PUBLIC_BACKEND_URL, then localhost.
  const extra =
    ((Constants.expoConfig as any)?.extra ??
      (Constants.manifest as any)?.extra) || {};

  const envUrl =
    extra.backendBase ||
    (process.env as any)?.EXPO_PUBLIC_BACKEND_URL ||
    "";

  const fallback = "http://127.0.0.1:8787";
  return stripTrailingSlashes(envUrl || fallback) || fallback;
}

/**
 * startCoinCheckout
 *
 * For coin *tangible* orders (plushies, clothing, etc.):
 * - Fire-and-forget a POST to /api/coin-order so the backend:
 *    - emails the shop owner
 *    - (optionally) emails the customer if we include user.email
 * - Then deep-link to /coin so your in-app checkout screen still works.
 */
export function startCoinCheckout(opts: CoinCheckoutOpts) {
  const base = getBackendBase();
  const apiUrl = `${base}/api/coin-order`;

  const payload: any = {
    // how many coins this order cost
    coins: opts.priceCoins,

    // flat fields (nice for logging + backend fallbacks)
    sku: opts.id,
    category: opts.category,
    itemTitle: opts.title,
    itemSize: opts.size || null,

    // nested item block (used by server v5 for emails)
    item: {
      id: opts.id,
      title: opts.title,
      category: opts.category,
      size: opts.size || null,
      imageUrl: opts.imageUrl || null,
    },
  };

  if (opts.user) {
    payload.user = {
      id: opts.user.id,
      username: opts.user.username,
      displayName: opts.user.displayName,
      contactEmail: opts.user.contactEmail,
      email: opts.user.email ?? opts.user.contactEmail,
    };
  }

  // Fire-and-forget backend notification so emails can be sent.
  try {
    console.log("[coinCheckout] POST", apiUrl, payload);
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        let body: any = {};
        try {
          body = await res.json();
        } catch {
          body = {};
        }
        console.log(
          "[coinCheckout] response",
          res.status,
          body?.ok,
          body?.error
        );
      })
      .catch((err) => {
        console.log("[coinCheckout] error", err);
      });
  } catch (err) {
    console.log("[coinCheckout] outer error", err);
  }

  // And still deep-link into the in-app /coin screen (like before)
  const url = Linking.createURL("/coin", {
    queryParams: {
      sku: opts.id,
      title: opts.title,
      category: opts.category,
      priceCoins: String(opts.priceCoins ?? 0),
      imageUrl: opts.imageUrl ?? "",
      size: opts.size || "",
    },
  });

  return Linking.openURL(url); // expo-router handles this in-app
}
