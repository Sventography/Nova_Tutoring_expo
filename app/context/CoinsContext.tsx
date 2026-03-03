// app/context/CoinsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

type CoinsContextValue = {
  coins: number;
  loading: boolean;
  ready: boolean;
  /**
   * Directly set coins to a value or updater.
   * This will sync to Supabase for logged-in users
   * and to AsyncStorage for guests.
   */
  setCoins: (
    valueOrUpdater: number | ((prev: number) => number),
    opts?: { reason?: string; meta?: Record<string, any> }
  ) => Promise<void>;
  /**
   * Add (or subtract) coins by a delta.
   */
  addCoins: (
    delta: number,
    reason?: string,
    meta?: Record<string, any>
  ) => Promise<void>;
  /**
   * Manually trigger a reload from Supabase / storage.
   */
  refreshCoins: () => Promise<void>;
};

const CoinsContext = createContext<CoinsContextValue | undefined>(undefined);

const GUEST_COINS_KEY = "@nova/coins:guest";
const USER_COINS_PREFIX = "@nova/coins:user:";

function getUserCoinsKey(userId: string | null): string {
  if (!userId) return GUEST_COINS_KEY;
  return `${USER_COINS_PREFIX}${userId}`;
}

/**
 * Best-effort helper to derive a **non-null** username for profile upserts.
 * We try, in order:
 *  - profile.username / profile.name
 *  - supabaseUser.user_metadata.username / email prefix
 *  - fallback: student_<first-8-chars-of-user-id>
 */
function getSafeUsername(
  profile: any,
  supabaseUser: any,
  supabaseUserId: string | null
): string | null {
  const fromProfile =
    (profile?.username && String(profile.username).trim()) ||
    (profile?.name && String(profile.name).trim());

  const fromMeta =
    (supabaseUser?.user_metadata?.username &&
      String(supabaseUser.user_metadata.username).trim()) ||
    (supabaseUser?.email &&
      String(supabaseUser.email).split("@")[0]?.trim());

  const fallback = supabaseUserId
    ? `student_${String(supabaseUserId).slice(0, 8)}`
    : null;

  const raw = fromProfile || fromMeta || fallback;
  if (!raw) return null;

  const trimmed = String(raw).trim();
  return trimmed || fallback;
}

