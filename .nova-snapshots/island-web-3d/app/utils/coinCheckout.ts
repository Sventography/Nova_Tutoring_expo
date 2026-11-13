// app/utils/coinCheckout.ts
import Constants from "expo-constants";
import type { AddressPayload } from "../components/AddressSheet";

type CoinCheckoutOpts = {
  id: string; // sku
  title: string;
  priceCoins: number;
  category: string;
  imageUrl?: string;
  size?: string | null;
  /**
   * Optional user info – backend can use this to attach the order
   * to a profile and email a receipt.
   */
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
    contactEmail?: string | null;
    email?: string | null;
  };
  /**
   * Optional shipping address, from AddressSheet.
   * This lets the backend include full address details in the email.
   */
  address?: AddressPayload | null;
};

function stripTrailingSlashes(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/\/+$/g, "");
}

function getBackendBase(): string {
  // Prefer extra.backendBase from app config, then EXPO_PUBLIC_BACKEND_URL, then Render URL fallback.
  const extra =
    ((Constants.expoConfig as any)?.extra ??
      (Constants.manifest as any)?.extra) || {};

  const envUrl =
    extra.backendBase ||
    (process.env as any)?.EXPO_PUBLIC_BACKEND_URL ||
    "";

  const fallback = "https://nove-tutoring-backend.onrender.com";
  const base = stripTrailingSlashes(envUrl || fallback) || fallback;

  if (__DEV__) {
    console.log("[coinCheckout] extra =", extra);
    console.log("[coinCheckout] envUrl =", envUrl);
    console.log("[coinCheckout] backendBase =", base);
  }

  return base;
}

/**
 * startCoinCheckout
 *
 * For coin *tangible* orders (plushies, clothing, etc.):
 * - Fire-and-forget a POST to /api/coin-order so the backend:
 *    - debits coins and records the purchase in Supabase
 *    - emails the shop owner and/or customer
 *
 * UI (Order Placed modal, going back to Shop) is handled entirely
 * by the Shop screen now – we no longer deep-link into a /coin screen.
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

    // nested item block (used by server v5/v6 for emails and logs)
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

  if (opts.address) {
    const a = opts.address;
    payload.address = {
      name: a.name,
      email: a.email,
      phone: a.phone,
      address1: a.address1,
      address2: a.address2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      zip: a.zip ?? null,
      country: a.country ?? null,
    };
  }

  // Fire-and-forget backend notification so coins + purchases + emails can happen.
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

  // IMPORTANT: we no longer open a second in-app /coin screen here.
  // The Shop screen handles success UI (Order Placed modal) itself.
  return;
}
