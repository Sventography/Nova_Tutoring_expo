// app/storage/purchases.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nova/purchases";

export type PurchaseMap = Record<string, true>;

// 🔒 Canonicalize IDs so shop, cursors, etc. all agree
export function canonPurchaseId(raw: string | null | undefined): string {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();

  // normalize separators
  v = v.replace(/-/g, "_");

  // handle known cursors
  if (!v.includes(":")) {
    if (v === "glow" || v === "cursor_glow") v = "cursor:glow";
    else if (v === "orb" || v === "cursor_orb") v = "cursor:orb";
    else if (
      v === "startrail" ||
      v === "star_trail" ||
      v === "cursor_startrail" ||
      v === "cursor_star_trail"
    ) {
      v = "cursor:star_trail";
    } else if (
      [
        "neon",
        "starry",
        "pink",
        "dark",
        "mint",
        "glitter",
        "blackgold",
        "black_gold",
        "crimson",
        "emerald",
        "neonpurple",
        "neon_purple",
        "silver",
      ].includes(v)
    ) {
      v = "theme:" + v;
    } else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long theme names → base
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
}

// Normalize any old structure into a clean { [id]: true } map
export function normalizePurchases(input: any): PurchaseMap {
  const out: PurchaseMap = {};
  if (!input) return out;

  // If we somehow stored an array like ["theme:neon", "cursor:glow"]
  if (Array.isArray(input)) {
    for (const raw of input) {
      const cid = canonPurchaseId(raw);
      if (cid) out[cid] = true;
    }
    return out;
  }

  // If it’s already an object, treat truthy values as owned
  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      if (!v) continue;
      const cid = canonPurchaseId(k);
      if (cid) out[cid] = true;
    }
    return out;
  }

  return out;
}

export async function loadPurchases(): Promise<PurchaseMap> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    return normalizePurchases(parsed);
  } catch {
    return {};
  }
}

export async function savePurchases(map: PurchaseMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map ?? {}));
  } catch {
    // ignore
  }
}

// Append an owned id without wiping the rest
export async function appendPurchase(id: string): Promise<PurchaseMap> {
  const cid = canonPurchaseId(id);
  if (!cid) return {};

  const current = await loadPurchases();
  if (!current[cid]) {
    current[cid] = true;
    await savePurchases(current);
  }
  return current;
}
