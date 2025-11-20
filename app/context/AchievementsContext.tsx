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

const STORAGE_KEY_UNLOCKED = "@achieve/unlocked.v1";
const STORAGE_KEY_QUIZ_COUNT = "@achieve/quizCount.v1";

export const ACHIEVEMENT_EVENT = "ACHIEVEMENT_EVENT";

// ───────────────── TYPES ─────────────────

type UnlockedMap = Record<string, number>; // id -> timestamp

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  onQuizFinished: (pct: number, subject: string) => void;
};

type Listener = (payload: any) => void;

// ───────────────── SIMPLE EMITTER (USED BY QUIZ + BRIDGE) ─────────────────

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

// Build a quick lookup map from ACHIEVEMENT_LIST for coins & title
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

// ───────────────── CONTEXT ─────────────────

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
  const [unlocked, setUnlocked] = useState<UnlockedMap>({});
  const unlockedRef = useRef<UnlockedMap>({});
  const quizCountRef = useRef<number>(0);
  const [hydrated, setHydrated] = useState(false);

  const { add: addCoins } = useCoins();
  const { show: showToast } = useToast();

  // ───────────────── HYDRATE FROM STORAGE ─────────────────

  useEffect(() => {
    (async () => {
      try {
        const [rawUnlocked, rawQuizCount] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_UNLOCKED),
          AsyncStorage.getItem(STORAGE_KEY_QUIZ_COUNT),
        ]);

        if (rawUnlocked) {
          const parsed: UnlockedMap = JSON.parse(rawUnlocked);
          unlockedRef.current = parsed || {};
          setUnlocked(parsed || {});
        }

        if (rawQuizCount) {
          const n = parseInt(rawQuizCount, 10);
          if (!Number.isNaN(n)) {
            quizCountRef.current = n;
          }
        }
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

  // ───────────────── UNLOCK HELPER ─────────────────

  const unlock = useCallback(
    (id: string, opts?: { silent?: boolean }) => {
      if (unlockedRef.current[id]) return;

      const now = Date.now();
      unlockedRef.current = { ...unlockedRef.current, [id]: now };
      setUnlocked(unlockedRef.current);
      persistUnlocked();

      const ach = ACH_MAP[id];
      if (ach) {
        // 👇 Only award coins for NON-silent unlocks
        if (!opts?.silent && ach.coins && ach.coins > 0) {
          try {
            addCoins(ach.coins);
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
            });
          } catch (e) {
            console.warn("[Achievements] toast failed", e);
          }
        }
      }

      // Notify UI (confetti / haptics)
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
    [addCoins, showToast, persistUnlocked]
  );

  // ───────────────── QUIZ FINISHED HANDLER ─────────────────

  const handleQuizFinished = useCallback(
    (pct: number, subject: string) => {
      console.log("[Achievements] handleQuizFinished", {
        pct,
        subject,
        hydrated,
      });

      // 1️⃣ First quiz completed
      if (!unlockedRef.current["first_quiz"]) {
        unlock("first_quiz");
      }

      // 2️⃣ Score-based (global)
      if (pct >= 80 && !unlockedRef.current["quiz_80"]) {
        unlock("quiz_80");
      }
      if (pct >= 85 && !unlockedRef.current["quiz_85"]) {
        unlock("quiz_85");
      }
      if (pct >= 90 && !unlockedRef.current["quiz_90"]) {
        unlock("quiz_90");
      }
      if (pct >= 95 && !unlockedRef.current["quiz_95"]) {
        unlock("quiz_95");
      }
      if (pct >= 100 && !unlockedRef.current["quiz_100"]) {
        unlock("quiz_100");
      }

      // 3️⃣ Quiz count milestones (simple global)
      quizCountRef.current += 1;
      persistQuizCount();
      const total = quizCountRef.current;

      if (total >= 10 && !unlockedRef.current["quiz_10"]) {
        unlock("quiz_10");
      }
      if (total >= 25 && !unlockedRef.current["quiz_25"]) {
        unlock("quiz_25");
      }

      // 4️⃣ Volume-based global (coins disabled by silent flag)
      const volumeThresholds = [1, 5, 10, 25, 50, 100, 200];
      for (const n of volumeThresholds) {
        if (total >= n) {
          const id = `quiz_taken_${n}`;
          if (!unlockedRef.current[id] && ACH_MAP[id]) {
            unlock(id, { silent: true });
          }
        }
      }

      // 5️⃣ Subject-based achievements (also silent: no extra coins)
      const key = subject
        ? subject.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")
        : "";
      if (key) {
        const subjectThresholds = [80, 85, 90, 95, 100];
        for (const p of subjectThresholds) {
          if (pct >= p) {
            const id = `quiz_${key}_${p}`;
            if (!unlockedRef.current[id] && ACH_MAP[id]) {
              unlock(id, { silent: true });
            }
          }
        }

        const subjectVolumeThresholds = [1, 5, 10, 25, 50, 100, 200];
        for (const n of subjectVolumeThresholds) {
          if (total >= n) {
            const id = `quiz_taken_${key}_${n}`;
            if (!unlockedRef.current[id] && ACH_MAP[id]) {
              unlock(id, { silent: true });
            }
          }
        }
      }
    },
    [unlock, persistQuizCount, hydrated]
  );

  // Exposed API for TopicQuiz, etc.
  const onQuizFinished = useCallback(
    (pct: number, subject: string) => {
      console.log("[Achievements] onQuizFinished emit", { pct, subject });
      AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
        type: "quizFinished",
        scorePct: pct,
        subject,
      });
    },
    []
  );

  // Listen to the emitter for quizFinished events (both from onQuizFinished and any bridges)
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

  const value = useMemo<AchievementsContextValue>(
    () => ({
      unlocked,
      onQuizFinished,
    }),
    [unlocked, onQuizFinished]
  );

  return (
    <AchievementsCtx.Provider value={value}>
      {children}
    </AchievementsCtx.Provider>
  );
}
