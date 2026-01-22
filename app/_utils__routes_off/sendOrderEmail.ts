export type OrderEmailPayload = {
  id: string; sku: string; title: string; status?: string; createdAt?: number;
  coinsPrice?: number; email: string; name: string; address1: string; address2?: string;
  city: string; state: string; postalCode: string; country?: string; size?: string;
  category?: string; imageUrl?: string; notes?: string;
};

function pickBase(): string {
  // When running the web app on localhost, force the local Flask backend
  try {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") {
        return "http://127.0.0.1:8788";
      }
    }
  } catch {}

  // Otherwise use env, fallback to local
  const envBase = process.env.EXPO_PUBLIC_BACKEND_URL || "";
  return (envBase || "http://127.0.0.1:8788").replace(/\/+$/, "");
}

export async function sendOrderEmail(payload: OrderEmailPayload) {
  const url = `${pickBase()}/api/order-email`;
  console.log("[sendOrderEmail] POST", url, payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const txt = await res.text().catch(() => "");
  let json: any = null;
  try { json = JSON.parse(txt); } catch {}
  console.log("[sendOrderEmail] status", res.status, "body:", txt || "(empty)");

  if (!res.ok) throw new Error(`order-email failed ${res.status}: ${txt}`);
  return json ?? { ok: true };
}
