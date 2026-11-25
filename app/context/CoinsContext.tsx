// app/context/CoinsContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
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

  setCoins: (
    valueOrUpdater:
      | number
      | ((prev: number) => number),
    opts?: {
      reason?: string;
      meta?: Record<string, any>;
    }
  ) => Promise<void>;

  addCoins: (
    delta: number,
    reason?: string,
    meta?: Record<string, any>
  ) => Promise<void>;

  refreshCoins: () => Promise<void>;
  resetGuestCoins: () => Promise<void>;
};

type LocalCoinSnapshot = {
  exists: boolean;
  hasMetadata: boolean;
  value: number;
  updatedAt: number;
  dirty: boolean;
};

const CoinsContext =
  createContext<
    CoinsContextValue | undefined
  >(undefined);

const GUEST_COINS_KEY =
  "@nova/coins:guest:v4";

const USER_COINS_PREFIX =
  "@nova/coins:user:";

const LEGACY_GUEST_COIN_KEYS = [
  "@nova/coins:guest",
  "@nova/coins:guest:meta:v2",
  "@nova/coins:guest:v2",
  "@nova/coins:guest:v2:meta:v2",
  "@nova/coins:guest:v3",
  "@nova/coins:guest:v3:meta:v2",
] as const;


const COIN_META_SUFFIX =
  ":meta:v2";

const GUEST_RESET_GUARD_KEY =
  "@nova/guest.reset.guard.v2";

const GUEST_RESET_GUARD_MS =
  8000;

function getUserCoinsKey(
  userId: string | null
): string {
  if (!userId) return GUEST_COINS_KEY;

  return `${USER_COINS_PREFIX}${userId}`;
}

function getCoinMetaKey(
  userId: string | null
): string {
  return `${getUserCoinsKey(
    userId
  )}${COIN_META_SUFFIX}`;
}

function parseCoinValue(
  raw: unknown,
  fallback = 0
): number {
  if (
    raw === null ||
    raw === undefined ||
    raw === ""
  ) {
    return fallback;
  }

  const value =
    typeof raw === "number"
      ? raw
      : Number(String(raw));

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function normalizeCoinValue(
  raw: unknown
): number {
  const value = parseCoinValue(raw, 0);

  /**
   * Coins are stored as whole numbers.
   * Negative balances are allowed temporarily only if an older caller
   * explicitly produced one, so do not silently clamp here.
   */
  return Math.trunc(value);
}

async function readLocalCoins(
  userId: string | null
): Promise<LocalCoinSnapshot> {
  const valueKey =
    getUserCoinsKey(userId);

  const metaKey =
    getCoinMetaKey(userId);

  const [rawValue, rawMeta] =
    await Promise.all([
      AsyncStorage.getItem(valueKey),
      AsyncStorage.getItem(metaKey),
    ]);

  let updatedAt = 0;
  let dirty = false;
  let hasMetadata = false;

  if (rawMeta) {
    try {
      const parsed =
        JSON.parse(rawMeta);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        hasMetadata = true;
        updatedAt =
          parseCoinValue(
            parsed.updatedAt,
            0
          );

        dirty =
          parsed.dirty === true;
      }
    } catch {
      // Treat malformed metadata as a legacy cache.
    }
  }

  return {
    exists: rawValue !== null,
    hasMetadata,
    value: normalizeCoinValue(
      rawValue
    ),
    updatedAt,
    dirty,
  };
}

async function writeLocalCoins(
  userId: string | null,
  value: number,
  dirty: boolean
): Promise<void> {
  const normalized =
    normalizeCoinValue(value);

  const updatedAt = Date.now();

  await AsyncStorage.multiSet([
    [
      getUserCoinsKey(userId),
      String(normalized),
    ],
    [
      getCoinMetaKey(userId),
      JSON.stringify({
        value: normalized,
        updatedAt,
        dirty:
          userId !== null && dirty,
      }),
    ],
  ]);
}

