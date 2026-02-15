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
import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      // prevent “flash” of prior account coins when user switches
      setCoinsState(0);

      try {
        const uid = supabaseUserId;

        // ------------------ LOGGED-IN PATH ------------------
        if (uid) {
          let remoteCoins: number | null = null;
          let localCoins: number | null = null;

          // 1) Try Supabase as one source of truth
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("coins")
              .eq("id", uid)
              .maybeSingle();

            if (error) {
              console.warn("[CoinsContext] Supabase coins load error:", error);
            } else if (data && typeof data.coins === "number") {
              const v = Number(data.coins);
              if (Number.isFinite(v)) {
                remoteCoins = Math.max(0, v);
              }
            }
          } catch (err) {
            console.warn(
              "[CoinsContext] Supabase coins load threw error:",
              err
            );
          }

          // 2) Load per-user local cache (NEVER guest, NEVER legacy)
          try {
            const rawUser = await AsyncStorage.getItem(userKey(uid));
            if (rawUser != null) {
              const parsed = Number(rawUser);
              if (Number.isFinite(parsed)) {
                localCoins = Math.max(0, parsed);
              }
            }
          } catch (err) {
            console.warn(
              "[CoinsContext] local per-user coins load error:",
              err
            );
          }

          // 3) Decide final coins value = max(remote, local, 0)
          let next = 0;
          if (remoteCoins !== null && localCoins !== null) {
            next = Math.max(remoteCoins, localCoins, 0);
          } else if (remoteCoins !== null) {
            next = remoteCoins;
          } else if (localCoins !== null) {
            next = localCoins;
          } else {
            next = 0;
          }

          // 4) Persist per-user cache
          try {
            await AsyncStorage.setItem(userKey(uid), String(next));
          } catch {
            // ignore
          }

          // 5) Try to ensure Supabase matches (best-effort)
          try {
            const { error } = await supabase
              .from("profiles")
              .upsert({ id: uid, coins: next }, { onConflict: "id" });

            if (error) {
              console.warn(
                "[CoinsContext] Supabase coins upsert during load failed:",
                error
              );
            }
          } catch (err) {
            console.warn(
              "[CoinsContext] Supabase coins upsert during load threw:",
              err
            );
          }

          if (alive) setCoinsState(next);
        } else {
          // ------------------ GUEST PATH ------------------
          try {
            const rawGuest = await AsyncStorage.getItem(GUEST_KEY);
            let next = rawGuest != null ? Number(rawGuest) : 0;
            if (!Number.isFinite(next)) next = 0;
            if (alive) setCoinsState(Math.max(0, next));
          } catch (err) {
            console.warn("[CoinsContext] guest coins load error:", err);
            if (alive) setCoinsState(0);
          }
        }
      } catch (err) {
        console.warn("[CoinsContext] load error:", err);
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

      // Update local React state immediately
      setCoinsState(safe);

      // Always persist per-user or guest cache
      try {
        await AsyncStorage.setItem(userKey(supabaseUserId), String(safe));
      } catch {
        // ignore
      }

      // If logged-in, mirror to Supabase (best-effort)
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
    () => ({ coins, loading, addCoins, setCoins, resetCoins }),
    [coins, loading, addCoins, setCoins, resetCoins]
  );

  return (
    <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>
  );
}

export function useCoins() {
  const ctx = useContext(CoinsContext);
  if (!ctx) throw new Error("useCoins must be used inside <CoinsProvider>");
  return ctx;
}
