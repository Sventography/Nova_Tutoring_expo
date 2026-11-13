export type PurchaseItem = {
  id: string;
  name: string;
  cashPrice?: number;
  coinPrice?: number;
  type?: "virtual" | "tangible" | string;
};

export type AddressLike = {
  name: string;
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

function fmtAddress(a?: AddressLike) {
  if (!a) return "";
  return [
    a.name,
    a.address1,
    a.address2,
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
    a.country
  ].filter(Boolean).join("\n");
}

export async function placeOrderEmail(params: {
  item: PurchaseItem & { method: "cash" | "coins" };
  address?: AddressLike;
}) {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5055";
  const url = `${base.replace(/\/+$/,"")}/api/order`;

  const body = {
    name: params.address?.name ?? "",
    address: fmtAddress(params.address),
    item: {
      name: params.item.name || params.item.id || "Unknown item",
      price: params.item.method === "cash" ? Number(params.item.cashPrice ?? 0) : undefined,
      coins: params.item.method === "coins" ? Number(params.item.coinPrice ?? 0) : undefined,
      method: params.item.method
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`order http ${res.status}: ${txt}`);
  }
  return res.json().catch(() => ({}));
}
