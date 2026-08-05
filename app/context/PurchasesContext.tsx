import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

type PurchaseMap = Record<string, true>;

export type AskPersonalityKey =
  | "encouraging"
  | "calm_focus"
  | "coach"
  | "playful"
  | "storyteller";

type PurchasesCtx = {
  purchases: PurchaseMap;
  purchasesReady: boolean;
  isOwned: (id: string | null | undefined) => boolean;
  ownedAskPersonalities: AskPersonalityKey[];
  isAskPersonalityOwned: (
    personality: AskPersonalityKey | string | null | undefined
  ) => boolean;
  grant: (id: string | string[]) => Promise<void>;
  revoke: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const BASE_KEY = "@nova/purchases";
const LEGACY_KEYS = ["@nova/purchases", "@nova/purchases.v2"];
const SHOP_PURCHASE_INVENTORY_EVENT = "shop:purchase_inventory";

function storageKey(userId: string | null): string {
  return userId ? `${BASE_KEY}/${userId}` : `${BASE_KEY}/guest`;
}

const Ctx = createContext<PurchasesCtx | null>(null);

/* --------------------------- ID canonicalization --------------------------- */
// Keep this in sync with canonId used in Shop so everything agrees.
function canonId(raw: string | null | undefined): string {
  if (!raw) return "";

  let v = String(raw).trim().toLowerCase();

  // normalize hyphens first
  v = v.replace(/-/g, "_");

  // -----------------------------
  // Ask upgrades / coin packs
  // -----------------------------
  if (
    v === "ask_memory_tier1" ||
    v === "ask_memory_tier2" ||
    v === "ask_memory_tier3" ||
    v === "ask_memory_tier4" ||
    v === "ask_personality_encouraging" ||
    v === "ask_personality_calm_focus" ||
    v === "ask_personality_coach" ||
    v === "ask_personality_playful" ||
    v === "ask_personality_storyteller" ||
    v === "pack_1k" ||
    v === "pack_5k" ||
    v === "coins_1000" ||
    v === "coins_5000" ||
    v === "bundle_neon"
  ) {
    return v;
  }

  // -----------------------------
  // Companions
  // Keep companions as companion:...
  // -----------------------------
  if (v.startsWith("companion")) {
    const rest = v.replace(/^companion[_:]?/, "");
    return rest ? `companion:${rest}` : "";
  }

  // -----------------------------
  // If no colon yet, normalize known theme/cursor values
  // -----------------------------
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
        "theme_neon",
        "starry",
        "theme_starry",
        "pink",
        "theme_pink",
        "dark",
        "theme_dark",
        "mint",
        "theme_mint",
        "glitter",
        "theme_glitter",
        "blackgold",
        "black_gold",
        "theme_blackgold",
        "theme_black_gold",
        "crimson",
        "theme_crimson",
        "crimson_dream",
        "theme_crimson_dream",
        "emerald",
        "theme_emerald",
        "emerald_wave",
        "theme_emerald_wave",
        "neonpurple",
        "neon_purple",
        "theme_neonpurple",
        "theme_neon_purple",
        "silver",
        "theme_silver",
        "silver_frost",
        "theme_silver_frost",
      ].includes(v)
    ) {
      const themeRest = v.replace(/^theme_/, "");
      v = "theme:" + themeRest;
    }

    // generic prefix cases
    else if (v.startsWith("cursor")) {
      v = "cursor:" + v.replace(/^cursor[_:]?/, "");
    } else if (v.startsWith("theme")) {
      v = "theme:" + v.replace(/^theme[_:]?/, "");
    }
  }

  // -----------------------------
  // Cursor aliases
  // -----------------------------
  if (v === "cursor:startrail") v = "cursor:star_trail";

  // -----------------------------
  // Theme aliases
  // -----------------------------
  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:neon_purple") v = "theme:neonpurple";

  // long-name → base ids
  if (v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver_frost") v = "theme:silver";

  return v;
}

/* ---------------------- Ask Memory tier configuration ---------------------- */

/**
 * Memory tiers:
 * - "free" → no purchase required
 * - "tier1"–"tier4" → unlocked via shop SKUs
 *
 * Make sure your Shop items use SKUs that canonicalize to these values
 * (e.g. "ask_memory_tier1" will stay "ask_memory_tier1" after canonId()).
 */
type AskMemoryTierId = "free" | "tier1" | "tier2" | "tier3" | "tier4";

const MEMORY_TIER_SKUS: Record<Exclude<AskMemoryTierId, "free">, string> = {
  tier1: canonId("ask_memory_tier1"),
  tier2: canonId("ask_memory_tier2"),
  tier3: canonId("ask_memory_tier3"),
  tier4: canonId("ask_memory_tier4"),
};