export function CoinsProvider({ children }: { children: ReactNode }) {
  // We also grab profile + supabaseUser (if exposed) so we can build a safe username
  const {
    supabaseUserId,
    ready: userReady,
    profile,
    user: supabaseUser,
  } = useUser() as any;

  const [coins, setCoinsState] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  const persistCoins = async (value: number) => {
    try {
      const key = getUserCoinsKey(supabaseUserId ?? null);

      // Always keep a local cache so the app feels snappy
      await AsyncStorage.setItem(key, String(value));

      // If we have a Supabase user, sync to profiles table as source of truth
      if (supabaseUserId) {
        const safeUsername = getSafeUsername(
          profile,
          supabaseUser,
          supabaseUserId
        );

        const payload: any = {
          id: supabaseUserId,
          coins: value,
        };

        // Only send username if we actually have something non-empty
        if (safeUsername) {
          payload.username = safeUsername;
        }

        const { error } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.warn("[CoinsContext] Supabase upsert error:", error);
        }
      }
    } catch (err) {
      console.warn("[CoinsContext] persistCoins error:", err);
    }
  };

  const logTransaction = async (
    delta: number,
    reason?: string,
    _meta?: Record<string, any>
  ) => {
    if (!supabaseUserId) return;
    if (!delta) return;

    try {
      // Match the *current* transactions table:
      // user_id (uuid, not null)
      // amount (numeric/bigint, not null)
      // kind   (text, not null)
      const payload: {
        user_id: string;
        amount: number;
        kind: string;
      } = {
        user_id: supabaseUserId,
        amount: delta,
        kind: reason || "coins_change",
      };

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) {
        console.warn("[CoinsContext] logTransaction error:", error);
      }
    } catch (err) {
      console.warn("[CoinsContext] logTransaction threw:", err);
    }
  };

  const loadFromStorageOnly = async (): Promise<number> => {
    const key = getUserCoinsKey(supabaseUserId ?? null);
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const loadFromSupabase = async (): Promise<number> => {
    if (!supabaseUserId) {
      // Guest path
      return loadFromStorageOnly();
    }

    // Logged-in path: Supabase is source of truth, but we also consider any
    // existing local guest balance once (for first-time profile creation).
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, coins")
        .eq("id", supabaseUserId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.warn("[CoinsContext] Supabase select error:", error);
      }

      let nextCoins = 0;

      if (data && typeof data.coins === "number") {
        nextCoins = data.coins;
      } else {
        // No profile row yet – use any local cache as a seed if it exists
        const localSeed = await loadFromStorageOnly();
        nextCoins = localSeed;

        const safeUsername = getSafeUsername(
          profile,
          supabaseUser,
          supabaseUserId
        );

        const payload: any = {
          id: supabaseUserId,
          coins: nextCoins,
        };

        if (safeUsername) {
          payload.username = safeUsername;
        }

        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" });

        if (upsertError) {
          console.warn(
            "[CoinsContext] Supabase upsert (create) error:",
            upsertError
          );
        }
      }

      // Update local cache for this user
      const key = getUserCoinsKey(supabaseUserId);
      await AsyncStorage.setItem(key, String(nextCoins));

      return nextCoins;
    } catch (err) {
      console.warn("[CoinsContext] loadFromSupabase error:", err);
      // Fallback to local cache if Supabase fails
      return loadFromStorageOnly();
    }
  };

  const refreshCoins = async () => {
    if (!userReady) return;
    setLoading(true);
    try {
      const value = await loadFromSupabase();
      setCoinsState(value);
      setReady(true);
    } catch (err) {
      console.warn("[CoinsContext] refreshCoins error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Initial / reactive load when auth state changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userReady) return;
      setLoading(true);
      try {
        const value = await loadFromSupabase();
        if (!cancelled) {
          setCoinsState(value);
          setReady(true);
        }
      } catch (err) {
        console.warn("[CoinsContext] initial load error:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [supabaseUserId, userReady]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const setCoins = async (
    valueOrUpdater: number | ((prev: number) => number),
    opts?: { reason?: string; meta?: Record<string, any> }
  ) => {
    setCoinsState((prev) => {
      const next =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (p: number) => number)(prev)
          : valueOrUpdater;

      const delta = next - prev;

      // Fire-and-forget persistence + transaction logging
      persistCoins(next).catch((err) =>
        console.warn("[CoinsContext] persistCoins error:", err)
      );

      if (delta) {
        logTransaction(delta, opts?.reason || "set_coins", opts?.meta).catch(
          (err) =>
            console.warn("[CoinsContext] logTransaction(setCoins) error:", err)
        );
      }

      return next;
    });
  };

  const addCoins = async (
    delta: number,
    reason?: string,
    meta?: Record<string, any>
  ) => {
    if (!delta) return;
    setCoinsState((prev) => {
      const next = prev + delta;

      // Persist new balance
      persistCoins(next).catch((err) =>
        console.warn("[CoinsContext] persistCoins error:", err)
      );

      // Log transaction row for Supabase ledger
      logTransaction(delta, reason || "add_coins", meta).catch((err) =>
        console.warn("[CoinsContext] logTransaction(addCoins) error:", err)
      );

      try {
        (globalThis as any).novaTrack?.("coins_change", {
          delta,
          reason,
          meta,
        });
      } catch {
        // tracking is best-effort
      }

      return next;
    });
  };

  const value: CoinsContextValue = {
    coins,
    loading,
    ready,
    setCoins,
    addCoins,
    refreshCoins,
  };

  return (
    <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>
  );
}

export function useCoins(): CoinsContextValue {
  const ctx = useContext(CoinsContext);
  if (!ctx) {
    throw new Error("useCoins must be used within a CoinsProvider");
  }
  return ctx;
}