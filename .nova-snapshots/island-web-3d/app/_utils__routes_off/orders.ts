export type CoinOrderPayload = {
  itemId: string;
  title: string;
  price: number; // in coins
  email: string;
  fullName: string;
  phone?: string;
  addr1: string;
  addr2?: string;
  city: string;
  state: string;
  zip: string;
};

export type CoinOrderResponse = {
  ok: boolean;
  orderId?: string;
  message?: string;
};

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/+$/g, "") || "http://127.0.0.1:8788";

export async function placeCoinOrder(payload: CoinOrderPayload): Promise<CoinOrderResponse> {
  try {
    const res = await fetch(`${BASE}/orders/coins/place`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await res.text().catch(() => "");
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}
    if (!res.ok) return { ok: false, message: json?.message || txt || `HTTP ${res.status}` };
    return { ok: true, orderId: json?.orderId, message: json?.message };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}