// How many messages (or roughly how much history) each tier grants.
// You can freely tweak these numbers later as you tune the product.
const MEMORY_TIER_LIMITS: Record<AskMemoryTierId, number> = {
  free: 5,
  tier1: 20,
  tier2: 50,
  tier3: 100,
  tier4: 250,
};

function computeHighestMemoryTier(purchases: PurchaseMap): AskMemoryTierId {
  if (purchases[MEMORY_TIER_SKUS.tier4]) return "tier4";
  if (purchases[MEMORY_TIER_SKUS.tier3]) return "tier3";
  if (purchases[MEMORY_TIER_SKUS.tier2]) return "tier2";
  if (purchases[MEMORY_TIER_SKUS.tier1]) return "tier1";
  return "free";
}

/* --------------------- Ask personality ownership helpers -------------------- */

const ASK_PERSONALITY_SKUS: Record<
  Exclude<AskPersonalityKey, "encouraging">,
  string
> = {
  calm_focus: canonId("ask_personality_calm_focus"),
  coach: canonId("ask_personality_coach"),
  playful: canonId("ask_personality_playful"),
  storyteller: canonId("ask_personality_storyteller"),
};

const ASK_PERSONALITY_ORDER: AskPersonalityKey[] = [
  "encouraging",
  "calm_focus",
  "coach",
  "playful",
  "storyteller",
];

function normalizeAskPersonalityKey(
  value: AskPersonalityKey | string | null | undefined
): AskPersonalityKey {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const aliases: Record<string, AskPersonalityKey> = {
    default: "encouraging",
    classic: "encouraging",
    classic_tutor: "encouraging",
    calm: "calm_focus",
    focused: "calm_focus",
    focus: "calm_focus",
    motivational_coach: "coach",
    hype_coach: "coach",
    fun: "playful",
    chill: "playful",
    story: "storyteller",
    story_mode: "storyteller",
  };

  const normalized = aliases[raw] || raw;

  return ASK_PERSONALITY_ORDER.includes(
    normalized as AskPersonalityKey
  )
    ? (normalized as AskPersonalityKey)
    : "encouraging";
}

function ownsAskPersonality(
  purchases: PurchaseMap,
  personality: AskPersonalityKey | string | null | undefined
): boolean {
  const normalized = normalizeAskPersonalityKey(personality);

  if (normalized === "encouraging") return true;

  const sku = ASK_PERSONALITY_SKUS[normalized];
  return !!purchases[sku];
}

function computeOwnedAskPersonalities(
  purchases: PurchaseMap
): AskPersonalityKey[] {
  return ASK_PERSONALITY_ORDER.filter((personality) =>
    ownsAskPersonality(purchases, personality)
  );
}

/* ------------------------- normalize + (de)serialize ------------------------ */

