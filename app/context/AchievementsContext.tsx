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

const STORAGE_KEY_UNLOCKED = "@achieve/unlocked.v1";
const STORAGE_KEY_QUIZ_COUNT = "@achieve/quizCount.v1";
const STORAGE_KEY_ASK_COUNT = "@achieve/askCount.v1";
const STORAGE_KEY_FLASHCARD_COUNT = "@achieve/flashcardCount.v1";
const STORAGE_KEY_BRAIN_COUNT = "@achieve/brainteaserCount.v1";
const STORAGE_KEY_RELAX_MIN = "@achieve/relaxMinutes.v1";

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
const ACH_MAP: Record<
  string,
  { id: string; title: string; coins: number; desc?: string }
> = ACHIEVEMENT_LIST.reduce((acc, a) => {
  acc[a.id] = {
    id: a.id,
    title: a.title,
    coins: a.coins ?? 0,
    desc: a.desc,
  };
  return acc;
}, {} as Record<string, { id: string; title: string; coins: number; desc?: string }>);

// thresholds
const ASK_THRESHOLDS = [
  1, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000,
];
const FLASH_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200];
const BRAIN_THRESHOLDS = [1, 3, 5, 10, 20, 50, 100];
const RELAX_THRESHOLDS = [5, 10, 20, 30, 60, 120];

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
    if (typeof anyCoins.addCoins === "function") return anyCoins.addCoins.bind(anyCoins);
    if (typeof anyCoins.credit === "function") return anyCoins.credit.bind(anyCoins);
    console.warn("[Achievements] No coin adder function found in useCoins()");
    return null;
  }, [coinsApi]);

  // ─────────────── HYDRATE ───────────────

  useEffect(() => {
    (async () => {
      try {
        const [
          rawUnlocked,
          rawQuizCount,
          rawAskCount,
          rawFlashCount,
          rawBrainCount,
          rawRelaxMin,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_UNLOCKED),
          AsyncStorage.getItem(STORAGE_KEY_QUIZ_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_ASK_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_FLASHCARD_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_BRAIN_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_RELAX_MIN),
        ]);

        if (rawUnlocked) {
          const parsed: UnlockedMap = JSON.parse(rawUnlocked);
          unlockedRef.current = parsed || {};
          setUnlocked(parsed || {});
        }

        const parseNum = (raw: string | null) => {
          if (!raw) return 0;
          const n = parseInt(raw, 10);
          return Number.isNaN(n) ? 0 : n;
        };

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
  }, []);

  const persistUnlocked = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_UNLOCKED,
        JSON.stringify(unlockedRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist unlocked failed", e);
    }
  }, []);

  const persistQuizCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_QUIZ_COUNT,
        String(quizCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist quiz count failed", e);
    }
  }, []);

  const persistAskCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_ASK_COUNT,
        String(askCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist ask count failed", e);
    }
  }, []);

  const persistFlashCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_FLASHCARD_COUNT,
        String(flashCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist flashcard count failed", e);
    }
  }, []);

  const persistBrainCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_BRAIN_COUNT,
        String(brainCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist brainteaser count failed", e);
    }
  }, []);

  const persistRelaxMinutes = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_RELAX_MIN,
        String(relaxMinutesRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist relax minutes failed", e);
    }
  }, []);

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
            console.log("[Achievements] awarding coins", ach.coins, "for", id);
            const res = addCoinsFn(ach.coins);
            if (res && typeof (res as any).catch === "function") {
              (res as any).catch((e: any) =>
                console.warn("[Achievements] addCoins async failed", e)
              );
            }
          } catch (e) {
            console.warn("[Achievements] addCoins failed", e);
          }
        }

        if (!opts?.silent) {
          try {
            showToast({
              title: "Achievement unlocked!",
              message:
                ach.coins && ach.coins > 0
                  ? `${ach.title} • +${ach.coins} coins`
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
    [addCoinsFn, showToast, persistUnlocked]
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
