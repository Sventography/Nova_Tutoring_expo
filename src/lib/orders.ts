import AsyncStorage from "@react-native-async-storage/async-storage";

export type Order = {
  id: string;
  itemId: string;
  itemTitle: string;
  price: number;
  quantity: number;
  name: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  createdAt: number;
  status: "pending" | "processing" | "shipped";
};

const K = "orders.list";

export async function listOrders(): Promise<Order[]> {
  const raw = await AsyncStorage.getItem(K);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export async function setOrders(list: Order[]) {
  await AsyncStorage.setItem(K, JSON.stringify(list));
}

export async function addOrder(o: Order) {
  const cur = await listOrders();
  cur.unshift(o);
  await setOrders(cur);
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order | null> {
  const list = await listOrders();
  const idx = list.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], status };
  await setOrders(list);
  return list[idx];
}

export function validateEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function ordersToCSV(list: Order[]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = [
    "Order ID",
    "Item",
    "Item ID",
    "Qty",
    "Unit Price",
    "Total Coins",
    "Name",
    "Email",
    "Address1",
    "Address2",
    "City",
    "State",
    "ZIP",
    "Country",
    "Status",
    "Created At",
  ];
  const rows = list.map((o) => [
    o.id,
    o.itemTitle,
    o.itemId,
    o.quantity,
    o.price,
    o.quantity * o.price,
    o.name,
    o.email,
    o.address1,
    o.address2 || "",
    o.city,
    o.state,
    o.zip,
    o.country,
    o.status,
    new Date(o.createdAt).toISOString(),
  ]);
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
