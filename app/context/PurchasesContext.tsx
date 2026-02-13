import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

type PurchaseMap = Record<string, true>;

type PurchasesCtx = {
  purchases: PurchaseMap;
  isOwned: (id: string | null | undefined) => boolean;
  grant: (id: string | string[]) => Promise<void>;
  revoke: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const BASE_KEY = "@nova/purchases";
const LEGACY_KEYS = ["@nova/purchases", "@nova/purchases.v2"];

function storageKey(userId: string | null): string {
  return userId ? `${BASE_KEY}/${userId}` : `${BASE_KEY}/guest`;
}

const Ctx = createContext<PurchasesCtx | null>(null);

/* --------------------------- ID canonicalization --------------------------- */
// Keep this in sync with canonId used in Shop so everything agrees.
function canonId(raw: string | null | undefined): string {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();

  // normalize separators
  v = v.replace(/-/g, "_");

  if (!v.includes(":")) {
    // known cursors
    if (v === "glow" || v === "cursor_glow") {
      v = "cursor:glow";
    } else if (v === "orb" || v === "cursor_orb") {
      v = "cursor:orb";
    } else if (
      v === "startrail" ||
      v === "star_trail" ||
      v === "cursor_startrail" ||
      v === "cursor_star_trail"
    ) {
      v = "cursor:star_trail";
    }
    // known themes (base + variants)
    else if (
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
        "crimson_dream",
        "emerald_wave",
        "silver_frost",
      ].includes(v)
    ) {
      v = "theme:" + v;
    }
    // generic prefix cases
    else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // cursor aliases
  if (v === "cursor:startrail") v = "cursor:star_trail";

  // theme aliases
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long-name → base ids
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
}

/* ------------------------- normalize + (de)serialize ------------------------ */

function normalizePurchases(obj: any): PurchaseMap {
  const out: PurchaseMap = {};
  if (!obj || typeof obj !== "object") return out;

  // If it has an `owned` field, that's our real payload.
  const source =
    obj && typeof (obj as any).owned === "object" && (obj as any).owned !== null
      ? (obj as any).owned
      : obj;

  for (const [k, v] of Object.entries(source as Record<string, any>)) {
    if (!v) continue;
    const cid = canonId(k);
    if (!cid) continue;
    out[cid] = true;
  }
  return out;
}

function normalizeSkusToMap(rows: { sku?: string | null }[] | null): PurchaseMap {
  const out: PurchaseMap = {};
  if (!rows) return out;
  for (const row of rows) {
    const cid = canonId(row.sku || null);
    if (!cid) continue;
    out[cid] = true;
  }
  return out;
}

async function loadLocalPurchases(
  primaryKey: string,
  includeLegacy: boolean
): Promise<PurchaseMap> {
  let merged: Record<string, any> = {};

  const rawPrimary = await AsyncStorage.getItem(primaryKey);
  if (rawPrimary) {
    try {
      const parsed = JSON.parse(rawPrimary);
      if (parsed && typeof parsed === "object") {
        merged = { ...merged, ...parsed };
      }
    } catch {
      // ignore
    }
  }

  if (includeLegacy) {
    for (const key of LEGACY_KEYS) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          merged = { ...merged, ...parsed };
        }
      } catch {
        // ignore
      }
    }
  }

  return normalizePurchases(merged);
}

// Shape we store in profiles.purchases (mirror / backup)
function toRemotePayload(map: PurchaseMap) {
  return { owned: map, version: 1 };
}

