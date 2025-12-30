import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * IMPORTANT:
 * These keys MUST match what your Shop uses.
 * In your shop.tsx you have:
 *   PURCHASES_KEY = "@nova/purchases"
 *   CURSOR_KEY    = "@nova/cursor"
 */
const KEY_EQUIPPED = "@nova/cursor";
const KEY_PURCHASES = "@nova/purchases";

type OwnedMap = Record<string, boolean>;

type Ctx = {
  cursorId: string; // canonical cursor id: "cursor:glow" | "cursor:orb" | "cursor:star_trail" | ...
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

async function readJSON(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeOwnedMap(purchases: any): OwnedMap {
  const out: OwnedMap = {};
  const obj = purchases && typeof purchases === "object" ? purchases : {};

  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const owned = !!(v?.owned ?? v === true);
    if (!owned) continue;

    // store canonical cursor ids for cursor items
    const ck = canonCursorId(k);
    if (ck) out[ck] = true;

    // also honor already-canonical ids like "cursor:glow"
    if (String(k).includes(":")) out[canonCursorId(k)] = true;

    // if someone stored "glow_cursor" etc:
    const legacy = canonCursorId(String(k));
    if (legacy) out[legacy] = true;
  }

  return out;
}

export function CursorProvider({ children }: { children: React.ReactNode }) {
  // default cursor for mobile overlay
  const [cursorId, _setCursorId] = useState<string>("cursor:star_trail");
  const [owned, setOwned] = useState<OwnedMap>({});

  const hydrate = async () => {
    const [equippedRaw, purchasesRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_EQUIPPED),
      readJSON(KEY_PURCHASES),
    ]);

    const nextOwned = normalizeOwnedMap(purchasesRaw);
    setOwned(nextOwned);

    const equipped = canonCursorId(equippedRaw);
    if (equipped) _setCursorId(equipped);
    else _setCursorId("cursor:star_trail");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await hydrate();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setCursorId = async (id: string | null) => {
    const c = canonCursorId(id);
    const next = c || "cursor:star_trail";
    _setCursorId(next);
    try {
      await AsyncStorage.setItem(KEY_EQUIPPED, next);
    } catch {}
  };

  const owns = (id: string) => {
    const c = canonCursorId(id);
    // allow default even if not purchased
    if (!c) return false;
    if (c === "cursor:star_trail") return true;
    return !!owned[c];
  };

  const value = useMemo(
    () => ({
      cursorId,
      setCursorId,
      setCursorById: setCursorId, // alias for shop.tsx
      owned,
      owns,
      reload: hydrate,
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
