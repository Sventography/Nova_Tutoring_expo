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

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId, ready: userReady } = useUser() as any;

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
        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              coins: value,
            },
            { onConflict: "id" }
          );

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
    meta?: Record<string, any>
  ) => {
    if (!supabaseUserId) return;
    if (!delta) return;
    try {
      const payload: {
        user_id: string;
        amount: number;
        type: string;
        reference?: string | null;
      } = {
        user_id: supabaseUserId,
        amount: delta,
        type: reason || "coins_change",
        reference: meta ? JSON.stringify(meta).slice(0, 1000) : null,
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

        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: supabaseUserId,
              coins: nextCoins,
            },
            { onConflict: "id" }
          );

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
