// app/context/CoinsContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
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
  "@nova/coins:guest";

const USER_COINS_PREFIX =
  "@nova/coins:user:";

const COIN_META_SUFFIX =
  ":meta:v2";

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

function getSafeUsername(
  profile: any,
  authUser: any,
  userId: string | null
): string | null {
  const fromProfile =
    (profile?.username &&
      String(
        profile.username
      ).trim()) ||
    (profile?.name &&
      String(profile.name).trim()) ||
    (profile?.displayName &&
      String(
        profile.displayName
      ).trim());

  const fromMetadata =
    (authUser?.user_metadata?.username &&
      String(
        authUser.user_metadata.username
      ).trim()) ||
    (authUser?.email &&
      String(authUser.email)
        .split("@")[0]
        ?.trim());

  const fallback = userId
    ? `student_${String(
        userId
      ).slice(0, 8)}`
    : null;

  const raw =
    fromProfile ||
    fromMetadata ||
    fallback;

  if (!raw) return null;

  return String(raw).trim() || fallback;
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
    user: profile,
    session,
  } = useUser() as any;

  const authUser =
    session?.user ?? null;

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

  const persistRemoteCoins =
    async (
      ownerId: string,
      value: number
    ): Promise<boolean> => {
      const normalized =
        normalizeCoinValue(value);

      try {
        /**
         * Prefer UPDATE so ordinary coin saves cannot accidentally replace
         * unrelated profile columns.
         */
        const {
          data: updated,
          error: updateError,
        } = await supabase
          .from("profiles")
          .update({
            coins: normalized,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", ownerId)
          .select("id, coins")
          .maybeSingle();

        if (updateError) {
          console.warn(
            "[CoinsContext] profile update error:",
            updateError
          );
        }

        if (
          !updateError &&
          updated?.id
        ) {
          return true;
        }

        /**
         * If the profile row does not exist yet, create it safely.
         */
        const safeUsername =
          getSafeUsername(
            profile,
            authUser,
            ownerId
          );

        const payload: any = {
          id: ownerId,
          coins: normalized,
          updated_at:
            new Date().toISOString(),
        };

        if (safeUsername) {
          payload.username =
            safeUsername;
        }

        const {
          error: upsertError,
        } = await supabase
          .from("profiles")
          .upsert(payload, {
            onConflict: "id",
          });

        if (upsertError) {
          console.warn(
            "[CoinsContext] profile upsert error:",
            upsertError
          );
          return false;
        }

        return true;
      } catch (error) {
        console.warn(
          "[CoinsContext] remote persistence threw:",
          error
        );
        return false;
      }
    };

  const persistCoinsForOwner =
    async (
      ownerId: string | null,
      value: number
    ): Promise<void> => {
      const normalized =
        normalizeCoinValue(value);

      /**
       * Save locally first and mark the logged-in cache as dirty until the
       * Supabase write succeeds. A restart can then retry instead of losing
       * the newest balance.
       */
      await writeLocalCoins(
        ownerId,
        normalized,
        !!ownerId
      );

      if (!ownerId) return;

      const remoteSaved =
        await persistRemoteCoins(
          ownerId,
          normalized
        );

      if (remoteSaved) {
        await writeLocalCoins(
          ownerId,
          normalized,
          false
        );
      } else {
        console.warn(
          "[CoinsContext] balance remains safely cached locally and will retry on the next load."
        );
      }
    };

  const logTransaction =
    async (
      ownerId: string | null,
      delta: number,
      reason?: string,
      _meta?: Record<
        string,
        any
      >
    ) => {
      if (!ownerId || !delta) {
        return;
      }

      try {
        const {
          error,
        } = await supabase
          .from("transactions")
          .insert({
            user_id: ownerId,
            amount: delta,
            kind:
              reason ||
              "coins_change",
          });

        if (error) {
          console.warn(
            "[CoinsContext] transaction log error:",
            error
          );
        }
      } catch (error) {
        console.warn(
          "[CoinsContext] transaction log threw:",
          error
        );
      }
    };

  const loadCoinsForOwner =
    async (
      ownerId: string | null
    ): Promise<number> => {
      const local =
        await readLocalCoins(
          ownerId
        );

      if (!ownerId) {
        return local.value;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("id, coins")
          .eq("id", ownerId)
          .maybeSingle();

        if (
          error &&
          (error as any).code !==
            "PGRST116"
        ) {
          console.warn(
            "[CoinsContext] profile load error:",
            error
          );

          return local.value;
        }

        const remoteExists =
          !!data?.id;

        const remoteValue =
          remoteExists
            ? normalizeCoinValue(
                data?.coins
              )
            : 0;

        /**
         * A dirty cache means the prior local write completed but Supabase
         * did not. Push that exact balance before accepting the remote value.
         */
        if (
          local.exists &&
          local.dirty
        ) {
          const synced =
            await persistRemoteCoins(
              ownerId,
              local.value
            );

          if (synced) {
            await writeLocalCoins(
              ownerId,
              local.value,
              false
            );
          }

          return local.value;
        }

        /**
         * One-time migration from the old string-only cache:
         * if the device contains a larger positive balance but no v2 metadata,
         * preserve it instead of allowing a stale remote zero to erase it.
         */
        const shouldRecoverLegacyLocal =
          local.exists &&
          !local.hasMetadata &&
          local.value > remoteValue;

        if (
          shouldRecoverLegacyLocal
        ) {
          const synced =
            await persistRemoteCoins(
              ownerId,
              local.value
            );

          await writeLocalCoins(
            ownerId,
            local.value,
            !synced
          );

          return local.value;
        }

        if (remoteExists) {
          /**
           * Supabase numeric/bigint columns may arrive as either numbers or
           * strings. normalizeCoinValue handles both instead of mistaking a
           * string such as "100000" for a missing balance.
           */
          await writeLocalCoins(
            ownerId,
            remoteValue,
            false
          );

          return remoteValue;
        }

        const seed =
          local.exists
            ? local.value
            : 0;

        const seeded =
          await persistRemoteCoins(
            ownerId,
            seed
          );

        await writeLocalCoins(
          ownerId,
          seed,
          !seeded
        );

        return seed;
      } catch (error) {
        console.warn(
          "[CoinsContext] load failed; using local cache:",
          error
        );

        return local.value;
      }
    };

  const refreshCoins =
    async () => {
      if (!userReady) return;

      setLoading(true);

      try {
        /**
         * Finish any queued write before reloading so a refresh can never
         * race backward over a newly awarded or spent balance.
         */
        await mutationQueueRef.current;

        const ownerId =
          supabaseUserId ?? null;

        const value =
          await loadCoinsForOwner(
            ownerId
          );

        applyCoins(value);
        setReady(true);
      } catch (error) {
        console.warn(
          "[CoinsContext] refresh error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    let cancelled = false;

    const ownerId =
      supabaseUserId ?? null;

    const run = async () => {
      if (!userReady) return;

      setLoading(true);
      setReady(false);

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

        if (!cancelled) {
          applyCoins(value);
          setReady(true);
        }
      } catch (error) {
        console.warn(
          "[CoinsContext] initial load error:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
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
      const ownerId =
        supabaseUserId ?? null;

      const run =
        mutationQueueRef.current.then(
          async () => {
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

            /**
             * This promise does not resolve until the local cache has been
             * saved and the remote sync has been attempted.
             */
            await persistCoinsForOwner(
              ownerId,
              next
            );

            if (delta) {
              await logTransaction(
                ownerId,
                delta,
                reason,
                meta
              );
            }

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

  const value: CoinsContextValue = {
    coins,
    loading,
    ready,
    setCoins,
    addCoins,
    refreshCoins,
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