function normalizePurchases(obj: any): PurchaseMap {
  const out: PurchaseMap = {};
  if (!obj || typeof obj !== "object") return out;

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

type PurchaseRow = {
  sku?: string | null;
  item_id?: string | null;
};

function mergePurchaseMaps(...sources: any[]): PurchaseMap {
  const merged: PurchaseMap = {};

  for (const source of sources) {
    const normalized = normalizePurchases(source);
    for (const id of Object.keys(normalized)) {
      merged[id] = true;
    }
  }

  return merged;
}

function normalizeRowsToMap(rows: PurchaseRow[] | null): PurchaseMap {
  const out: PurchaseMap = {};
  if (!rows) return out;
  for (const row of rows) {
    const rawId = row.item_id ?? row.sku ?? null;
    const cid = canonId(rawId || null);
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

  // IMPORTANT:
  // includeLegacy = true  → also pull from old global keys
  // includeLegacy = false → ONLY per-user/guest key
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

export function PurchasesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    supabaseUserId,
    askPersonality,
    setAskPersonality,
  } = useUser();
  const [purchases, setPurchases] = useState<PurchaseMap>({});
  const purchasesRef = useRef<PurchaseMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    purchasesRef.current = purchases;
  }, [purchases]);

  console.log("[PurchasesContext DEBUG] supabaseUserId =", supabaseUserId);
  console.log("[PurchasesContext DEBUG] purchases =", purchases);

  /* --------------------- hydrate whenever the user changes --------------------- */
  useEffect(() => {
    let alive = true;

    // Clear immediately so we don't flash previous account's purchases
    setPurchases({});
    setHydrated(false);

    (async () => {
      const key = storageKey(supabaseUserId);
      console.log("[PurchasesContext] init for key =", key);

      try {
        // --------------------- GUEST MODE ---------------------
        if (!supabaseUserId) {
          console.log(
            "[PurchasesContext] guest mode, loading from AsyncStorage (with legacy)"
          );
          // Guests can see legacy keys so old installs don't lose entitlements.
          const guestPurchases = await loadLocalPurchases(key, true);
          console.log(
            "[PurchasesContext] loaded guest purchases (normalized):",
            guestPurchases
          );
          if (alive) {
            setPurchases(guestPurchases);
            await AsyncStorage.setItem(key, JSON.stringify(guestPurchases));
          }
          return;
        }

        // --------------------- LOGGED-IN MODE ---------------------
        console.log(
          "[PurchasesContext] logged in, merging local and remote ownership for",
          supabaseUserId
        );

        /*
         * Ownership must be additive. A stale purchases-table row set must not
         * erase a newer IAP grant already saved locally or in profiles.purchases.
         */
        const localPurchases = await loadLocalPurchases(key, false);
        let tablePurchases: PurchaseMap = {};
        let profilePurchases: PurchaseMap = {};

        try {
          const { data: rowsV1, error: errV1 } = await supabase
            .from("purchases")
            .select("item_id")
            .eq("user_id", supabaseUserId);

          if (errV1 && (errV1 as any).code === "42703") {
            const { data: rowsV2, error: errV2 } = await supabase
              .from("purchases")
              .select("sku")
              .eq("user_id", supabaseUserId);

            if (errV2) {
              console.warn(
                "[PurchasesContext] purchases table unavailable during hydrate:",
                errV2
              );
            } else {
              tablePurchases = normalizeRowsToMap(
                (rowsV2 as PurchaseRow[]) || null
              );
            }
          } else if (errV1) {
            console.warn(
              "[PurchasesContext] purchases table unavailable during hydrate:",
              errV1
            );
          } else {
            tablePurchases = normalizeRowsToMap(
              (rowsV1 as PurchaseRow[]) || null
            );
          }
        } catch (error) {
          console.warn(
            "[PurchasesContext] purchases table hydrate threw:",
            error
          );
        }

        try {
          const { data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select("purchases")
            .eq("id", supabaseUserId)
            .maybeSingle();

          if (profileError) {
            console.warn(
              "[PurchasesContext] profile purchase mirror unavailable:",
              profileError
            );
          } else {
            profilePurchases = normalizePurchases(profileRow?.purchases);
          }
        } catch (error) {
          console.warn(
            "[PurchasesContext] profile purchase mirror hydrate threw:",
            error
          );
        }

        const next = mergePurchaseMaps(
          localPurchases,
          profilePurchases,
          tablePurchases
        );

        console.log("[PurchasesContext] merged ownership:", next);

        if (alive) {
          purchasesRef.current = next;
          setPurchases(next);
          await AsyncStorage.setItem(key, JSON.stringify(next));
        }
      } catch (e) {
        console.warn("[PurchasesContext] init purchases error:", e);
        if (alive) setPurchases({});
      } finally {
        if (alive) setHydrated(true);
      }
    })();

    return () => {
      alive = false;
    };
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
          // Try new schema first: item_id + source
          const rowsNew = skus.map((id) => ({
            user_id: supabaseUserId,
            item_id: id,
            source: "coins" as const,
          }));

          const { error: insNew } = await supabase
            .from("purchases")
            .insert(rowsNew);

          if (insNew && (insNew as any).code === "42703") {
            // item_id/source doesn't exist → fall back to legacy schema (sku)
            console.warn(
              "[PurchasesContext] purchases table missing item_id/source; falling back to sku-only schema"
            );
            const rowsLegacy = skus.map((id) => ({
              user_id: supabaseUserId,
              sku: id,
            }));
            const { error: insLegacy } = await supabase
              .from("purchases")
              .insert(rowsLegacy);
            if (insLegacy) {
              console.warn(
                "[PurchasesContext] error inserting purchases rows (legacy):",
                insLegacy
              );
            } else {
              console.log(
                "[PurchasesContext] purchases table (legacy schema) updated OK with",
                rowsLegacy.length,
                "rows"
              );
            }
          } else if (insNew) {
            console.warn(
              "[PurchasesContext] error inserting purchases rows (new schema):",
              insNew
            );
          } else {
            console.log(
              "[PurchasesContext] purchases table updated OK with",
              rowsNew.length,
              "rows"
            );
          }
        } else {
          console.log(
            "[PurchasesContext] no purchased skus, purchases table cleared for user"
          );
        }

        // 2) Mirror into profiles.purchases JSON for backwards compatibility
        //    IMPORTANT: use UPDATE, not UPSERT, so we don't hit username NOT NULL.
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            purchases: toRemotePayload(normalized),
            updated_at: new Date().toISOString(),
          })
          .eq("id", supabaseUserId);

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

  /* ---------------- achievement purchase inventory baseline ---------------- */

  useEffect(() => {
    if (!hydrated) return;

    const normalized = normalizePurchases(purchases);
    const total = Object.keys(normalized).length;

    const emitInventory = () => {
      DeviceEventEmitter.emit(SHOP_PURCHASE_INVENTORY_EVENT, {
        total,
        userId: supabaseUserId ?? null,
      });
    };

    // Emit more than once because PurchasesProvider and AchievementsProvider
    // hydrate independently during startup. The achievement listener ignores
    // repeats after it has accepted its first non-zero baseline.
    emitInventory();
    const shortRetry = setTimeout(emitInventory, 250);
    const longRetry = setTimeout(emitInventory, 1000);

    return () => {
      clearTimeout(shortRetry);
      clearTimeout(longRetry);
    };
  }, [purchases, supabaseUserId, hydrated]);

  /* ------------------ sync Ask memory tier on purchases change --------------- */

  useEffect(() => {
    if (!hydrated) return;
    if (!supabaseUserId) return;

    const highestTier = computeHighestMemoryTier(purchases);
    const limit = MEMORY_TIER_LIMITS[highestTier];

    (async () => {
      try {
        console.log(
          "[PurchasesContext] updating ask memory tier in profiles:",
          { highestTier, limit }
        );
        const { error } = await supabase
          .from("profiles")
          .update({
            ask_memory_tier: highestTier,
            ask_memory_limit: limit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", supabaseUserId);

        if (error) {
          console.warn(
            "[PurchasesContext] profiles.ask_memory_* update error:",
            error
          );
        } else {
          console.log(
            "[PurchasesContext] profiles.ask_memory_* updated OK:",
            highestTier,
            limit
          );
        }
      } catch (e) {
        console.warn(
          "[PurchasesContext] error updating ask memory tier:",
          e
        );
      }
    })();
  }, [purchases, supabaseUserId, hydrated]);

  /* ------------- keep the selected teaching style valid after restore -------- */

  useEffect(() => {
    if (!hydrated) return;

    const selected = normalizeAskPersonalityKey(askPersonality);

    if (
      selected !== "encouraging" &&
      !ownsAskPersonality(purchases, selected)
    ) {
      void Promise.resolve(setAskPersonality("encouraging")).catch((error) => {
        console.warn(
          "[PurchasesContext] could not reset unavailable teaching style:",
          error
        );
      });
    }
  }, [
    askPersonality,
    hydrated,
    purchases,
    setAskPersonality,
  ]);

  /* ------------------------------ public helpers ----------------------------- */

  const isOwned = useCallback(
    (id: string | null | undefined) => {
      const cid = canonId(id);
      if (!cid) return false;
      return !!purchases[cid];
    },
    [purchases]
  );

  const isAskPersonalityOwned = useCallback(
    (
      personality: AskPersonalityKey | string | null | undefined
    ) => ownsAskPersonality(purchases, personality),
    [purchases]
  );

  const ownedAskPersonalities = useMemo(
    () => computeOwnedAskPersonalities(purchases),
    [purchases]
  );

  const grant = useCallback(
    async (id: string | string[]) => {
      console.log("[PurchasesContext] grant called with", id);

      const next: PurchaseMap = {
        ...purchasesRef.current,
      };
      const arr = Array.isArray(id) ? id : [id];

      for (const rawId of arr) {
        const cid = canonId(rawId);
        if (!cid) continue;
        next[cid] = true;
      }

      purchasesRef.current = next;
      setPurchases(next);

      const key = storageKey(supabaseUserId);
      await AsyncStorage.setItem(key, JSON.stringify(next));

      /*
       * Write the profile mirror before resolving. Shop waits for grant(), so
       * the backend can verify a newly purchased teaching style immediately
       * even before the normal purchases-table synchronization effect runs.
       */
      if (supabaseUserId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            purchases: toRemotePayload(next),
            updated_at: new Date().toISOString(),
          })
          .eq("id", supabaseUserId);

        if (error) {
          console.warn(
            "[PurchasesContext] immediate grant profile mirror error:",
            error
          );
        }
      }
    },
    [supabaseUserId]
  );

  const revoke = useCallback(
    async (id: string) => {
      console.log("[PurchasesContext] revoke called with", id);

      const cid = canonId(id);
      if (!cid) return;

      const next: PurchaseMap = {
        ...purchasesRef.current,
      };
      delete next[cid];

      purchasesRef.current = next;
      setPurchases(next);

      const key = storageKey(supabaseUserId);
      await AsyncStorage.setItem(key, JSON.stringify(next));

      if (supabaseUserId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            purchases: toRemotePayload(next),
            updated_at: new Date().toISOString(),
          })
          .eq("id", supabaseUserId);

        if (error) {
          console.warn(
            "[PurchasesContext] immediate revoke profile mirror error:",
            error
          );
        }
      }
    },
    [supabaseUserId]
  );

  const reload = useCallback(
    async () => {
      const key = storageKey(supabaseUserId);
      console.log("[PurchasesContext] reload called for key", key);

      try {
        if (supabaseUserId) {
          const localPurchases = await loadLocalPurchases(key, false);
          let tablePurchases: PurchaseMap = {};
          let profilePurchases: PurchaseMap = {};

          try {
            const { data: rowsV1, error: errV1 } = await supabase
              .from("purchases")
              .select("item_id")
              .eq("user_id", supabaseUserId);

            if (errV1 && (errV1 as any).code === "42703") {
              const { data: rowsV2, error: errV2 } = await supabase
                .from("purchases")
                .select("sku")
                .eq("user_id", supabaseUserId);

              if (errV2) {
                console.warn(
                  "[PurchasesContext] reload purchases table unavailable:",
                  errV2
                );
              } else {
                tablePurchases = normalizeRowsToMap(
                  (rowsV2 as PurchaseRow[]) || null
                );
              }
            } else if (errV1) {
              console.warn(
                "[PurchasesContext] reload purchases table unavailable:",
                errV1
              );
            } else {
              tablePurchases = normalizeRowsToMap(
                (rowsV1 as PurchaseRow[]) || null
              );
            }
          } catch (error) {
            console.warn(
              "[PurchasesContext] reload purchases table threw:",
              error
            );
          }

          try {
            const { data: profileRow, error: profileError } = await supabase
              .from("profiles")
              .select("purchases")
              .eq("id", supabaseUserId)
              .maybeSingle();

            if (profileError) {
              console.warn(
                "[PurchasesContext] reload profile mirror unavailable:",
                profileError
              );
            } else {
              profilePurchases = normalizePurchases(profileRow?.purchases);
            }
          } catch (error) {
            console.warn(
              "[PurchasesContext] reload profile mirror threw:",
              error
            );
          }

          const merged = mergePurchaseMaps(
            localPurchases,
            profilePurchases,
            tablePurchases
          );

          purchasesRef.current = merged;
          setPurchases(merged);
          await AsyncStorage.setItem(key, JSON.stringify(merged));
          console.log("[PurchasesContext] reload merged ownership:", merged);
          return;
        }

        // Guest reload: local only, with legacy merge
        const local = await loadLocalPurchases(
          key,
          supabaseUserId ? false : true
        );
        if (Object.keys(local).length > 0) {
          console.log(
            "[PurchasesContext] reload got guest purchases from AsyncStorage:",
            local
          );
          setPurchases(local);
          return;
        }

        console.log(
          "[PurchasesContext] reload found nothing for guest, clearing"
        );
        setPurchases({});
        await AsyncStorage.setItem(key, JSON.stringify({}));
      } catch (e) {
        console.warn("[PurchasesContext] reload error:", e);
      }
    },
    [supabaseUserId]
  );

  const clearAll = useCallback(
    async () => {
      const key = storageKey(supabaseUserId);
      console.log("[PurchasesContext] clearAll called for", key);
      const empty: PurchaseMap = {};
      purchasesRef.current = empty;
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
            console.warn(
              "[PurchasesContext] clearAll table error:",
              delError
            );
          } else {
            console.log("[PurchasesContext] clearAll table OK");
          }

          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              purchases: toRemotePayload(empty),
              updated_at: new Date().toISOString(),
            })
            .eq("id", supabaseUserId);

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
    },
    [supabaseUserId]
  );

  const value = useMemo(
    () => ({
      purchases,
      purchasesReady: hydrated,
      isOwned,
      ownedAskPersonalities,
      isAskPersonalityOwned,
      grant,
      revoke,
      reload,
      clearAll,
    }),
    [
      purchases,
      hydrated,
      isOwned,
      ownedAskPersonalities,
      isAskPersonalityOwned,
      grant,
      revoke,
      reload,
      clearAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePurchases() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePurchases must be used inside PurchasesProvider");
  return v;
}