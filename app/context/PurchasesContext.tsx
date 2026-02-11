// app/context/PurchasesContext.tsx
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

// Shape we store in Supabase
function toRemotePayload(map: PurchaseMap) {
  return { owned: map, version: 1 };
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();
  const [purchases, setPurchases] = useState<PurchaseMap>({});

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

        // Logged-in: Supabase primary
        console.log(
          "[PurchasesContext] logged in, loading from Supabase for",
          supabaseUserId
        );
        const { data, error } = await supabase
          .from("profiles")
          .select("purchases")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (error) {
          console.warn("[PurchasesContext] load purchases error:", error);
        }

        let next: PurchaseMap | null = null;

        if (data && data.purchases && typeof data.purchases === "object") {
          console.log(
            "[PurchasesContext] found purchases in Supabase:",
            data.purchases
          );
          next = normalizePurchases(data.purchases);
        } else {
          console.log(
            "[PurchasesContext] no purchases in Supabase, checking local",
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

        // If profile had no purchases yet, migrate normalized local → Supabase
        if (supabaseUserId && (!data || !data.purchases)) {
          console.log(
            "[PurchasesContext] migrating purchases up to Supabase:",
            next
          );
          try {
            const { error: upError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: supabaseUserId,
                  purchases: toRemotePayload(next),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" }
              );

            if (upError) {
              console.warn(
                "[PurchasesContext] migrate purchases to Supabase error:",
                upError
              );
            } else {
              console.log(
                "[PurchasesContext] migrated purchases to Supabase OK"
              );
            }
          } catch (e) {
            console.warn(
              "[PurchasesContext] migrate purchases to Supabase threw:",
              e
            );
          }
        }
      } catch (e) {
        console.warn("[PurchasesContext] init purchases error:", e);
        setPurchases({});
      }
    })();
  }, [supabaseUserId]);

  /* ---------------------- persist when purchases change ---------------------- */
  useEffect(() => {
    const key = storageKey(supabaseUserId);
    const normalized = normalizePurchases(purchases);

    AsyncStorage.setItem(key, JSON.stringify(normalized)).catch(() => {});

    if (!supabaseUserId) {
      console.log(
        "[PurchasesContext] purchases changed in guest mode, local only"
      );
      return;
    }

    (async () => {
      console.log(
        "[PurchasesContext] syncing purchases to Supabase (normalized):",
        normalized
      );
      try {
        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              purchases: toRemotePayload(normalized),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (error) {
          console.warn("[PurchasesContext] Supabase update error:", error);
        } else {
          console.log("[PurchasesContext] Supabase purchases updated OK");
        }
      } catch (e) {
        console.warn("[PurchasesContext] sync purchases threw:", e);
      }
    })();
  }, [purchases, supabaseUserId]);

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
        const { data, error } = await supabase
          .from("profiles")
          .select("purchases")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (
          !error &&
          data &&
          data.purchases &&
          typeof data.purchases === "object"
        ) {
          console.log(
            "[PurchasesContext] reload got purchases from Supabase:",
            data.purchases
          );
          const norm = normalizePurchases(data.purchases);
          setPurchases(norm);
          await AsyncStorage.setItem(key, JSON.stringify(norm));
          return;
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
        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              purchases: toRemotePayload(empty),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (error) {
          console.warn("[PurchasesContext] clearAll Supabase error:", error);
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
