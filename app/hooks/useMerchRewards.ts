// NOVA_MERCH_REWARDS_PHASE1
// NOVA_MERCH_REWARDS_PHASE2B
// Earned-only physical-merch reward balance.
// The client can read status but cannot mint or spend rewards directly.
// Trusted learning-event credits remain entirely server-authoritative.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type MerchRewardsSnapshot = {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string | null;
};

const EMPTY: MerchRewardsSnapshot = {
  balance: 0,
  lifetimeEarned: 0,
  lifetimeRedeemed: 0,
  updatedAt: null,
};

function safeInt(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function useMerchRewards() {
  const [snapshot, setSnapshot] =
    useState<MerchRewardsSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setSnapshot(EMPTY);
        return EMPTY;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "nova_merch_reward_status"
      );

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;

      const next: MerchRewardsSnapshot = {
        balance: safeInt((row as any)?.balance),
        lifetimeEarned: safeInt((row as any)?.lifetime_earned),
        lifetimeRedeemed: safeInt((row as any)?.lifetime_redeemed),
        updatedAt:
          typeof (row as any)?.updated_at === "string"
            ? (row as any).updated_at
            : null,
      };

      setSnapshot(next);
      return next;
    } catch (err: any) {
      const message = String(
        err?.message || "Could not load Nova Rewards."
      );
      setError(message);
      console.warn("[MerchRewards] status refresh failed", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...snapshot,
    loading,
    error,
    refresh,
  };
}

export default useMerchRewards;
