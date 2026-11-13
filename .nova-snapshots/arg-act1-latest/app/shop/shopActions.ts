import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const KEY = {
  inventory: "@nova/shop/inventory/v1",
  equippedTheme: "@nova/shop/equipped/theme",
  equippedCursor: "@nova/shop/equipped/cursor",
};

export type ShopKind = "theme" | "cursor";
export type Inventory = {
  themes: Record<string, true>;
  cursors: Record<string, true>;
};

async function loadInventory(): Promise<Inventory> {
  const raw = await AsyncStorage.getItem(KEY.inventory);
  if (!raw) return { themes: {}, cursors: {} };
  try { return JSON.parse(raw) as Inventory; } catch { return { themes: {}, cursors: {} }; }
}
async function saveInventory(inv: Inventory) {
  await AsyncStorage.setItem(KEY.inventory, JSON.stringify(inv));
}
async function own(kind: ShopKind, id: string) {
  const inv = await loadInventory();
  if (kind === "theme") inv.themes[id] = true;
  else inv.cursors[id] = true;
  await saveInventory(inv);
}
export async function isOwned(kind: ShopKind, id: string) {
  const inv = await loadInventory();
  return kind === "theme" ? !!inv.themes[id] : !!inv.cursors[id];
}

export async function getEquipped(kind: ShopKind) {
  return AsyncStorage.getItem(kind === "theme" ? KEY.equippedTheme : KEY.equippedCursor);
}
export async function setEquipped(kind: ShopKind, id: string | null) {
  if (id) {
    await AsyncStorage.setItem(kind === "theme" ? KEY.equippedTheme : KEY.equippedCursor, id);
  } else {
    await AsyncStorage.removeItem(kind === "theme" ? KEY.equippedTheme : KEY.equippedCursor);
  }
}

/** Hook you can use inside your Shop screen */
export function useShopEquip(opts: {
  useTheme?: () => any;   // optional — pass your ThemeContext hook
  useCursor?: () => any;  // optional — pass your CursorContext hook
}) {
  const themeCtx = (() => { try { return opts.useTheme?.(); } catch { return null; } })();
  const cursorCtx = (() => { try { return opts.useCursor?.(); } catch { return null; } })();

  const [owned, setOwned] = useState<Inventory>({ themes: {}, cursors: {} });
  const [eqTheme, setEqTheme] = useState<string | null>(null);
  const [eqCursor, setEqCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const inv = await loadInventory();
      const t = await getEquipped("theme");
      const c = await getEquipped("cursor");
      setOwned(inv);
      setEqTheme(t);
      setEqCursor(c);
      setLoading(false);
    })();
  }, []);

  const purchase = async (kind: ShopKind, id: string) => {
    await own(kind, id);
    const inv = await loadInventory();
    setOwned(inv);
  };

  const equipTheme = async (id: string) => {
    await setEquipped("theme", id);
    setEqTheme(id);
    // Try your ThemeContext API if available
    const fn = (themeCtx as any)?.setThemeById || (themeCtx as any)?.equipTheme || (themeCtx as any)?.setTheme;
    if (typeof fn === "function") fn(id);
  };

  const unequipTheme = async () => {
    await setEquipped("theme", null);
    setEqTheme(null);
    const fn = (themeCtx as any)?.clearTheme || (themeCtx as any)?.equipTheme || (themeCtx as any)?.setThemeById;
    if (typeof fn === "function") fn(null);
  };

  const equipCursor = async (id: string) => {
    await setEquipped("cursor", id);
    setEqCursor(id);
    const fn = (cursorCtx as any)?.setCursorById || (cursorCtx as any)?.equipCursor || (cursorCtx as any)?.setCursor;
    if (typeof fn === "function") fn(id);
  };

  const unequipCursor = async () => {
    await setEquipped("cursor", null);
    setEqCursor(null);
    const fn = (cursorCtx as any)?.clearCursor || (cursorCtx as any)?.equipCursor || (cursorCtx as any)?.setCursorById;
    if (typeof fn === "function") fn(null);
  };

  const isOwnedMemo = useMemo(() => ({
    theme: (id: string) => !!owned.themes[id],
    cursor: (id: string) => !!owned.cursors[id],
  }), [owned]);

  const isEquipped = (kind: ShopKind, id: string) =>
    kind === "theme" ? eqTheme === id : eqCursor === id;

  const requireOwnershipThen = async (
    kind: ShopKind,
    id: string,
    onOwned: () => Promise<void> | void,
    onNeedBuy?: () => Promise<void> | void
  ) => {
    const ownedNow = await isOwned(kind, id);
    if (ownedNow) return onOwned();
    if (onNeedBuy) return onNeedBuy();
    Alert.alert("Unlock required", "You need to purchase this item before equipping.");
  };

  return {
    loading,
    owned,
    eqTheme,
    eqCursor,
    isOwned: isOwnedMemo,
    isEquipped,
    purchase,
    equipTheme,
    unequipTheme,
    equipCursor,
    unequipCursor,
    requireOwnershipThen,
  };
}
