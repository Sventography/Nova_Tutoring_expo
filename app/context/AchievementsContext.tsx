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

import { ACHIEVEMENT_LIST } from "../constants/achievements";
import { useCoins } from "./CoinsContext";
import { useUser } from "./UserContext";
import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";

const STORAGE_BASE_UNLOCKED = "@achieve/unlocked.v1";
const STORAGE_BASE_QUIZ_COUNT = "@achieve/quizCount.v1";
const STORAGE_BASE_ASK_COUNT = "@achieve/askCount.v1";
const STORAGE_BASE_FLASHCARD_COUNT = "@achieve/flashcardCount.v1";
const STORAGE_BASE_BRAIN_COUNT = "@achieve/brainteaserCount.v1";
const STORAGE_BASE_RELAX_MIN = "@achieve/relaxMinutes.v1";
const STORAGE_BASE_PURCHASE_COUNT = "@achieve/purchaseCount.v1";
const STORAGE_BASE_PURCHASE_KEYS = "@achieve/purchaseKeys.v1";

export const ACHIEVEMENT_EVENT = "ACHIEVEMENT_EVENT";
export const SHOP_PURCHASE_COMPLETED_EVENT = "shop:purchase_completed";
export const SHOP_PURCHASE_INVENTORY_EVENT = "shop:purchase_inventory";

// ─────────────── TYPES ───────────────

