// app/context/WalletContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

type Wallet = { coins: number };

type Ctx = {
  wallet: Wallet;
  add: (n: number) => void;
  spend: (n: number) => boolean;
  refresh: () => void;
};

const C = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();
  const [coins, setCoins] = useState<number>(0);

  console.log("[WalletContext DEBUG] supabaseUserId =", supabaseUserId);
  console.log("[WalletContext DEBUG] coins state =", coins);

  const syncCoinsToSupabase = useCallback(
    async (userId: string, nextCoins: number) => {
      console.log(
        "[WalletContext] syncCoinsToSupabase →",
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
          console.warn("[WalletContext] Supabase update error:", error);
        } else {
          console.log("[WalletContext] Supabase coins updated OK");
        }
      } catch (e) {
        console.warn("[WalletContext] syncCoinsToSupabase threw:", e);
      }
    },
    []
  );

  // When the logged-in user changes, hydrate coins from Supabase.
  useEffect(() => {
    (async () => {
      if (!supabaseUserId) {
        console.log("[WalletContext] no user, resetting coins to 0");
        setCoins(0);
        return;
      }

      console.log(
        "[WalletContext] loading coins from Supabase for",
        supabaseUserId
      );

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (error) {
          console.warn("[WalletContext] load coins error:", error);
          return;
        }

        const initial =
          data && typeof data.coins === "number" ? data.coins : 0;
        console.log("[WalletContext] initial coins from Supabase =", initial);
        setCoins(initial);
      } catch (e) {
        console.warn("[WalletContext] hydrate coins threw:", e);
      }
    })();
  }, [supabaseUserId]);

  const add = useCallback(
    (n: number) => {
      setCoins((prev) => {
        const delta = Number(n) || 0;
        const next = Math.max(0, prev + delta);
        console.log("[WalletContext] add", delta, "→", next);
        if (supabaseUserId) {
          syncCoinsToSupabase(supabaseUserId, next);
        } else {
          console.log(
            "[WalletContext] add called but no supabaseUserId (guest), not syncing"
          );
        }
        return next;
      });
    },
    [supabaseUserId, syncCoinsToSupabase]
  );

  const spend = useCallback(
    (n: number) => {
      const v = Number(n) || 0;
      let ok = false;

      setCoins((prev) => {
        if (prev >= v) {
          ok = true;
          const next = prev - v;
          console.log("[WalletContext] spend", v, "→", next);
          if (supabaseUserId) {
            syncCoinsToSupabase(supabaseUserId, next);
          } else {
            console.log(
              "[WalletContext] spend called but no supabaseUserId (guest), not syncing"
            );
          }
          return next;
        }
        ok = false;
        console.log(
          "[WalletContext] spend denied, not enough coins. have:",
          prev,
          "need:",
          v
        );
        return prev;
      });

      return ok;
    },
    [supabaseUserId, syncCoinsToSupabase]
  );

  const refresh = useCallback(() => {
    if (!supabaseUserId) {
      console.log("[WalletContext] refresh ignored, no supabaseUserId");
      return;
    }

    (async () => {
      console.log(
        "[WalletContext] refresh: pulling coins again for",
        supabaseUserId
      );
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (error) {
          console.warn("[WalletContext] refresh coins error:", error);
          return;
        }

        const next =
          data && typeof data.coins === "number" ? data.coins : 0;
        console.log("[WalletContext] refresh got coins =", next);
        setCoins(next);
      } catch (e) {
        console.warn("[WalletContext] refresh coins threw:", e);
      }
    })();
  }, [supabaseUserId]);

  const value = useMemo<Ctx>(
    () => ({ wallet: { coins }, add, spend, refresh }),
    [coins, add, spend, refresh]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useWallet(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
