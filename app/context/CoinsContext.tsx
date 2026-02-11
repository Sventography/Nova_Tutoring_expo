// app/context/CoinsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { supabase } from "../lib/supabase"; // 🔗 Supabase client

type CoinsContextValue = {
  coins: number;
  loading: boolean;
  addCoins: (delta: number) => Promise<void>;
  setCoins: (value: number) => Promise<void>;
  resetCoins: () => Promise<void>;
};

const CoinsContext = createContext<CoinsContextValue | null>(null);

// Local storage layout:
// - Guest: "@nova/coins.guest.v1"
// - Logged in: "@nova/coins.user.<supabaseUserId>.v1"
const GUEST_KEY = "@nova/coins.guest.v1";
const userKey = (uid: string | null) =>
  uid ? `@nova/coins.user.${uid}.v1` : GUEST_KEY;

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId } = useUser();
  const [coins, setCoinsState] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔄 Load coins whenever the active Supabase user changes.
  // Order of truth:
  //  1) Supabase profiles.coins (if logged in)
  //  2) Per-user AsyncStorage key (for that Supabase id)
  //  3) Guest AsyncStorage key (one-time migration)
  //  4) 0
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const uid = supabaseUserId;

        // ------------------ LOGGED-IN PATH ------------------
        if (uid) {
          let next: number | null = null;

          // 1) Try Supabase first
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("coins")
              .eq("id", uid)
              .maybeSingle();

            if (!error && data && typeof data.coins === "number") {
              next = Number.isFinite(data.coins) ? data.coins : 0;
            }
          } catch (err) {
            console.warn("[CoinsContext] Supabase coins load error:", err);
          }

          // 2) If Supabase has no coins, fall back to local per-user key
          if (next === null) {
            const keyForUser = userKey(uid);
            const rawUser = await AsyncStorage.getItem(keyForUser);
            if (rawUser != null) {
              const parsedUser = Number(rawUser);
              if (Number.isFinite(parsedUser)) {
                next = parsedUser;
              }
            }
          }

          // 3) One-time migration: guest → user
          if (next === null) {
            const rawGuest = await AsyncStorage.getItem(GUEST_KEY);
            if (rawGuest != null) {
              const guestVal = Number(rawGuest);
              if (Number.isFinite(guestVal) && guestVal > 0) {
                next = guestVal;
                // Adopt guest coins into user-local key
                const keyForUser = userKey(uid);
                await AsyncStorage.setItem(keyForUser, String(guestVal));
              }
            }
          }

          if (next === null) next = 0;

          // 4) Keep per-user AsyncStorage in sync
          try {
            const keyForUser = userKey(uid);
            await AsyncStorage.setItem(keyForUser, String(next));
          } catch {}

          // 5) Ensure Supabase row has the same value
          try {
            await supabase
              .from("profiles")
              .upsert(
                { id: uid, coins: next },
                { onConflict: "id" }
              );
          } catch (err) {
            console.warn(
              "[CoinsContext] Supabase coins upsert during load failed:",
              err
            );
          }

          if (alive) {
            setCoinsState(next);
          }
        }
        // ------------------ GUEST PATH ------------------
        else {
          const rawGuest = await AsyncStorage.getItem(GUEST_KEY);
          let next = rawGuest != null ? Number(rawGuest) : 0;
          if (!Number.isFinite(next)) next = 0;
          if (alive) {
            setCoinsState(next);
          }
        }
      } catch (err) {
        console.warn("[CoinsContext] load error:", err);
        if (alive) {
          setCoinsState(0);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseUserId]);

  /**
   * Persist coins locally AND sync to Supabase (if logged in).
   * This only runs from event handlers/effects, never during render,
   * so it won't trigger "setState while rendering a different component".
   */
  const persist = useCallback(
    async (next: number) => {
      const safe = Math.max(0, Number.isFinite(next) ? next : 0);

      // 1) React state
      setCoinsState(safe);

      // 2) Local storage (guest or user-scoped key)
      try {
        const key = userKey(supabaseUserId);
        await AsyncStorage.setItem(key, String(safe));
      } catch {
        // ignore storage errors
      }

      // 3) Supabase sync (only if logged in)
      if (supabaseUserId) {
        try {
          const { error } = await supabase
            .from("profiles")
            .upsert(
              { id: supabaseUserId, coins: safe },
              { onConflict: "id" }
            );

          if (error) {
            console.warn(
              "[CoinsContext] Failed to sync coins to Supabase",
              error
            );
          }
        } catch (err) {
          console.warn(
            "[CoinsContext] Failed to sync coins to Supabase (threw)",
            err
          );
        }
      }
    },
    [supabaseUserId]
  );

  const addCoins = useCallback(
    async (delta: number) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      const next = Math.max(0, coins + delta);
      await persist(next);
    },
    [coins, persist]
  );

  const setCoins = useCallback(
    async (value: number) => {
      await persist(value);
    },
    [persist]
  );

  const resetCoins = useCallback(async () => {
    await persist(0);
  }, [persist]);

  const value = useMemo(
    () => ({
      coins,
      loading,
      addCoins,
      setCoins,
      resetCoins,
    }),
    [coins, loading, addCoins, setCoins, resetCoins]
  );

  return (
    <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>
  );
}

export function useCoins() {
  const ctx = useContext(CoinsContext);
  if (!ctx) {
    throw new Error("useCoins must be used inside <CoinsProvider>");
  }
  return ctx;
}
