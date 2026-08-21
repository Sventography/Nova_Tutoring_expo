// app/context/AchievementsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../lib/supabase";
import { ACHIEVEMENT_LIST } from "../constants/achievements";
import { useCoins } from "./CoinsContext";
import { useUser } from "./UserContext";
import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";
import {
  recordQuizAchievementProgress,
  type QuizAchievementMeta,
} from "../_lib/quizAchievementProgress";

const STORAGE_BASE_UNLOCKED = "@achieve/unlocked.v1";
const STORAGE_BASE_QUIZ_COUNT = "@achieve/quizCount.v1";
const STORAGE_BASE_ASK_COUNT = "@achieve/askCount.v1";
const STORAGE_BASE_FLASHCARD_COUNT = "@achieve/flashcardCount.v1";
const STORAGE_BASE_BRAIN_COUNT = "@achieve/brainteaserCount.v1";
const STORAGE_BASE_RELAX_MIN = "@achieve/relaxMinutes.v1";
const STORAGE_BASE_PURCHASE_COUNT = "@achieve/purchaseCount.v1";
const STORAGE_BASE_PURCHASE_KEYS = "@achieve/purchaseKeys.v1";
const STORAGE_BASE_PENDING_CLAIMS = "@achieve/pendingClaims.v1";

export const ACHIEVEMENT_EVENT = "ACHIEVEMENT_EVENT";
export const SHOP_PURCHASE_COMPLETED_EVENT = "shop:purchase_completed";
export const SHOP_PURCHASE_INVENTORY_EVENT = "shop:purchase_inventory";

// ─────────────── TYPES ───────────────

type UnlockedMap = Record<string, number>; // id -> timestamp

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  onQuizFinished: (
    pct: number,
    subject: string,
    meta?: QuizAchievementMeta
  ) => void;
  onAskQuestion?: () => void;
  onFlashcardSaved?: () => void;
  onBrainPairCompleted?: () => void;
  onRelaxMinutes?: (deltaMinutes: number) => void;
  resetGuestAchievements: () => Promise<void>;

  /**
   * Development-only helpers used by the hidden Dev Test screen.
   * They are inert in production builds.
   */
  devUnlockAchievement?: (id: string) => void;
  devResetAchievement?: (id: string) => Promise<void>;

  /**
   * Development diagnostics. These come from the exact provider that awards
   * the coins, so they reveal whether Mecha Owl is being detected there.
   */
  devAchievementRewardPreview?: ReturnType<
    typeof useLegendaryCompanions
  >["calculateCoinReward"];

  devAchievementCompanionDebug?: {
    activeCompanionId?: string | null;
    activeCompanionToken?: string;
    activeAbilityType?: string | null;
    activeBonusPercent?: number;
    mechaOwlDetected: boolean;
  };
};

type Listener = (payload: any) => void;

// Local meta type so we can carry group info
type AchMeta = {
  id: string;
  title: string;
  coins: number;
  group: string;
  desc?: string;
};


type RemoteAchievementUnlock = {
  achievement_id?: string | null;
  unlocked_at_ms?: number | string | null;
  actual_coins?: number | string | null;
  migrated_existing?: boolean | null;
};

type RemoteAchievementClaim = {
  newly_claimed?: boolean | null;
  achievement_id?: string | null;
  group_name?: string | null;
  base_coins?: number | string | null;
  specialist_bonus?: number | string | null;
  aetherwyrm_bonus?: number | string | null;
  actual_coins?: number | string | null;
  migrated_existing?: boolean | null;
  has_mecha_owl?: boolean | null;
  has_celestra?: boolean | null;
  has_aetherwyrm?: boolean | null;
  unlocked_at_ms?: number | string | null;
};

// ─────────────── SIMPLE EMITTER ───────────────

class SimpleEmitter {
  private listeners: Record<string, Listener[
    ]> = {};

  addListener(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return {
      remove: () => {
        this.listeners[event] = (this.listeners[event] || []).filter(
          (l) => l !== fn
        );
      },
    };
  }

  emit(event: string, payload: any) {
    (this.listeners[event] || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.warn("[AchieveEmitter] listener error", e);
      }
    });
  }
}

export const AchieveEmitter = new SimpleEmitter();

