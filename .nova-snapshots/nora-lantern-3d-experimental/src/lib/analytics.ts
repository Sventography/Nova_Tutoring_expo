import { listOrders, Order } from "./orders";
import { SHOP_ITEMS } from "../constants/shop";
import { listStock } from "./inventory";

export type SalesSummary = {
  totalOrders: number;
  totalUnits: number;
  totalCoins: number;
  avgOrderCoins: number;
  topItems: { id: string; title: string; units: number; coins: number }[];
  recent: Order[];
};

export async function getSalesSummary(since?: number): Promise<SalesSummary> {
  const orders = await listOrders();
  const filtered =
    typeof since === "number"
      ? orders.filter((o) => o.createdAt >= since)
      : orders;

  let totalOrders = filtered.length;
  let totalUnits = 0;
  let totalCoins = 0;
  const byId = new Map<
    string,
    { title: string; units: number; coins: number }
  >();
  for (const o of filtered) {
    totalUnits += o.quantity;
    totalCoins += o.quantity * o.price;
    const cur = byId.get(o.itemId) || {
      title: o.itemTitle,
      units: 0,
      coins: 0,
    };
    cur.units += o.quantity;
    cur.coins += o.quantity * o.price;
    byId.set(o.itemId, cur);
  }
  const topItems = [...byId.entries()]
    .map(([id, v]) => ({ id, title: v.title, units: v.units, coins: v.coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 5);
  const recent = filtered.slice(0, 5);
  return {
    totalOrders,
    totalUnits,
    totalCoins,
    avgOrderCoins: totalOrders ? Math.round(totalCoins / totalOrders) : 0,
    topItems,
    recent,
  };
}

export type LowStockRow = { id: string; title: string; stock: number };

export async function getLowStockReport(threshold = 5): Promise<LowStockRow[]> {
  const managed = SHOP_ITEMS.filter(
    (i) =>
      i.type === "physical" || (i.type === "digital" && (i as any).limited),
  );
  if (!managed.length) return [];
  const m = await listStock(managed.map((i) => i.id));
  const rows: LowStockRow[] = [];
  for (const it of managed) {
    const s = Number.isFinite((m as any)[it.id])
      ? (m as any)[it.id]
      : (it as any).stock || 0;
    if (s <= threshold) rows.push({ id: it.id, title: it.title, stock: s });
  }
  rows.sort((a, b) => a.stock - b.stock);
  return rows;
}