type UnlockedMap = Record<string, number>; // id -> timestamp

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  onQuizFinished: (pct: number, subject: string) => void;
  onAskQuestion?: () => void;
  onFlashcardSaved?: () => void;
  onBrainPairCompleted?: () => void;
  onRelaxMinutes?: (deltaMinutes: number) => void;

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
  devAchievementRewardPreview?: (
    base: number,
    id: string
  ) => number;
  devAchievementCompanionDebug?: {
    activeCompanionId: string | null;
    activeCompanionToken: string;
    activeAbilityType: string | null;
    activeBonusPercent: number;
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
  const purchaseBaselineReadyRef = useRef(false);
  const inventoryBaselineTotalRef = useRef(0);
  const [hydrated, setHydrated] = useState(false);

  const { addCoins } = useCoins();

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
    (async () => {
      try {
        setHydrated(false);
        // reset in-memory refs when switching users
        unlockedRef.current = {};
        quizCountRef.current = 0;
        askCountRef.current = 0;
        flashCountRef.current = 0;
        brainCountRef.current = 0;
        relaxMinutesRef.current = 0;
        purchaseCountRef.current = 0;
        purchaseKeysRef.current = new Set();
        purchaseBaselineReadyRef.current = false;
        inventoryBaselineTotalRef.current = 0;
        setUnlocked({});

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
        ] = await Promise.all([
          AsyncStorage.getItem(storageKey(STORAGE_BASE_UNLOCKED, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_QUIZ_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_ASK_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_FLASHCARD_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_BRAIN_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_RELAX_MIN, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_PURCHASE_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_PURCHASE_KEYS, uid)),
        ]);

        if (rawUnlocked) {
          try {
            const parsed: UnlockedMap = JSON.parse(rawUnlocked);
            unlockedRef.current = parsed || {};
            setUnlocked(parsed || {});
          } catch (e) {
            console.warn("[Achievements] parse unlocked failed", e);
          }
        }

        quizCountRef.current = parseNum(rawQuizCount);
        askCountRef.current = parseNum(rawAskCount);
        flashCountRef.current = parseNum(rawFlashCount);
        brainCountRef.current = parseNum(rawBrainCount);
        relaxMinutesRef.current = parseNum(rawRelaxMin);
        purchaseCountRef.current = parseNum(rawPurchaseCount);
        purchaseBaselineReadyRef.current = rawPurchaseCount !== null;

        if (rawPurchaseKeys) {
          try {
            const parsedKeys = JSON.parse(rawPurchaseKeys);
            if (Array.isArray(parsedKeys)) {
              purchaseKeysRef.current = new Set(
                parsedKeys
                  .map((value) => String(value || "").trim())
                  .filter(Boolean)
              );
            }
          } catch (e) {
            console.warn("[Achievements] parse purchase keys failed", e);
          }
        }
      } catch (e) {
        console.warn("[Achievements] hydrate failed", e);
      } finally {
        setHydrated(true);
      }
    })();
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
    (id: string, opts?: { silent?: boolean }) => {
      if (unlockedRef.current[id]) return;

      const now = Date.now();
      unlockedRef.current = { ...unlockedRef.current, [id]: now };
      setUnlocked(unlockedRef.current);
      persistUnlocked();

      const ach = ACH_MAP[id];
      if (ach) {
        let coinsAwarded = 0;

        if (ach.coins && ach.coins > 0 && typeof addCoins === "function") {
          try {
            const base =
              ach.coins;

            const reward =
              computeAchievementReward(
                base,
                id
              );

            coinsAwarded =
              reward.totalCoins;

            if (coinsAwarded > 0) {
              console.log(
                "[Achievements] awarding coins",
                coinsAwarded,
                "for",
                id
              );

              void addCoins(
                coinsAwarded,
                "achievement",
                {
                  achievementId:
                    id,
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
            console.warn("[Achievements] addCoins failed", e);
          }
        }

        if (!opts?.silent) {
          const hasCoins = coinsAwarded > 0;
          const label = ach.title;

          // 🔔 Notify the detailed overlay with title + coins
          try {
            AchieveEmitter.emit("achievement_unlocked_detail", {
              id,
              title: label,
              coins: coinsAwarded,
            });
          } catch (e) {
            console.warn(
              "[Achievements] achievement_unlocked_detail emit failed",
              e
            );
          }

          // 🎉 Also emit a simple celebrate banner message
          try {
            const bannerMessage = hasCoins
              ? `${label} — +${coinsAwarded.toLocaleString()} coins`
              : label || "Achievement unlocked!";
            console.log("[Achievements] emit celebrate:", bannerMessage);
            AchieveEmitter.emit("celebrate", bannerMessage);
          } catch (e) {
            console.warn("[Achievements] celebrate emit failed", e);
          }
        }
      }

      try {
        DeviceEventEmitter.emit(ACHIEVEMENT_EVENT, { id, ts: now });
        if (Platform.OS === "web" && typeof window !== "undefined") {
          try {
            window.dispatchEvent(new Event(ACHIEVEMENT_EVENT));
          } catch {}
        }
      } catch (e) {
        console.warn("[Achievements] DeviceEventEmitter emit failed", e);
      }
    },
    [addCoins, persistUnlocked, computeAchievementReward]
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
    (pct: number, subject: string) => {
      console.log("[Achievements] handleQuizFinished", { pct, subject });

      if (pct >= 80 && !unlockedRef.current["quiz_80"]) unlock("quiz_80");
      if (pct >= 85 && !unlockedRef.current["quiz_85"]) unlock("quiz_85");
      if (pct >= 90 && !unlockedRef.current["quiz_90"]) unlock("quiz_90");
      if (pct >= 95 && !unlockedRef.current["quiz_95"]) unlock("quiz_95");
      if (pct >= 100 && !unlockedRef.current["quiz_100"]) unlock("quiz_100");

      quizCountRef.current += 1;
      persistQuizCount();
      const total = quizCountRef.current;

      const quizTakenThresholds = [1, 5, 10, 25, 50, 100, 200];
      for (const n of quizTakenThresholds) {
        const tid = `quiz_taken_${n}`;
        if (total >= n && !unlockedRef.current[tid]) unlock(tid);
      }
    },
    [unlock, persistQuizCount]
  );

  // Public API used by Quiz screens: emits a "quizFinished" event
  const onQuizFinished = useCallback((pct: number, subject: string) => {
    AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
      type: "quizFinished",
      scorePct: pct,
      subject,
    });
  }, []);

  // Listen to AchieveEmitter — handle both quizFinished payloads and id-based unlocks
  useEffect(() => {
    if (!hydrated) return;

    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (payload) => {
      if (!payload) return;

      // Quiz completed with a percentage
      if (payload.type === "quizFinished") {
        const pct = Number(payload.scorePct ?? 0);
        const subject = String(payload.subject || "Quiz");
        handleQuizFinished(pct, subject);
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

  const value = useMemo<AchievementsContextValue>(
    () => ({
      unlocked,
      onQuizFinished,
      onAskQuestion,
      onFlashcardSaved,
      onBrainPairCompleted,
      onRelaxMinutes,
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