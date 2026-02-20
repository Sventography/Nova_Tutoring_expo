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
import { useToast } from "./ToastContext";
import { useUser } from "./UserContext";
import { useCompanion } from "./CompanionContext";
import { canonId } from "../_lib/canonId";

const STORAGE_BASE_UNLOCKED = "@achieve/unlocked.v1";
const STORAGE_BASE_QUIZ_COUNT = "@achieve/quizCount.v1";
const STORAGE_BASE_ASK_COUNT = "@achieve/askCount.v1";
const STORAGE_BASE_FLASHCARD_COUNT = "@achieve/flashcardCount.v1";
const STORAGE_BASE_BRAIN_COUNT = "@achieve/brainteaserCount.v1";
const STORAGE_BASE_RELAX_MIN = "@achieve/relaxMinutes.v1";

export const ACHIEVEMENT_EVENT = "ACHIEVEMENT_EVENT";

// ─────────────── TYPES ───────────────

type UnlockedMap = Record<string, number>; // id -> timestamp

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  onQuizFinished: (pct: number, subject: string) => void;
  onAskQuestion?: () => void;
  onFlashcardSaved?: () => void;
  onBrainPairCompleted?: () => void;
  onRelaxMinutes?: (deltaMinutes: number) => void;
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
  private listeners: Record<string, Listener[]> = {};

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

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();
  const { activeCompanionId } = useCompanion();

  const [unlocked, setUnlocked] = useState<UnlockedMap>({});
  const unlockedRef = useRef<UnlockedMap>({});
  const quizCountRef = useRef<number>(0);
  const askCountRef = useRef<number>(0);
  const flashCountRef = useRef<number>(0);
  const brainCountRef = useRef<number>(0);
  const relaxMinutesRef = useRef<number>(0);
  const [hydrated, setHydrated] = useState(false);

  const coinsApi = useCoins();
  const { show: showToast } = useToast();

  const addCoinsFn = useMemo(() => {
    const anyCoins = coinsApi as any;
    if (typeof anyCoins.add === "function") return anyCoins.add.bind(anyCoins);
    if (typeof anyCoins.addCoins === "function")
      return anyCoins.addCoins.bind(anyCoins);
    if (typeof anyCoins.credit === "function")
      return anyCoins.credit.bind(anyCoins);
    console.warn("[Achievements] No coin adder function found in useCoins()");
    return null;
  }, [coinsApi]);

  // Active companion & legendary flags
  const activeCompanionCid = useMemo(
    () => (activeCompanionId ? canonId(activeCompanionId) : null),
    [activeCompanionId]
  );

  const hasAetherwyrm = activeCompanionCid === "companion:aetherwyrm";
  const hasMechaOwl = activeCompanionCid === "companion:mecha_owl";
  const hasCelestra = activeCompanionCid === "companion:celestra";

  // Companion-based coin multiplier for achievements
  const computeAchievementCoins = useCallback(
    (base: number, id: string): number => {
      if (!base || base <= 0) return 0;
      let amount = base;

      const meta = ACH_MAP[id];

      // Mecha Owl: +10% on all achievement rewards
      if (hasMechaOwl) {
        amount = Math.round(amount * 1.1);
      }

      // Celestra: +25% on streak achievements only
      if (meta && meta.group === "streaks" && hasCelestra) {
        amount = Math.round(amount * 1.25);
      }

      // Aetherwyrm: +20% on all achievements (global coin booster)
      if (hasAetherwyrm) {
        amount = Math.round(amount * 1.2);
      }

      if (amount < 1) amount = 1;
      return amount;
    },
    [hasMechaOwl, hasCelestra, hasAetherwyrm]
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
        setUnlocked({});

        const uid = supabaseUserId ?? null;

        const [
          rawUnlocked,
          rawQuizCount,
          rawAskCount,
          rawFlashCount,
          rawBrainCount,
          rawRelaxMin,
        ] = await Promise.all([
          AsyncStorage.getItem(storageKey(STORAGE_BASE_UNLOCKED, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_QUIZ_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_ASK_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_FLASHCARD_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_BRAIN_COUNT, uid)),
          AsyncStorage.getItem(storageKey(STORAGE_BASE_RELAX_MIN, uid)),
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
        if (ach.coins && ach.coins > 0 && addCoinsFn) {
          try {
            const base = ach.coins;
            const coinsToAward = computeAchievementCoins(base, id);

            if (coinsToAward > 0) {
              console.log(
                "[Achievements] awarding coins",
                coinsToAward,
                "for",
                id
              );
              const res = addCoinsFn(coinsToAward);
              if (res && typeof (res as any).catch === "function") {
                (res as any).catch((e: any) =>
                  console.warn("[Achievements] addCoins async failed", e)
                );
              }
            }
          } catch (e) {
            console.warn("[Achievements] addCoins failed", e);
          }
        }

        if (!opts?.silent) {
          try {
            const label =
              ach.coins && ach.coins > 0
                ? `${ach.title}`
                : ach.title;
            showToast({
              title: "Achievement unlocked!",
              message:
                ach.coins && ach.coins > 0
                  ? label
                  : ach.title,
              type: "success",
              icon: "🎉",
            });
          } catch (e) {
            console.warn("[Achievements] toast failed", e);
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
    [addCoinsFn, showToast, persistUnlocked, computeAchievementCoins]
  );

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
        const id = `quiz_taken_${n}`;
        if (total >= n && !unlockedRef.current[id]) unlock(id);
      }
    },
    [unlock, persistQuizCount]
  );

  const onQuizFinished = useCallback((pct: number, subject: string) => {
    AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
      type: "quizFinished",
      scorePct: pct,
      subject,
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (payload) => {
      if (!payload || payload.type !== "quizFinished") return;
      const pct = Number(payload.scorePct ?? 0);
      const subject = String(payload.subject || "Quiz");
      handleQuizFinished(pct, subject);
    });

    return () => sub.remove();
  }, [hydrated, handleQuizFinished]);

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
    }),
    [
      unlocked,
      onQuizFinished,
      onAskQuestion,
      onFlashcardSaved,
      onBrainPairCompleted,
      onRelaxMinutes,
    ]
  );

  return (
    <AchievementsCtx.Provider value={value}>
      {children}
    </AchievementsCtx.Provider>
  );
}