/* ----------------------------- main provider -------------------------------- */

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();
  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const [hydrated, setHydrated] = useState(false);

  console.log("[PurchasesContext DEBUG] supabaseUserId =", supabaseUserId);
  console.log("[PurchasesContext DEBUG] purchases =", purchases);

  /* --------------------- hydrate whenever the user changes --------------------- */
  useEffect(() => {
    (async () => {
      const key = storageKey(supabaseUserId);
      console.log("[PurchasesContext] init for key =", key);

      try {
        if (!supabaseUserId) {
          // Guest: local only, but also try legacy keys once
          console.log(
            "[PurchasesContext] guest mode, loading from AsyncStorage (with legacy)"
          );
          const guestPurchases = await loadLocalPurchases(key, true);
          console.log(
            "[PurchasesContext] loaded guest purchases (normalized):",
            guestPurchases
          );
          setPurchases(guestPurchases);
          await AsyncStorage.setItem(key, JSON.stringify(guestPurchases));
          return;
        }

        // Logged-in: primary source is Supabase purchases table
        console.log(
          "[PurchasesContext] logged in, loading from Supabase purchases table for",
          supabaseUserId
        );

        let next: PurchaseMap | null = null;

        // 1) Try purchases table
        const { data: rows, error: rowsError } = await supabase
          .from("purchases")
          .select("sku")
          .eq("user_id", supabaseUserId);

        if (rowsError) {
          console.warn("[PurchasesContext] load purchases table error:", rowsError);
        } else if (rows && rows.length > 0) {
          console.log("[PurchasesContext] found rows in purchases table:", rows.length);
          next = normalizeSkusToMap(rows);
        }

        // 2) If table is empty, try legacy profiles.purchases JSON
        if (!next || Object.keys(next).length === 0) {
          console.log(
            "[PurchasesContext] no purchases in table, checking profiles.purchases"
          );
          const { data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select("purchases")
            .eq("id", supabaseUserId)
            .maybeSingle();

          if (profileError) {
            console.warn(
              "[PurchasesContext] load profile.purchases error:",
              profileError
            );
          }

          if (
            profileRow &&
            profileRow.purchases &&
            typeof profileRow.purchases === "object"
          ) {
            console.log(
              "[PurchasesContext] found purchases in profile JSON:",
              profileRow.purchases
            );
            next = normalizePurchases(profileRow.purchases);
          }
        }

        // 3) If still nothing, fall back to local (and legacy keys)
        if (!next || Object.keys(next).length === 0) {
          console.log(
            "[PurchasesContext] no remote purchases, checking local storage for user",
            key
          );
          const local = await loadLocalPurchases(key, true);
          if (Object.keys(local).length > 0) {
            console.log(
              "[PurchasesContext] loaded local purchases for user (normalized):",
              local
            );
            next = local;
          }
        }

        if (!next) {
          next = {};
        }

        setPurchases(next);
        await AsyncStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn("[PurchasesContext] init purchases error:", e);
        setPurchases({});
      } finally {
        setHydrated(true);
      }
    })();
  }, [supabaseUserId]);

  /* ---------------------- persist when purchases change ---------------------- */
  useEffect(() => {
    // Don’t sync to Supabase until we’ve done the initial hydrate
    if (!hydrated) {
      return;
    }

    const key = storageKey(supabaseUserId);
    const normalized = normalizePurchases(purchases);

    // Always keep a local cache (guest & logged-in)
    AsyncStorage.setItem(key, JSON.stringify(normalized)).catch(() => {});

    if (!supabaseUserId) {
      console.log(
        "[PurchasesContext] purchases changed in guest mode, local only"
      );
      return;
    }

    // Logged in: sync both the purchases table and profiles.purchases JSON mirror
    (async () => {
      console.log(
        "[PurchasesContext] syncing purchases to Supabase (normalized):",
        normalized
      );
      const skus = Object.keys(normalized);

      try {
        // 1) Replace rows in purchases table for this user
        console.log(
          "[PurchasesContext] replacing purchases rows in table for user",
          supabaseUserId
        );
        const { error: delError } = await supabase
          .from("purchases")
          .delete()
          .eq("user_id", supabaseUserId);

        if (delError) {
          console.warn(
            "[PurchasesContext] error deleting old purchases rows:",
            delError
          );
        }

        if (skus.length > 0) {
          const rows = skus.map((sku) => ({
            user_id: supabaseUserId,
            sku,
          }));
          const { error: insError } = await supabase
            .from("purchases")
            .insert(rows);

          if (insError) {
            console.warn(
              "[PurchasesContext] error inserting purchases rows:",
              insError
            );
          } else {
            console.log(
              "[PurchasesContext] purchases table updated OK with",
              rows.length,
              "rows"
            );
          }
        } else {
          console.log(
            "[PurchasesContext] no purchased skus, purchases table cleared for user"
          );
        }

        // 2) Mirror into profiles.purchases JSON for backwards compatibility
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              purchases: toRemotePayload(normalized),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (profileError) {
          console.warn(
            "[PurchasesContext] Supabase profiles.purchases update error:",
            profileError
          );
        } else {
          console.log(
            "[PurchasesContext] profiles.purchases JSON mirror updated OK"
          );
        }
      } catch (e) {
        console.warn("[PurchasesContext] sync purchases threw:", e);
      }
    })();
  }, [purchases, supabaseUserId, hydrated]);

  /* ------------------------------ public helpers ----------------------------- */

  const isOwned = useCallback(
    (id: string | null | undefined) => {
      const cid = canonId(id);
      if (!cid) return false;
      return !!purchases[cid];
    },
    [purchases]
  );

  const grant = useCallback(async (id: string | string[]) => {
    console.log("[PurchasesContext] grant called with", id);
    setPurchases((prev) => {
      const next: PurchaseMap = { ...prev };
      const arr = Array.isArray(id) ? id : [id];
      for (const k of arr) {
        const cid = canonId(k);
        if (!cid) continue;
        next[cid] = true;
      }
      return next;
    });
  }, []);

  const revoke = useCallback(async (id: string) => {
    console.log("[PurchasesContext] revoke called with", id);
    const cid = canonId(id);
    if (!cid) return;
    setPurchases((prev) => {
      const next = { ...prev };
      delete next[cid];
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    const key = storageKey(supabaseUserId);
    console.log("[PurchasesContext] reload called for key", key);

    try {
      if (supabaseUserId) {
        // Try purchases table first
        const { data: rows, error: rowsError } = await supabase
          .from("purchases")
          .select("sku")
          .eq("user_id", supabaseUserId);

        if (!rowsError && rows && rows.length > 0) {
          console.log(
            "[PurchasesContext] reload got purchases from table:",
            rows
          );
          const norm = normalizeSkusToMap(rows);
          setPurchases(norm);
          await AsyncStorage.setItem(key, JSON.stringify(norm));
          return;
        }

        if (rowsError) {
          console.warn(
            "[PurchasesContext] reload purchases table error:",
            rowsError
          );
        }

        // Fallback: profiles.purchases JSON
        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("purchases")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (
          !profileError &&
          profileRow &&
          profileRow.purchases &&
          typeof profileRow.purchases === "object"
        ) {
          console.log(
            "[PurchasesContext] reload got purchases from profile JSON:",
            profileRow.purchases
          );
          const norm = normalizePurchases(profileRow.purchases);
          setPurchases(norm);
          await AsyncStorage.setItem(key, JSON.stringify(norm));
          return;
        }

        if (profileError) {
          console.warn(
            "[PurchasesContext] reload profile.purchases error:",
            profileError
          );
        }
      }

      // Fallback: local + legacy
      const local = await loadLocalPurchases(key, true);
      if (Object.keys(local).length > 0) {
        console.log(
          "[PurchasesContext] reload got purchases from AsyncStorage:",
          local
        );
        setPurchases(local);
        return;
      }

      console.log("[PurchasesContext] reload found nothing, clearing");
      setPurchases({});
    } catch (e) {
      console.warn("[PurchasesContext] reload error:", e);
    }
  }, [supabaseUserId]);

  const clearAll = useCallback(async () => {
    const key = storageKey(supabaseUserId);
    console.log("[PurchasesContext] clearAll called for", key);
    const empty: PurchaseMap = {};
    setPurchases(empty);
    await AsyncStorage.setItem(key, JSON.stringify(empty));

    if (supabaseUserId) {
      try {
        // Clear both the table and the profile mirror
        const { error: delError } = await supabase
          .from("purchases")
          .delete()
          .eq("user_id", supabaseUserId);

        if (delError) {
          console.warn("[PurchasesContext] clearAll table error:", delError);
        } else {
          console.log("[PurchasesContext] clearAll table OK");
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              purchases: toRemotePayload(empty),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (profileError) {
          console.warn(
            "[PurchasesContext] clearAll Supabase error:",
            profileError
          );
        } else {
          console.log("[PurchasesContext] clearAll Supabase OK");
        }
      } catch (e) {
        console.warn("[PurchasesContext] clearAll threw:", e);
      }
    }
  }, [supabaseUserId]);

  const value = useMemo(
    () => ({ purchases, isOwned, grant, revoke, reload, clearAll }),
    [purchases, isOwned, grant, revoke, reload, clearAll]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePurchases() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePurchases must be used inside PurchasesProvider");
  return v;
}