// quick lookup map from ACHIEVEMENT_LIST
const ACH_MAP: Record<string, AchMeta> = ACHIEVEMENT_LIST.reduce(
  (acc, a) => {
    acc[a.id] = {
      id: a.id,
      title: a.title,
      coins: a.coins ?? 0,
      group: a.group,
      desc: a.desc,
    };
    return acc;
  },
  {} as Record<string, AchMeta>
);

// thresholds
const ASK_THRESHOLDS = [
  1, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000,
];
const FLASH_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200];
const BRAIN_THRESHOLDS = [1, 3, 5, 10, 20, 50, 100];
const RELAX_THRESHOLDS = [5, 10, 20, 30, 60, 120];
const PURCHASE_THRESHOLDS = [1, 3, 5, 10, 20];

// ─────────────── HELPERS ───────────────

const storageKey = (base: string, uid: string | null) =>
  uid ? `${base}.user.${uid}` : `${base}.guest`;

const parseNum = (raw: string | null) => {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
};


function firstRpcRow<T>(data: any): T | null {
  if (Array.isArray(data)) {
    return (data[0] ?? null) as T | null;
  }

  if (data && typeof data === "object") {
    return data as T;
  }

  return null;
}

function safeRemoteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function parsePendingClaimIds(raw: string | null): Set<string> {
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

// ─────────────── CONTEXT ───────────────

const AchievementsCtx = createContext<AchievementsContextValue | null>(null);

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsCtx);
  if (!ctx) {
    throw new Error("useAchievements must be used inside AchievementsProvider");
  }
  return ctx;
}

