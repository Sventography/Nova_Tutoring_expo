export type OrderEmailPayload = {
  id: string; sku: string; title: string; status?: string; createdAt?: number;
  coinsPrice?: number; email: string; name: string; address1: string; address2?: string;
  city: string; state: string; postalCode: string; country?: string;
  size?: string; category?: string; imageUrl?: string; notes?: string;
};

function pickBase(): string {
  // Trust EXPO_PUBLIC var; fallback to localhost.
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || "http://127.0.0.1:8788";
  return String(base).replace(/\/+$/,'');
}

export async function sendOrderEmail(payload: OrderEmailPayload) {
  const url = `${pickBase()}/api/order-email`;
  try {
    console.log("[orderEmail] POST", url, payload);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(()=>"");
    // Try to parse JSON, but always log raw text for debugging
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    console.log("[orderEmail] status", res.status, "body:", text || "(empty)");
    if (!res.ok) throw new Error(`order-email failed ${res.status}: ${text}`);
    return json ?? { ok: true };
  } catch (e) {
    console.warn("[orderEmail] ERROR", e);
    throw e;
  }
}
