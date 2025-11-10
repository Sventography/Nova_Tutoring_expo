// app/utils/sendOrderEmail.ts
export type SendOrderEmailPayload = {
  id: string;
  sku: string;
  title: string;
  createdAt: number;
  status: "paid" | "fulfilled" | "shipped";
  size?: string | null;
  category?: string;
  coinsPrice?: number;
  // shipping
  name?: string;
  email?: string;        // customer's email (for confirmation)
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

// Prefer explicit env var. In prod set EXPO_PUBLIC_API_BASE=https://YOUR-APP.vercel.app
const ENV_BASE =
  (typeof process !== "undefined" && (process as any).env?.EXPO_PUBLIC_API_BASE) || "";

// Browser hints (for Expo web)
const isBrowser = typeof window !== "undefined";
const origin = isBrowser ? window.location.origin : "";

// If we’re already running on your vercel domain, use relative; otherwise fallback to env or localhost.
const isOnVercel =
  isBrowser && /\.vercel\.app$/.test(window.location.hostname);

const BASE = ENV_BASE
  || (isOnVercel ? "" : "http://localhost:3000"); // ← dev fallback; override via env in mobile

const ORDER_EMAIL_ENDPOINT = `${BASE.replace(/\/$/, "")}/api/order-email`;

export async function sendOrderEmail(order: SendOrderEmailPayload) {
  const res = await fetch(ORDER_EMAIL_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`sendOrderEmail failed: ${res.status} ${body}`);
  }
}
