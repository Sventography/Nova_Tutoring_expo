// app/providers/WalletProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

type WalletInfo = {
  coins: number;
};

type WalletCtxValue = {
  // coin wallet
  wallet: WalletInfo;
  add: (n: number) => void;
  spend: (n: number) => boolean;
  refresh: () => void;

  // (old) address-style wallet, kept for compatibility
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletCtx = createContext<WalletCtxValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();

  // coins (Supabase-backed)
  const [coins, setCoins] = useState<number>(0);

  // old address wallet (local-only)
  const [address, setAddress] = useState<string | null>(null);

  console.log("[WalletProvider DEBUG] supabaseUserId =", supabaseUserId);
  console.log("[WalletProvider DEBUG] coins =", coins);

  // --- Address / connect / disconnect (old behavior) ---

  const connect = useCallback(async () => {
    // TODO: integrate real wallet; placeholder just sets a mock address
    console.log("[WalletProvider] connect() called – using mock address");
    setAddress("0xDEADBEEF...NOVA");
  }, []);

  const disconnect = useCallback(() => {
    console.log("[WalletProvider] disconnect() called");
    setAddress(null);
  }, []);

  // --- Supabase sync helpers for coins ---

  const syncCoinsToSupabase = useCallback(
    async (userId: string, nextCoins: number) => {
      console.log(
        "[WalletProvider] syncCoinsToSupabase →",
        userId,
        "coins:",
        nextCoins
      );
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            coins: nextCoins,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.warn("[WalletProvider] Supabase update error:", error);
        } else {
          console.log("[WalletProvider] Supabase coins updated OK");
        }
      } catch (e) {
        console.warn("[WalletProvider] syncCoinsToSupabase threw:", e);
      }
    },
    []
  );

  // When supabaseUserId changes, hydrate coins from Supabase
  useEffect(() => {
    (async () => {
      if (!supabaseUserId) {
        console.log("[WalletProvider] no user, resetting coins to 0");
        setCoins(0);
        return;
      }

      console.log(
        "[WalletProvider] loading coins from Supabase for",
        supabaseUserId
      );

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (error) {
          console.warn("[WalletProvider] load coins error:", error);
          return;
        }

        const initial =
          data && typeof data.coins === "number" ? data.coins : 0;
        console.log("[WalletProvider] initial coins from Supabase =", initial);
        setCoins(initial);
      } catch (e) {
        console.warn("[WalletProvider] hydrate coins threw:", e);
      }
    })();
  }, [supabaseUserId]);

  // add coins + sync
  const add = useCallback(
    (n: number) => {
      setCoins((prev) => {
        const delta = Number(n) || 0;
        const next = Math.max(0, prev + delta);
        console.log("[WalletProvider] add", delta, "→", next);
        if (supabaseUserId) {
          syncCoinsToSupabase(supabaseUserId, next);
        } else {
          console.log(
            "[WalletProvider] add in guest mode, not syncing to Supabase"
          );
        }
        return next;
      });
    },
    [supabaseUserId, syncCoinsToSupabase]
  );

  // spend coins + sync
  const spend = useCallback(
    (n: number) => {
      const v = Number(n) || 0;
      let ok = false;

      setCoins((prev) => {
        if (prev >= v) {
          ok = true;
          const next = prev - v;
          console.log("[WalletProvider] spend", v, "→", next);
          if (supabaseUserId) {
            syncCoinsToSupabase(supabaseUserId, next);
          } else {
            console.log(
              "[WalletProvider] spend in guest mode, not syncing to Supabase"
            );
          }
          return next;
        }
        ok = false;
        console.log(
          "[WalletProvider] spend denied, have",
          prev,
          "need",
          v
        );
        return prev;
      });

      return ok;
    },
    [supabaseUserId, syncCoinsToSupabase]
  );

  // force reload from Supabase
  const refresh = useCallback(() => {
    if (!supabaseUserId) {
      console.log("[WalletProvider] refresh ignored, no supabaseUserId");
      return;
    }

    (async () => {
      console.log(
        "[WalletProvider] refresh: reloading coins for",
        supabaseUserId
      );
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (error) {
          console.warn("[WalletProvider] refresh coins error:", error);
          return;
        }

        const next =
          data && typeof data.coins === "number" ? data.coins : 0;
        console.log("[WalletProvider] refresh got coins =", next);
        setCoins(next);
      } catch (e) {
        console.warn("[WalletProvider] refresh coins threw:", e);
      }
    })();
  }, [supabaseUserId]);

  const value = useMemo<WalletCtxValue>(
    () => ({
      wallet: { coins },
      add,
      spend,
      refresh,
      address,
      connect,
      disconnect,
    }),
    [coins, add, spend, refresh, address, connect, disconnect]
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export const useWallet = () => {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export default WalletProvider;
