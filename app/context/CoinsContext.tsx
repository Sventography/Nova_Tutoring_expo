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

type CoinsContextValue = {
  coins: number;
  loading: boolean;
  addCoins: (delta: number) => Promise<void>;
  setCoins: (value: number) => Promise<void>;
  resetCoins: () => Promise<void>;
};

const CoinsContext = createContext<CoinsContextValue | null>(null);

const GUEST_KEY = "@nova/coins.guest.v1";
const userKey = (uid: string | null) =>
  uid ? `@nova/coins.user.${uid}.v1` : GUEST_KEY;

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId } = useUser();
  const [coins, setCoinsState] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load coins when the active Supabase user changes
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const keyForUser = userKey(supabaseUserId);

        // Try user-specific key first
        const rawUser = await AsyncStorage.getItem(keyForUser);
        let next = 0;

        if (rawUser != null) {
          const parsedUser = Number(rawUser);
          next = Number.isFinite(parsedUser) ? parsedUser : 0;
        } else {
          // 🚚 One-time migration: if user has no coins key yet,
          // but there is a guest coins value, adopt it.
          const rawGuest = await AsyncStorage.getItem(GUEST_KEY);
          const guestVal = rawGuest != null ? Number(rawGuest) : 0;
          if (guestVal > 0 && supabaseUserId) {
            next = Number.isFinite(guestVal) ? guestVal : 0;
            await AsyncStorage.setItem(keyForUser, String(next));
          } else {
            next = 0;
          }
        }

        if (alive) {
          setCoinsState(next);
        }
      } catch {
        if (alive) setCoinsState(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseUserId]);

  const persist = useCallback(
    async (next: number) => {
      const safe = Math.max(0, Number.isFinite(next) ? next : 0);
      setCoinsState(safe);
      try {
        const key = userKey(supabaseUserId);
        await AsyncStorage.setItem(key, String(safe));
      } catch {
        // ignore storage errors
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