export function CoinsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    supabaseUserId,
    ready: userReady,
  } = useUser() as any;
  const ownerRef = useRef<string | null>(supabaseUserId ?? null);
  const loadEpochRef = useRef(0);

  const [coins, setCoinsState] =
    useState<number>(0);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [ready, setReady] =
    useState<boolean>(false);

  const coinsRef =
    useRef<number>(0);

  /**
   * Every mutation is serialized. This prevents two rewards or a reward
   * plus a purchase from calculating from the same stale balance.
   */
  const mutationQueueRef =
    useRef<Promise<void>>(
      Promise.resolve()
    );

  const applyCoins = (
    value: number
  ) => {
    const normalized =
      normalizeCoinValue(value);

    coinsRef.current = normalized;
    setCoinsState(normalized);
  };

  const loadCoinsForOwner =
    async (
      ownerId: string | null
    ): Promise<number> => {
      // Never accept or upload device balances for registered accounts.
      // Keep old cache keys untouched for later reconciliation.
      if (ownerId) {
        const { data, error } = await supabase.from("profiles").select("id, coins").eq("id", ownerId).maybeSingle();
        if (error || !data?.id) throw error ?? new Error("Wallet profile not ready");
        return normalizeCoinValue(data.coins);
      }
      if (!ownerId) {
        /*
         * Guest wallet v4 intentionally starts clean.
         * Remove only historical guest keys that may contain data leaked
         * from older builds. Signed-in user keys are never touched.
         */
        await AsyncStorage.multiRemove([
          ...LEGACY_GUEST_COIN_KEYS,
        ]);
      }

      const local =
        await readLocalCoins(
          ownerId
        );

      if (!ownerId) {
        const rawGuardUntil =
          await AsyncStorage.getItem(
            GUEST_RESET_GUARD_KEY
          );

        const guardUntil =
          Number(rawGuardUntil || 0);

        if (
          Number.isFinite(guardUntil) &&
          guardUntil > Date.now()
        ) {
          await writeLocalCoins(
            null,
            0,
            false
          );

          return 0;
        }

        if (rawGuardUntil) {
          await AsyncStorage.removeItem(
            GUEST_RESET_GUARD_KEY
          );
        }

        return local.value;
      }

      return 0;
    };

  const refreshCoins = async () => {
    if (!userReady) return;
    const ownerId = supabaseUserId ?? null;
    if (ownerRef.current !== ownerId) return;
    const epoch = ++loadEpochRef.current;
    const current = () => ownerRef.current === ownerId && loadEpochRef.current === epoch;
    setLoading(true);
    try {
      await mutationQueueRef.current;
      if (!current()) return;
      const value = await loadCoinsForOwner(ownerId);
      if (current()) { applyCoins(value); setReady(true); }
    } catch (error) {
      if (current()) { applyCoins(0); setReady(false); }
      console.warn("[CoinsContext] refresh error:", error);
    } finally { if (current()) setLoading(false); }
  };

  useLayoutEffect(() => {
    let cancelled = false;

    const ownerId = supabaseUserId ?? null;
    ownerRef.current = ownerId;
    const epoch = ++loadEpochRef.current;
    const current = () => !cancelled && ownerRef.current === ownerId && loadEpochRef.current === epoch;

    // Reset before the next frame so a signed-out guest never sees or spends
    // the previous account's balance while the new owner is hydrating.
    applyCoins(0);
    setLoading(true);
    setReady(false);

    const run = async () => {
      if (!userReady) return;

      try {
        /**
         * Let any prior-account write finish before switching the visible
         * balance to the new account or guest cache.
         */
        await mutationQueueRef.current;

        const value =
          await loadCoinsForOwner(
            ownerId
          );

        if (current()) {
          applyCoins(value);
          setReady(true);
        }
      } catch (error) {
        console.warn(
          "[CoinsContext] initial load error:",
          error
        );
      } finally {
        if (current()) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      ++loadEpochRef.current;
    };
  }, [
    supabaseUserId,
    userReady,
  ]);

  const enqueueCoinMutation =
    async (
      calculateNext: (
        current: number
      ) => number,
      reason: string,
      meta?: Record<
        string,
        any
      >
    ) => {
      /**
       * Capture the owner at the time the mutation was requested. If auth
       * changes while the queue is working, this write still goes to the
       * correct account.
       */
      const ownerId = supabaseUserId ?? null;
      if (ownerId) throw new Error("Registered wallet requires a verified server operation");

      const run =
        mutationQueueRef.current.then(
          async () => {
            if (ownerRef.current !== ownerId) return;
            if (!ownerId) {
              const rawGuardUntil =
                await AsyncStorage.getItem(
                  GUEST_RESET_GUARD_KEY
                );

              const guardUntil =
                Number(rawGuardUntil || 0);

              if (ownerRef.current !== ownerId) return;
              if (
                Number.isFinite(
                  guardUntil
                ) &&
                guardUntil > Date.now()
              ) {
                applyCoins(0);
                await writeLocalCoins(
                  null,
                  0,
                  false
                );

                if (__DEV__) {
                  console.log(
                    "[CoinsContext] ignored guest coin mutation during sign-out reset:",
                    reason
                  );
                }

                return;
              }
            }

            if (ownerRef.current !== ownerId) return;
            const previous =
              coinsRef.current;

            const calculated =
              calculateNext(previous);

            if (
              !Number.isFinite(
                calculated
              )
            ) {
              throw new Error(
                `[CoinsContext] Refusing invalid coin value: ${calculated}`
              );
            }

            const next =
              normalizeCoinValue(
                calculated
              );

            const delta =
              next - previous;

            applyCoins(next);

            await writeLocalCoins(null, next, false);

            try {
              (
                globalThis as any
              ).novaTrack?.(
                "coins_change",
                {
                  previous,
                  next,
                  delta,
                  reason,
                  meta,
                }
              );
            } catch {
              // Tracking is best-effort.
            }
          }
        );

      mutationQueueRef.current =
        run.catch((error) => {
          console.warn(
            "[CoinsContext] queued mutation failed:",
            error
          );
        });

      await run;
    };

  const setCoins =
    async (
      valueOrUpdater:
        | number
        | ((
            prev: number
          ) => number),
      opts?: {
        reason?: string;
        meta?: Record<
          string,
          any
        >;
      }
    ) => {
      await enqueueCoinMutation(
        (previous) =>
          typeof valueOrUpdater ===
          "function"
            ? (
                valueOrUpdater as (
                  previous: number
                ) => number
              )(previous)
            : valueOrUpdater,
        opts?.reason ||
          "set_coins",
        opts?.meta
      );
    };

  const addCoins =
    async (
      delta: number,
      reason?: string,
      meta?: Record<
        string,
        any
      >
    ) => {
      if (!delta) return;

      await enqueueCoinMutation(
        (previous) =>
          previous + delta,
        reason || "add_coins",
        meta
      );
    };

  const resetGuestCoins =
    async (): Promise<void> => {
      /*
       * Guest coins are temporary session progress.
       * Signed-in user balances are never touched.
       *
       * IMPORTANT:
       * Never remove @nova/guest-ai-installation-id.v1 here.
       * That ID controls the lifetime 2-question guest AI trial.
       */
      if (supabaseUserId) {
        return;
      }

      try {
        await mutationQueueRef.current;
      } catch {
        // Queued mutation errors are already logged elsewhere.
      }

      if (ownerRef.current !== null) return;
      applyCoins(0);

      await AsyncStorage.multiRemove([
        GUEST_COINS_KEY,
        getCoinMetaKey(null),
        ...LEGACY_GUEST_COIN_KEYS,
      ]);

      if (ownerRef.current !== null) return;
      setLoading(false);
      setReady(true);

      if (__DEV__) {
        console.log(
          "[CoinsContext] guest wallet reset to 0"
        );
      }
    };

  const value: CoinsContextValue = {
    coins,
    loading,
    ready,
    setCoins,
    addCoins,
    refreshCoins,
    resetGuestCoins,
  };

  return (
    <CoinsContext.Provider
      value={value}
    >
      {children}
    </CoinsContext.Provider>
  );
}

export function useCoins(): CoinsContextValue {
  const context =
    useContext(CoinsContext);

  if (!context) {
    throw new Error(
      "useCoins must be used within a CoinsProvider"
    );
  }

  return context;
}