export function AchievementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    supabaseUserId,
  } = useUser();

  const {
    hasMechaOwl,
    hasCelestra,
    hasAetherwyrm,
    calculateCoinReward,
  } = useLegendaryCompanions();

  const [unlocked, setUnlocked] = useState<UnlockedMap>({});
  const unlockedRef = useRef<UnlockedMap>({});
  const quizCountRef = useRef<number>(0);
  const askCountRef = useRef<number>(0);
  const flashCountRef = useRef<number>(0);
  const brainCountRef = useRef<number>(0);
  const relaxMinutesRef = useRef<number>(0);
  const purchaseCountRef = useRef<number>(0);
  const purchaseKeysRef = useRef<Set<string>>(new Set());
  const pendingClaimsRef = useRef<Set<string>>(new Set());
  const unlockInFlightRef = useRef<Set<string>>(new Set());
  const purchaseBaselineReadyRef = useRef(false);
  const inventoryBaselineTotalRef = useRef(0);
  const [hydrated, setHydrated] = useState(false);

  const {
    addCoins,
    refreshCoins,
  } = useCoins();

  const refreshCoinsRef =
    useRef(refreshCoins);

  refreshCoinsRef.current =
    refreshCoins;

  // All owned legendary companion powers remain active passively.
  const computeAchievementReward =
    useCallback(
      (
        base: number,
        id: string
      ) => {
        const rewardType =
          ACH_MAP[id]?.group ===
          "streaks"
            ? "streak_achievement"
            : "achievement";

        return calculateCoinReward(
          base,
          rewardType
        );
      },
      [calculateCoinReward]
    );

  // ─────────────── HYDRATE PER USER ───────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setHydrated(false);

        // Reset in-memory refs when switching users.
        unlockedRef.current = {};
        quizCountRef.current = 0;
        askCountRef.current = 0;
        flashCountRef.current = 0;
        brainCountRef.current = 0;
        relaxMinutesRef.current = 0;
        purchaseCountRef.current = 0;
        purchaseKeysRef.current = new Set();
        pendingClaimsRef.current = new Set();
        unlockInFlightRef.current = new Set();
        purchaseBaselineReadyRef.current = false;
        inventoryBaselineTotalRef.current = 0;

        if (!cancelled) {
          setUnlocked({});
        }

        const uid = supabaseUserId ?? null;

        const [
          rawUnlocked,
          rawQuizCount,
          rawAskCount,
          rawFlashCount,
          rawBrainCount,
          rawRelaxMin,
          rawPurchaseCount,
          rawPurchaseKeys,
          rawPendingClaims,
        ] = await Promise.all([
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_UNLOCKED, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_QUIZ_COUNT, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_ASK_COUNT, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_FLASHCARD_COUNT, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_BRAIN_COUNT, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_RELAX_MIN, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_PURCHASE_COUNT, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_PURCHASE_KEYS, uid)
          ),
          AsyncStorage.getItem(
            storageKey(STORAGE_BASE_PENDING_CLAIMS, uid)
          ),
        ]);

        let localUnlocked: UnlockedMap = {};

        if (rawUnlocked) {
          try {
            const parsed: UnlockedMap = JSON.parse(rawUnlocked);
            localUnlocked =
              parsed && typeof parsed === "object"
                ? parsed
                : {};
          } catch (e) {
            console.warn(
              "[Achievements] parse unlocked failed",
              e
            );
          }
        }

        unlockedRef.current = localUnlocked;
        pendingClaimsRef.current =
          parsePendingClaimIds(rawPendingClaims);

        quizCountRef.current = parseNum(rawQuizCount);
        askCountRef.current = parseNum(rawAskCount);
        flashCountRef.current = parseNum(rawFlashCount);
        brainCountRef.current = parseNum(rawBrainCount);
        relaxMinutesRef.current = parseNum(rawRelaxMin);
        purchaseCountRef.current = parseNum(rawPurchaseCount);
        purchaseBaselineReadyRef.current =
          rawPurchaseCount !== null;

        if (rawPurchaseKeys) {
          try {
            const parsedKeys = JSON.parse(rawPurchaseKeys);

            if (Array.isArray(parsedKeys)) {
              purchaseKeysRef.current = new Set(
                parsedKeys
                  .map((value) =>
                    String(value || "").trim()
                  )
                  .filter(Boolean)
              );
            }
          } catch (e) {
            console.warn(
              "[Achievements] parse purchase keys failed",
              e
            );
          }
        }

        /*
         * Phase 3C:
         *
         * Signed-in achievements become account-wide and server-idempotent.
         *
         * 1) Existing local unlocks are registered as already paid so the
         *    update cannot award them a second time.
         * 2) Pending claims from a temporary network failure are retried.
         * 3) Server unlocks are merged back into the local cache for fast UI.
         */
        if (uid) {
          const existingIds =
            Object.keys(localUnlocked);

          if (existingIds.length > 0) {
            const { error: migrationError } =
              await supabase.rpc(
                "nova_migrate_achievement_unlocks",
                {
                  p_achievement_ids:
                    existingIds,
                }
              );

            if (migrationError) {
              console.warn(
                "[Achievements] server migration failed",
                migrationError
              );
            }
          }

          let awardedDuringRetry = false;

          for (
            const pendingId of Array.from(
              pendingClaimsRef.current
            )
          ) {
            const { data, error } =
              await supabase.rpc(
                "nova_claim_achievement",
                {
                  p_achievement_id:
                    pendingId,
                }
              );

            if (error) {
              console.warn(
                "[Achievements] pending server claim still failed:",
                pendingId,
                error
              );
              continue;
            }

            const row =
              firstRpcRow<RemoteAchievementClaim>(
                data
              );

            pendingClaimsRef.current.delete(
              pendingId
            );

            if (
              row?.newly_claimed === true &&
              safeRemoteNumber(
                row.actual_coins
              ) > 0
            ) {
              awardedDuringRetry = true;
            }
          }

          await AsyncStorage.setItem(
            storageKey(
              STORAGE_BASE_PENDING_CLAIMS,
              uid
            ),
            JSON.stringify(
              Array.from(
                pendingClaimsRef.current
              )
            )
          );

          const {
            data: remoteUnlockData,
            error: remoteUnlockError,
          } = await supabase.rpc(
            "nova_achievement_unlocks"
          );

          if (remoteUnlockError) {
            console.warn(
              "[Achievements] server unlock hydrate failed",
              remoteUnlockError
            );
          } else {
            const rows = Array.isArray(
              remoteUnlockData
            )
              ? (remoteUnlockData as RemoteAchievementUnlock[])
              : [];

            const merged: UnlockedMap = {
              ...localUnlocked,
            };

            for (const row of rows) {
              const id = String(
                row?.achievement_id || ""
              ).trim();

              if (!id) continue;

              const remoteTs =
                safeRemoteNumber(
                  row?.unlocked_at_ms
                ) || Date.now();

              if (!merged[id]) {
                merged[id] = remoteTs;
              }
            }

            localUnlocked = merged;
            unlockedRef.current = merged;

            await AsyncStorage.setItem(
              storageKey(
                STORAGE_BASE_UNLOCKED,
                uid
              ),
              JSON.stringify(merged)
            );
          }

          if (awardedDuringRetry) {
            try {
              await refreshCoinsRef.current();
            } catch (e) {
              console.warn(
                "[Achievements] coin refresh after pending claims failed",
                e
              );
            }
          }
        }

        if (!cancelled) {
          setUnlocked({
            ...unlockedRef.current,
          });
        }
      } catch (e) {
        console.warn(
          "[Achievements] hydrate failed",
          e
        );
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseUserId]);

  const persistUnlocked = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_UNLOCKED, uid),
        JSON.stringify(unlockedRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist unlocked failed", e);
    }
  }, [supabaseUserId]);


  const persistPendingClaims = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;

      await AsyncStorage.setItem(
        storageKey(
          STORAGE_BASE_PENDING_CLAIMS,
          uid
        ),
        JSON.stringify(
          Array.from(
            pendingClaimsRef.current
          )
        )
      );
    } catch (e) {
      console.warn(
        "[Achievements] persist pending claims failed",
        e
      );
    }
  }, [supabaseUserId]);

  const persistQuizCount = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_QUIZ_COUNT, uid),
        String(quizCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist quiz count failed", e);
    }
  }, [supabaseUserId]);

  const persistAskCount = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_ASK_COUNT, uid),
        String(askCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist ask count failed", e);
    }
  }, [supabaseUserId]);

  const persistFlashCount = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_FLASHCARD_COUNT, uid),
        String(flashCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist flashcard count failed", e);
    }
  }, [supabaseUserId]);

  const persistBrainCount = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_BRAIN_COUNT, uid),
        String(brainCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist brainteaser count failed", e);
    }
  }, [supabaseUserId]);

  const persistRelaxMinutes = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_RELAX_MIN, uid),
        String(relaxMinutesRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist relax minutes failed", e);
    }
  }, [supabaseUserId]);

  const persistPurchaseCount = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_PURCHASE_COUNT, uid),
        String(purchaseCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist purchase count failed", e);
    }
  }, [supabaseUserId]);

  const persistPurchaseKeys = useCallback(async () => {
    try {
      const uid = supabaseUserId ?? null;
      await AsyncStorage.setItem(
        storageKey(STORAGE_BASE_PURCHASE_KEYS, uid),
        JSON.stringify(Array.from(purchaseKeysRef.current))
      );
    } catch (e) {
      console.warn("[Achievements] persist purchase keys failed", e);
    }
  }, [supabaseUserId]);

  // ─────────────── UNLOCK ───────────────

  const unlock = useCallback(
    (
      id: string,
      opts?: { silent?: boolean }
    ) => {
      const achievementId = String(
        id || ""
      ).trim();

      if (!achievementId) return;
      if (
        unlockedRef.current[
          achievementId
        ]
      ) {
        return;
      }

      if (
        unlockInFlightRef.current.has(
          achievementId
        )
      ) {
        return;
      }

      const ach =
        ACH_MAP[achievementId];

      if (!ach) {
        console.warn(
          "[Achievements] unknown achievement:",
          achievementId
        );
        return;
      }

      const finalizeLocalUnlock = (
        timestamp: number,
        coinsAwarded: number,
        shouldCelebrate: boolean
      ) => {
        if (
          unlockedRef.current[
            achievementId
          ]
        ) {
          return;
        }

        const safeTimestamp =
          Number.isFinite(timestamp) &&
          timestamp > 0
            ? timestamp
            : Date.now();

        unlockedRef.current = {
          ...unlockedRef.current,
          [achievementId]:
            safeTimestamp,
        };

        setUnlocked(
          unlockedRef.current
        );

        void persistUnlocked();

        if (
          !opts?.silent &&
          shouldCelebrate
        ) {
          const hasCoins =
            coinsAwarded > 0;
          const label = ach.title;

          try {
            AchieveEmitter.emit(
              "achievement_unlocked_detail",
              {
                id: achievementId,
                title: label,
                coins: coinsAwarded,
              }
            );
          } catch (e) {
            console.warn(
              "[Achievements] achievement_unlocked_detail emit failed",
              e
            );
          }

          try {
            const bannerMessage =
              hasCoins
                ? `${label} — +${coinsAwarded.toLocaleString()} coins`
                : label ||
                  "Achievement unlocked!";

            console.log(
              "[Achievements] emit celebrate:",
              bannerMessage
            );

            AchieveEmitter.emit(
              "celebrate",
              bannerMessage
            );
          } catch (e) {
            console.warn(
              "[Achievements] celebrate emit failed",
              e
            );
          }
        }

        if (shouldCelebrate) {
          try {
            DeviceEventEmitter.emit(
              ACHIEVEMENT_EVENT,
              {
                id: achievementId,
                ts: safeTimestamp,
              }
            );

            if (Platform.OS === "web") {
              try {
                const webWindow =
                  (globalThis as any)
                    .window;

                const WebEvent =
                  (globalThis as any)
                    .Event;

                if (
                  webWindow?.dispatchEvent &&
                  typeof WebEvent ===
                    "function"
                ) {
                  webWindow.dispatchEvent(
                    new WebEvent(
                      ACHIEVEMENT_EVENT
                    )
                  );
                }
              } catch {}
            }
          } catch (e) {
            console.warn(
              "[Achievements] DeviceEventEmitter emit failed",
              e
            );
          }
        }
      };

      const run = async () => {
        unlockInFlightRef.current.add(
          achievementId
        );

        try {
          /*
           * Signed-in users:
           * Supabase owns the claim, reward value, Legendary modifiers,
           * coin balance update, and duplicate protection.
           */
          if (supabaseUserId) {
            const { data, error } =
              await supabase.rpc(
                "nova_claim_achievement",
                {
                  p_achievement_id:
                    achievementId,
                }
              );

            if (error) {
              console.warn(
                "[Achievements] server claim failed:",
                achievementId,
                error
              );

              pendingClaimsRef.current.add(
                achievementId
              );

              await persistPendingClaims();
              return;
            }

            const row =
              firstRpcRow<RemoteAchievementClaim>(
                data
              );

            if (!row) {
              console.warn(
                "[Achievements] server claim returned no row:",
                achievementId
              );

              pendingClaimsRef.current.add(
                achievementId
              );

              await persistPendingClaims();
              return;
            }

            pendingClaimsRef.current.delete(
              achievementId
            );

            await persistPendingClaims();

            const coinsAwarded =
              safeRemoteNumber(
                row.actual_coins
              );

            const timestamp =
              safeRemoteNumber(
                row.unlocked_at_ms
              ) || Date.now();

            const newlyClaimed =
              row.newly_claimed === true;

            if (
              newlyClaimed &&
              coinsAwarded > 0
            ) {
              try {
                await refreshCoinsRef.current();
              } catch (e) {
                console.warn(
                  "[Achievements] refreshCoins after server claim failed",
                  e
                );
              }
            }

            console.log(
              "[Achievements] server claim result",
              {
                achievementId,
                newlyClaimed,
                baseCoins:
                  safeRemoteNumber(
                    row.base_coins
                  ),
                specialistBonus:
                  safeRemoteNumber(
                    row.specialist_bonus
                  ),
                aetherwyrmBonus:
                  safeRemoteNumber(
                    row.aetherwyrm_bonus
                  ),
                awardedCoins:
                  coinsAwarded,
                migratedExisting:
                  row.migrated_existing ===
                  true,
              }
            );

            finalizeLocalUnlock(
              timestamp,
              newlyClaimed
                ? coinsAwarded
                : 0,
              newlyClaimed
            );

            return;
          }

          /*
           * Guests keep the proven local Phase-2 reward path.
           */
          let coinsAwarded = 0;

          if (
            ach.coins &&
            ach.coins > 0 &&
            typeof addCoins === "function"
          ) {
            try {
              const reward =
                computeAchievementReward(
                  ach.coins,
                  achievementId
                );

              coinsAwarded =
                reward.totalCoins;

              if (coinsAwarded > 0) {
                const coinReason =
                  ach.group ===
                  "streaks"
                    ? "streak_achievement"
                    : "achievement";

                await addCoins(
                  coinsAwarded,
                  coinReason,
                  {
                    achievementId,
                    baseCoins:
                      reward.baseCoins,
                    specialistBonus:
                      reward.specialistBonus,
                    aetherwyrmBonus:
                      reward.aetherwyrmBonus,
                    awardedCoins:
                      reward.totalCoins,
                    appliedCompanions:
                      reward.appliedCompanions,
                  }
                );
              }
            } catch (e) {
              console.warn(
                "[Achievements] guest addCoins failed",
                e
              );
            }
          }

          finalizeLocalUnlock(
            Date.now(),
            coinsAwarded,
            true
          );
        } finally {
          unlockInFlightRef.current.delete(
            achievementId
          );
        }
      };

      void run();
    },
    [
      addCoins,
      computeAchievementReward,
      persistPendingClaims,
      persistUnlocked,
      supabaseUserId,
    ]
  );

  // ─────────────── DEVELOPMENT TEST HELPERS ───────────────

  const devUnlockAchievement = useCallback(
    (id: string) => {
      if (!__DEV__) return;
      unlock(id);
    },
    [unlock]
  );

  const devResetAchievement = useCallback(
    async (id: string) => {
      if (!__DEV__) return;

      const achievementId = String(id || "").trim();
      if (!achievementId) return;

      const next = { ...unlockedRef.current };
      delete next[achievementId];

      unlockedRef.current = next;
      setUnlocked(next);
      await persistUnlocked();

      console.log(
        "[Achievements] development reset:",
        achievementId
      );
    },
    [persistUnlocked]
  );

  // ─────────────── SHOP PURCHASES ───────────────

  const applyPurchaseThresholds = useCallback(
    (total: number) => {
      const safeTotal = Math.max(0, Math.floor(Number(total) || 0));

      for (const n of PURCHASE_THRESHOLDS) {
        const id = `purchase_${n}`;
        if (safeTotal >= n && !unlockedRef.current[id]) {
          unlock(id);
        }
      }
    },
    [unlock]
  );

  const recordCompletedPurchase = useCallback(
    (payload: any = {}) => {
      const rawKey =
        payload?.purchaseKey ??
        payload?.transactionId ??
        payload?.orderId ??
        payload?.id ??
        "";

      const purchaseKey = String(rawKey || "").trim();

      if (purchaseKey && purchaseKeysRef.current.has(purchaseKey)) {
        console.log(
          "[Achievements] duplicate purchase event ignored:",
          purchaseKey
        );
        return;
      }

      if (purchaseKey) {
        purchaseKeysRef.current.add(purchaseKey);
        void persistPurchaseKeys();
      }

      const delta = Math.max(
        1,
        Math.floor(Number(payload?.delta ?? 1) || 1)
      );

      const ownedCountBefore = Number(payload?.ownedCountBefore);
      const inventoryBacked = payload?.inventoryBacked === true;
      const baselineAlreadyIncludesPurchase =
        inventoryBacked &&
        Number.isFinite(ownedCountBefore) &&
        inventoryBaselineTotalRef.current > ownedCountBefore;

      purchaseBaselineReadyRef.current = true;

      if (baselineAlreadyIncludesPurchase) {
        console.log(
          "[Achievements] inventory baseline already included purchase:",
          purchaseKey || payload?.sku || null
        );
      } else {
        purchaseCountRef.current += delta;
      }

      // The startup inventory baseline is only used to repair old installs.
      // Once a real purchase event arrives, future purchases use transaction
      // events and are not inferred from entitlement counts.
      inventoryBaselineTotalRef.current = 0;

      console.log("[Achievements] purchase total =", purchaseCountRef.current, {
        purchaseKey: purchaseKey || null,
        source: payload?.source ?? null,
        sku: payload?.sku ?? null,
      });

      void persistPurchaseCount();
      applyPurchaseThresholds(purchaseCountRef.current);
    },
    [applyPurchaseThresholds, persistPurchaseCount, persistPurchaseKeys]
  );

  const applyPurchaseInventoryBaseline = useCallback(
    (payload: any = {}) => {
      if (purchaseBaselineReadyRef.current) return;

      const total = Math.max(
        0,
        Math.floor(Number(payload?.total ?? payload?.count ?? 0) || 0)
      );

      if (total <= 0) return;

      purchaseCountRef.current = Math.max(
        purchaseCountRef.current,
        total
      );
      purchaseBaselineReadyRef.current = true;
      inventoryBaselineTotalRef.current = purchaseCountRef.current;

      console.log(
        "[Achievements] purchase inventory baseline =",
        purchaseCountRef.current
      );

      void persistPurchaseCount();
      applyPurchaseThresholds(purchaseCountRef.current);
    },
    [applyPurchaseThresholds, persistPurchaseCount]
  );

  useEffect(() => {
    if (!hydrated) return;

    // Re-check stored totals after hydration. unlock() is idempotent, so this
    // safely repairs users who already crossed a threshold before this fix.
    if (purchaseCountRef.current > 0) {
      applyPurchaseThresholds(purchaseCountRef.current);
    }

    const completedSub = DeviceEventEmitter.addListener(
      SHOP_PURCHASE_COMPLETED_EVENT,
      recordCompletedPurchase
    );

    const inventorySub = DeviceEventEmitter.addListener(
      SHOP_PURCHASE_INVENTORY_EVENT,
      applyPurchaseInventoryBaseline
    );

    return () => {
      completedSub.remove();
      inventorySub.remove();
    };
  }, [
    hydrated,
    applyPurchaseInventoryBaseline,
    applyPurchaseThresholds,
    recordCompletedPurchase,
  ]);

  // ─────────────── QUIZ ───────────────

  const handleQuizFinished = useCallback(
    (
      pct: number,
      subject: string,
      meta: QuizAchievementMeta = {}
    ) => {
      console.log("[Achievements] handleQuizFinished", {
        pct,
        subject,
        topicId: meta.topicId ?? null,
        discipline: meta.discipline ?? null,
      });

      if (pct >= 80 && !unlockedRef.current["quiz_80"]) unlock("quiz_80");
      if (pct >= 85 && !unlockedRef.current["quiz_85"]) unlock("quiz_85");
      if (pct >= 90 && !unlockedRef.current["quiz_90"]) unlock("quiz_90");
      if (pct >= 95 && !unlockedRef.current["quiz_95"]) unlock("quiz_95");
      if (pct >= 100 && !unlockedRef.current["quiz_100"]) unlock("quiz_100");

      quizCountRef.current += 1;
      void persistQuizCount();
      const total = quizCountRef.current;

      const quizTakenThresholds = [1, 5, 10, 25, 50, 100, 200];
      for (const n of quizTakenThresholds) {
        const tid = `quiz_taken_${n}`;
        if (total >= n && !unlockedRef.current[tid]) unlock(tid);
      }

      void recordQuizAchievementProgress({
        ownerId: supabaseUserId ?? "guest",
        pct,
        subject,
        meta,
        unlock,
      });
    },
    [unlock, persistQuizCount, supabaseUserId]
  );

  // Public API used by Quiz screens: emits a "quizFinished" event
  const onQuizFinished = useCallback(
    (
      pct: number,
      subject: string,
      meta: QuizAchievementMeta = {}
    ) => {
      AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
        type: "quizFinished",
        scorePct: pct,
        subject,
        meta,
      });
    },
    []
  );

  // Listen to AchieveEmitter — handle both quizFinished payloads and id-based unlocks
  useEffect(() => {
    if (!hydrated) return;

    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (payload) => {
      if (!payload) return;

      // Quiz completed with a percentage
      if (payload.type === "quizFinished") {
        const pct = Number(payload.scorePct ?? 0);
        const subject = String(payload.subject || "Quiz");
        handleQuizFinished(
          pct,
          subject,
          payload.meta ?? {}
        );
        return;
      }

      // Direct unlock from achievements-bridge: { id }
      if (payload.id && typeof payload.id === "string") {
        unlock(payload.id);
      }
    });

    return () => sub.remove();
  }, [hydrated, handleQuizFinished, unlock]);

  // ─────────────── ASK ───────────────

  const onAskQuestion = useCallback(() => {
    askCountRef.current += 1;
    const total = askCountRef.current;
    persistAskCount();
    console.log("[Achievements] onAskQuestion total =", total);

    for (const n of ASK_THRESHOLDS) {
      const id = `ask_${n}`;
      if (total >= n && !unlockedRef.current[id]) {
        unlock(id);
      }
    }
  }, [unlock, persistAskCount]);

  // ─────────────── FLASHCARDS ───────────────

  const onFlashcardSaved = useCallback(() => {
    flashCountRef.current += 1;
    const total = flashCountRef.current;
    persistFlashCount();
    console.log("[Achievements] onFlashcardSaved total =", total);

    for (const n of FLASH_THRESHOLDS) {
      const id = `flashcards_saved_${n}`;
      if (total >= n && !unlockedRef.current[id]) {
        unlock(id);
      }
    }
  }, [unlock, persistFlashCount]);

  // ─────────────── BRAINTEASERS ───────────────

  const onBrainPairCompleted = useCallback(() => {
    brainCountRef.current += 1;
    const total = brainCountRef.current;
    persistBrainCount();
    console.log("[Achievements] onBrainPairCompleted total =", total);

    for (const n of BRAIN_THRESHOLDS) {
      const id = `brain_pair_${n}`;
      if (total >= n && !unlockedRef.current[id]) {
        unlock(id);
      }
    }
  }, [unlock, persistBrainCount]);

  // ─────────────── RELAX TIME ───────────────

  const onRelaxMinutes = useCallback(
    (deltaMinutes: number) => {
      if (!deltaMinutes || deltaMinutes <= 0) return;
      relaxMinutesRef.current += deltaMinutes;
      const total = relaxMinutesRef.current;
      persistRelaxMinutes();
      console.log("[Achievements] onRelaxMinutes total =", total);

      for (const mins of RELAX_THRESHOLDS) {
        const id = `relax_minutes_${mins}`;
        if (total >= mins && !unlockedRef.current[id]) {
          unlock(id);
        }
      }
    },
    [unlock, persistRelaxMinutes]
  );

  const resetGuestAchievements =
    useCallback(async (): Promise<void> => {
      /*
       * Guest achievement progress is session-only.
       * Signed-in achievement keys are deliberately untouched.
       *
       * Also clear the old device-global quiz flags so a previous
       * anonymous session cannot affect the new guest.
       *
       * The Nova AI installation identifier is NOT part of this list.
       */
      if (supabaseUserId) {
        return;
      }

      unlockedRef.current = {};
      quizCountRef.current = 0;
      askCountRef.current = 0;
      flashCountRef.current = 0;
      brainCountRef.current = 0;
      relaxMinutesRef.current = 0;
      purchaseCountRef.current = 0;
      purchaseKeysRef.current =
        new Set();
      pendingClaimsRef.current =
        new Set();
      unlockInFlightRef.current =
        new Set();
      purchaseBaselineReadyRef.current =
        false;
      inventoryBaselineTotalRef.current =
        0;

      setUnlocked({});

      await AsyncStorage.multiRemove([
        storageKey(
          STORAGE_BASE_UNLOCKED,
          null
        ),
        storageKey(
          STORAGE_BASE_QUIZ_COUNT,
          null
        ),
        storageKey(
          STORAGE_BASE_ASK_COUNT,
          null
        ),
        storageKey(
          STORAGE_BASE_FLASHCARD_COUNT,
          null
        ),
        storageKey(
          STORAGE_BASE_BRAIN_COUNT,
          null
        ),
        storageKey(
          STORAGE_BASE_RELAX_MIN,
          null
        ),
        storageKey(
          STORAGE_BASE_PURCHASE_COUNT,
          null
        ),
        storageKey(
          STORAGE_BASE_PURCHASE_KEYS,
          null
        ),
        storageKey(
          STORAGE_BASE_PENDING_CLAIMS,
          null
        ),

        // Legacy device-global quiz achievement flags.
        "@nova/achievements.quizFlags.v1",
      ]);

      if (__DEV__) {
        console.log(
          "[Achievements] fresh guest progress reset"
        );
      }
    }, [supabaseUserId]);

  const value = useMemo<AchievementsContextValue>(
    () => ({
      unlocked,
      onQuizFinished,
      onAskQuestion,
      onFlashcardSaved,
      onBrainPairCompleted,
      onRelaxMinutes,
      resetGuestAchievements,
      devUnlockAchievement,
      devResetAchievement,
      devAchievementRewardPreview: computeAchievementReward,
      devAchievementCompanionDebug: {
                mechaOwlDetected: hasMechaOwl,
      },
    }),
    [
      unlocked,
      onQuizFinished,
      onAskQuestion,
      onFlashcardSaved,
      onBrainPairCompleted,
      onRelaxMinutes,
      resetGuestAchievements,
      devUnlockAchievement,
      devResetAchievement,
      computeAchievementReward,
    ]
  );

  return (
    <AchievementsCtx.Provider value={value}>
      {children}
    </AchievementsCtx.Provider>
  );
}