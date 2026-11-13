import bus from "./bus";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCoins, addCoins, spendCoins, setCoins } from "./wallet";

export type ItemType =
  | "hat"
  | "beanie"
  | "plush"
  | "keychain"
  | "theme"
  | "bundle"
  | "cursor";

export type Inventory = {
  owned: Record<string, true>;
  equipped: {
    theme?: string | null;
    cursor?: string | null;
    plush?: string | null;
    hat?: string | null;
    beanie?: string | null;
    keychain?: string | null;
  };
};

const K_INVENTORY = "shop.inventory";

async function getInventoryRaw(): Promise<Inventory> {
  const raw = await AsyncStorage.getItem(K_INVENTORY);
  if (!raw) return { owned: {}, equipped: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { owned: {}, equipped: {} };
  }
}
async function saveInventory(inv: Inventory) {
  await AsyncStorage.setItem(K_INVENTORY, JSON.stringify(inv));
}

export { getCoins, addCoins, spendCoins, setCoins };

export async function getInventory(): Promise<Inventory> {
  return getInventoryRaw();
}
export async function isOwned(id: string) {
  const inv = await getInventoryRaw();
  return !!inv.owned[id];
}
export async function purchase(id: string, price: number) {
  if (await isOwned(id)) return { ok: true, already: true };
  const ok = await spendCoins(price);
  if (!ok) return { ok: false, reason: "not_enough_coins" as const };
  const inv = await getInventoryRaw();
  inv.owned[id] = true;
  await saveInventory(inv);
  bus.emit("equipped_changed", inv.equipped || {});
  return { ok: true };
}
export async function equip(type: ItemType, id: string) {
  const inv = await getInventoryRaw();
  if (!inv.owned[id]) return { ok: false, reason: "not_owned" as const };
  inv.equipped = inv.equipped || {};
  (inv.equipped as any)[type] = id;
  await saveInventory(inv);
  return { ok: true };
}
export async function getEquipped() {
  const inv = await getInventoryRaw();
  return inv.equipped || {};
}
