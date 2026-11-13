// app/context/CursorContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { usePurchases } from "./PurchasesContext";

/**
 * Per-user cursor equip key:
 * - guest:  @nova/cursor.equipped.guest.v1
 * - user:   @nova/cursor.equipped.user.<uid>.v1
 */
const KEY_EQUIPPED_BASE = "@nova/cursor.equipped.v1";

type OwnedMap = Record<string, boolean>;

type Ctx = {
  // canonical cursor id: "cursor:glow" | "cursor:orb" | "cursor:star_trail" | null
  cursorId: string | null;
  setCursorId: (id: string | null) => Promise<void>;
  // alias for your shop.tsx (it calls setCursorById)
  setCursorById: (id: string | null) => Promise<void>;
  owned: OwnedMap;
  owns: (id: string) => boolean;
  reload: () => Promise<void>;
};

const CursorCtx = createContext<Ctx | null>(null);

/**
 * Canonical format: cursor:<name>
 * - trims/lowers
 * - forces cursor: prefix when missing
 * - normalizes hyphen/space to underscore
 * - fixes common variants (startrail)
 */
export function canonCursorId(id: string | null | undefined): string {
  let v = String(id || "").trim().toLowerCase();
  if (!v) return "";

  v = v.replace(/\s+/g, "");
  v = v.replace(/-/g, "_");

  // allow raw ids like "glow_cursor" or "star_trail_cursor"
  v = v.replace(/_cursor$/, "");

  // allow "cursor_glow" / "cursor:glow" / "glow"
  if (v.startsWith("cursor_")) v = "cursor:" + v.slice("cursor_".length);
  if (!v.startsWith("cursor:")) v = "cursor:" + v;

  // fix star trail variants
  if (v === "cursor:startrail") v = "cursor:star_trail";
  if (v === "cursor:startrailcursor") v = "cursor:star_trail";
  if (v === "cursor:star_trailcursor") v = "cursor:star_trail";

  return v;
}

const equippedKeyFor = (uid: string | null) =>
  uid ? `${KEY_EQUIPPED_BASE}.user.${uid}` : `${KEY_EQUIPPED_BASE}.guest`;

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();
  const { purchases, reload: reloadPurchases } = usePurchases();

  const [cursorId, _setCursorId] = useState<string | null>(null);

  // derive which cursors are owned from purchases map
  const owned: OwnedMap = useMemo(() => {
    const out: OwnedMap = {};
    for (const sku of Object.keys(purchases || {})) {
      if (sku.startsWith("cursor:")) {
        const cid = canonCursorId(sku);
        if (cid) out[cid] = true;
      }
    }
    return out;
  }, [purchases]);

  const owns = (id: string) => {
    const c = canonCursorId(id);
    if (!c) return false;
    return !!owned[c];
  };

  // hydrate equipped cursor per user / guest
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const key = equippedKeyFor(supabaseUserId ?? null);

        const raw = await AsyncStorage.getItem(key);
        const canon = canonCursorId(raw);

        if (!alive) return;

        if (!canon) {
          _setCursorId(null);
          return;
        }

        // If logged in and this cursor isn't owned, clear it
        if (supabaseUserId && !owned[canon]) {
          _setCursorId(null);
          await AsyncStorage.removeItem(key);
          return;
        }

        _setCursorId(canon);
      } catch (e) {
        console.warn("[CursorContext] hydrate error", e);
        if (alive) _setCursorId(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseUserId, owned]);

  const setCursorId = async (id: string | null) => {
    const c = canonCursorId(id);
    const next: string | null = c || null;
    const key = equippedKeyFor(supabaseUserId ?? null);

    try {
      if (!next) {
        _setCursorId(null);
        await AsyncStorage.removeItem(key);
        return;
      }

      // If logged in and this cursor isn't owned, ignore + clear
      if (supabaseUserId && !owned[next]) {
        console.warn("[CursorContext] refusing to equip unowned cursor", next);
        _setCursorId(null);
        await AsyncStorage.removeItem(key);
        return;
      }

      _setCursorId(next);
      await AsyncStorage.setItem(key, next);
    } catch (e) {
      console.warn("[CursorContext] setCursorId error", e);
    }
  };

  const reload = async () => {
    await reloadPurchases();
    // equipped value is already keyed by user; hydrate effect will react when owned map changes
  };

  const value = useMemo(
    () => ({
      cursorId,
      setCursorId,
      setCursorById: setCursorId,
      owned,
      owns,
      reload,
    }),
    [cursorId, owned]
  );

  return <CursorCtx.Provider value={value}>{children}</CursorCtx.Provider>;
}

export function useCursor() {
  const ctx = useContext(CursorCtx);
  if (!ctx) throw new Error("useCursor must be used inside CursorProvider");
  return ctx;
}
