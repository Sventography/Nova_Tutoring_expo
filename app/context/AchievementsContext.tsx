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
import { DeviceEventEmitter, Platform, AppState } from "react-native";
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

// Quiz streak + last day + per-topic last day
const STORAGE_KEY_QUIZ_STREAK = "@achieve/quizStreak.v1";
const STORAGE_KEY_QUIZ_LAST_DAY = "@achieve/quizLastDay.v1";
const STORAGE_KEY_TOPIC_LAST = "@achieve/topicLastMap.v1";

// Advanced quiz stats
const STORAGE_KEY_PERFECT_COUNT = "@achieve/perfectCount.v1";
const STORAGE_KEY_PERFECT_TOPICS = "@achieve/perfectTopics.v1";
const STORAGE_KEY_CORRECT_TOTAL = "@achieve/correctTotal.v1";
const STORAGE_KEY_SCORE_SUM = "@achieve/scoreSumPct.v1";
const STORAGE_KEY_BEST_SCORE = "@achieve/bestScorePct.v1";

// Daily app usage streak
const STORAGE_KEY_DAILY_STREAK = "@achieve/dailyStreak.v1";
const STORAGE_KEY_DAILY_LAST_DAY = "@achieve/dailyLastDay.v1";

export const ACHIEVEMENT_EVENT = "ACHIEVEMENT_EVENT";

// We assume 20 questions per quiz run
const QUESTIONS_PER_QUIZ = 20;

// ─────────────── TYPES ───────────────

type UnlockedMap = Record<string, number>; // id -> timestamp

type AchievementsContextValue = {
  unlocked: UnlockedMap;
  // seconds is optional; if we pass it later we can unlock speed-based feats.
  onQuizFinished: (pct: number, subject: string, seconds?: number) => void;
  onAskQuestion?: () => void;
  onFlashcardSaved?: () => void;
  onBrainPairCompleted?: () => void;
  onRelaxMinutes?: (deltaMinutes: number) => void;
  // new: generic daily “used the app” check-in
  onDailyCheckIn?: () => void;
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
        console.error("[AchieveEmitter] listener error", e);
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
    coins: (a as any).coins ?? 0,
    desc: (a as any).desc,
  };
  return acc;
}, {} as Record<string, { id: string; title: string; coins: number; desc?: string }>);

// thresholds

// Ask screen usage
const ASK_THRESHOLDS = [
  1, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000,
];

// Flashcards saved to collections
const FLASH_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200];

// Brainteaser pairs completed
const BRAIN_THRESHOLDS = [1, 3, 5, 10, 20, 50, 100];

// Relax minutes cumulative
const RELAX_THRESHOLDS = [5, 10, 20, 30, 60, 120];

// Total quizzes completed
const QUIZ_COUNT_THRESHOLDS = [1, 5, 10, 20, 30, 50, 75, 100, 150, 200];

// Quiz-per-day streaks
const QUIZ_STREAK_THRESHOLDS = [2, 3, 5, 7, 10, 14, 21, 30];

// Perfect quiz count
const PERFECT_THRESHOLDS = [1, 3, 5, 10, 20];

// Mastery topics (topics with at least one perfect 20/20)
const MASTER_TOPIC_THRESHOLDS = [3, 5, 10, 20];

// Total correct answers
const CORRECT_THRESHOLDS = [50, 100, 250, 500, 750, 1000, 1500, 2000];

// Average score bands
const AVG_CONFIG = [
  { id: "avg_70", minQuizzes: 10, minAvg: 70 },
  { id: "avg_80", minQuizzes: 15, minAvg: 80 },
  { id: "avg_90", minQuizzes: 20, minAvg: 90 },
];

// Daily streak thresholds (generic “used the app” days)
const DAILY_STREAK_THRESHOLDS = [1, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100];

// ─────────────── DATE HELPERS ───────────────

function dayKeyFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(dayA: string, dayB: string): number {
  if (dayA === dayB) return 0;
  const [y1, m1, d1] = dayA.split("-").map(Number);
  const [y2, m2, d2] = dayB.split("-").map(Number);
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  const diffMs = t2 - t1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
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

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<UnlockedMap>({});
  const unlockedRef = useRef<UnlockedMap>({});

  const quizCountRef = useRef<number>(0);
  const askCountRef = useRef<number>(0);
  const flashCountRef = useRef<number>(0);
  const brainCountRef = useRef<number>(0);
  const relaxMinutesRef = useRef<number>(0);

  // Quiz streak + last quiz day + per-topic last day
  const quizStreakRef = useRef<number>(0);
  const lastQuizDayRef = useRef<string | null>(null);
  const topicLastRef = useRef<Record<string, string>>({});

  // Advanced quiz stats
  const perfectCountRef = useRef<number>(0);
  const perfectTopicsRef = useRef<Record<string, boolean>>({});
  const correctTotalRef = useRef<number>(0);
  const scoreSumRef = useRef<number>(0);
  const bestScorePctRef = useRef<number>(0);

  // Daily app usage streak
  const dailyStreakRef = useRef<number>(0);
  const lastDailyDayRef = useRef<string | null>(null);

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
          rawQuizStreak,
          rawQuizLastDay,
          rawTopicLast,
          rawPerfectCount,
          rawPerfectTopics,
          rawCorrectTotal,
          rawScoreSum,
          rawBestScore,
          rawDailyStreak,
          rawDailyLastDay,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_UNLOCKED),
          AsyncStorage.getItem(STORAGE_KEY_QUIZ_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_ASK_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_FLASHCARD_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_BRAIN_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_RELAX_MIN),
          AsyncStorage.getItem(STORAGE_KEY_QUIZ_STREAK),
          AsyncStorage.getItem(STORAGE_KEY_QUIZ_LAST_DAY),
          AsyncStorage.getItem(STORAGE_KEY_TOPIC_LAST),
          AsyncStorage.getItem(STORAGE_KEY_PERFECT_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_PERFECT_TOPICS),
          AsyncStorage.getItem(STORAGE_KEY_CORRECT_TOTAL),
          AsyncStorage.getItem(STORAGE_KEY_SCORE_SUM),
          AsyncStorage.getItem(STORAGE_KEY_BEST_SCORE),
          AsyncStorage.getItem(STORAGE_KEY_DAILY_STREAK),
          AsyncStorage.getItem(STORAGE_KEY_DAILY_LAST_DAY),
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

        quizStreakRef.current = parseNum(rawQuizStreak);
        lastQuizDayRef.current = rawQuizLastDay || null;

        if (rawTopicLast) {
          try {
            const parsed = JSON.parse(rawTopicLast);
            if (parsed && typeof parsed === "object") {
              topicLastRef.current = parsed;
            }
          } catch (e) {
            console.warn("[Achievements] parse topicLastMap failed", e);
          }
        }

        perfectCountRef.current = parseNum(rawPerfectCount);
        correctTotalRef.current = parseNum(rawCorrectTotal);
        scoreSumRef.current = parseNum(rawScoreSum);
        bestScorePctRef.current = parseNum(rawBestScore);

        if (rawPerfectTopics) {
          try {
            const parsed = JSON.parse(rawPerfectTopics);
            if (parsed && typeof parsed === "object") {
              perfectTopicsRef.current = parsed;
            }
          } catch (e) {
            console.warn("[Achievements] parse perfectTopics failed", e);
          }
        }

        dailyStreakRef.current = parseNum(rawDailyStreak);
        lastDailyDayRef.current = rawDailyLastDay || null;
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

  const persistQuizStreak = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_QUIZ_STREAK,
        String(quizStreakRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist quiz streak failed", e);
    }
  }, []);

  const persistQuizLastDay = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_QUIZ_LAST_DAY,
        lastQuizDayRef.current || ""
      );
    } catch (e) {
      console.warn("[Achievements] persist quiz last day failed", e);
    }
  }, []);

  const persistTopicLast = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_TOPIC_LAST,
        JSON.stringify(topicLastRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist topicLastMap failed", e);
    }
  }, []);

  const persistPerfectCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_PERFECT_COUNT,
        String(perfectCountRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist perfectCount failed", e);
    }
  }, []);

  const persistPerfectTopics = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_PERFECT_TOPICS,
        JSON.stringify(perfectTopicsRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist perfectTopics failed", e);
    }
  }, []);

  const persistCorrectTotal = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_CORRECT_TOTAL,
        String(correctTotalRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist correctTotal failed", e);
    }
  }, []);

  const persistScoreSum = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_SCORE_SUM,
        String(scoreSumRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist scoreSum failed", e);
    }
  }, []);

  const persistBestScore = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_BEST_SCORE,
        String(bestScorePctRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist bestScore failed", e);
    }
  }, []);

  const persistDailyStreak = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_DAILY_STREAK,
        String(dailyStreakRef.current)
      );
    } catch (e) {
      console.warn("[Achievements] persist daily streak failed", e);
    }
  }, []);

  const persistDailyLastDay = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_DAILY_LAST_DAY,
        lastDailyDayRef.current || ""
      );
    } catch (e) {
      console.warn("[Achievements] persist daily last day failed", e);
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
    (pctRaw: number, subject: string, seconds?: number) => {
      console.log("[Achievements] handleQuizFinished", {
        pct: pctRaw,
        subject,
        seconds,
      });

      const pct = Math.max(0, Math.min(100, Number.isFinite(pctRaw) ? pctRaw : 0));
      const now = Date.now();
      const todayKey = dayKeyFromTs(now);

      // Track total quizzes taken
      const prevQuizCount = quizCountRef.current;
      quizCountRef.current = prevQuizCount + 1;
      persistQuizCount();
      const quizCount = quizCountRef.current;

      for (const n of QUIZ_COUNT_THRESHOLDS) {
        const id = `quiz_${n}`;
        if (quizCount >= n && !unlockedRef.current[id]) {
          unlock(id);
        }
      }

      // Correct answers for this run (based on QUESTIONS_PER_QUIZ)
      const correctThisRun = Math.round((pct / 100) * QUESTIONS_PER_QUIZ);
      correctTotalRef.current += correctThisRun;
      persistCorrectTotal();
      const correctTotal = correctTotalRef.current;

      for (const n of CORRECT_THRESHOLDS) {
        const id = `correct_${n}`;
        if (correctTotal >= n && !unlockedRef.current[id]) {
          unlock(id);
        }
      }

      // Score feats: 15+, 18+, "Almost Perfect" (19/20)
      if (correctThisRun >= 15 && !unlockedRef.current["score_15"]) {
        unlock("score_15");
      }
      if (correctThisRun >= 18 && !unlockedRef.current["score_18"]) {
        unlock("score_18");
      }
      if (correctThisRun === 19 && !unlockedRef.current["score_19"]) {
        unlock("score_19");
      }

      // Perfects + mastery
      const isPerfect = pct >= 100;
      if (isPerfect) {
        perfectCountRef.current += 1;
        persistPerfectCount();

        if (subject) {
          const wasPerfectBefore = !!perfectTopicsRef.current[subject];
          if (!wasPerfectBefore) {
            perfectTopicsRef.current = {
              ...perfectTopicsRef.current,
              [subject]: true,
            };
            persistPerfectTopics();
          }
        }

        const perfectCount = perfectCountRef.current;
        for (const n of PERFECT_THRESHOLDS) {
          const id = `perfect_${n}`;
          if (perfectCount >= n && !unlockedRef.current[id]) {
            unlock(id);
          }
        }

        const uniquePerfectTopics = Object.keys(perfectTopicsRef.current).length;
        for (const n of MASTER_TOPIC_THRESHOLDS) {
          const id = `master_${n}`;
          if (uniquePerfectTopics >= n && !unlockedRef.current[id]) {
            unlock(id);
          }
        }
      }

      // Grit: number of quizzes before first perfect
      if (perfectCountRef.current === 0) {
        if (quizCount >= 10 && !unlockedRef.current["grit_10"]) {
          unlock("grit_10");
        }
        if (quizCount >= 25 && !unlockedRef.current["grit_25"]) {
          unlock("grit_25");
        }
      }

      // Average score achievements
      scoreSumRef.current += pct;
      persistScoreSum();
      const avg = quizCount > 0 ? scoreSumRef.current / quizCount : 0;

      for (const cfg of AVG_CONFIG) {
        if (
          quizCount >= cfg.minQuizzes &&
          avg >= cfg.minAvg &&
          !unlockedRef.current[cfg.id]
        ) {
          unlock(cfg.id);
        }
      }

      // PB score
      if (pct > bestScorePctRef.current) {
        bestScorePctRef.current = pct;
        persistBestScore();
        if (!unlockedRef.current["pb_score"]) {
          unlock("pb_score");
        }
      }

      // Quiz-per-day streaks
      const prevDay = lastQuizDayRef.current;
      if (!prevDay) {
        quizStreakRef.current = 1;
      } else {
        const diff = daysBetween(prevDay, todayKey);
        if (diff === 0) {
          // same day, leave streak as-is
        } else if (diff === 1) {
          quizStreakRef.current = (quizStreakRef.current || 0) + 1;
        } else if (diff > 1) {
          quizStreakRef.current = 1;
        }
      }
      lastQuizDayRef.current = todayKey;
      persistQuizStreak();
      persistQuizLastDay();

      const streak = quizStreakRef.current;
      for (const n of QUIZ_STREAK_THRESHOLDS) {
        const id = `qstreak_${n}`;
        if (streak >= n && !unlockedRef.current[id]) {
          unlock(id);
        }
      }

      // Topic return achievements (return_7 / return_30)
      if (subject) {
        const topicMap = topicLastRef.current || {};
        const prevTopicDay = topicMap[subject];

        if (prevTopicDay) {
          const diffTopic = daysBetween(prevTopicDay, todayKey);
          if (diffTopic >= 30 && !unlockedRef.current["return_30"]) {
            unlock("return_30");
          } else if (diffTopic >= 7 && !unlockedRef.current["return_7"]) {
            unlock("return_7");
          }
        }

        topicMap[subject] = todayKey;
        topicLastRef.current = { ...topicMap };
        persistTopicLast();

        // Distinct topics attempted (topics_3 ... topics_50)
        const distinct = Object.keys(topicLastRef.current).length;
        const TOPIC_THRESHOLDS = [3, 5, 10, 15, 20, 30, 40, 50];
        for (const n of TOPIC_THRESHOLDS) {
          const id = `topics_${n}`;
          if (distinct >= n && !unlockedRef.current[id]) {
            unlock(id);
          }
        }
      }

      // NOTE: speed_* and pb_speed achievements are not fully wired yet,
      // because we need real "seconds" passed from the Quiz screen.
      // The signature allows seconds, so we can finish those later by:
      //  - tracking bestSpeedRef
      //  - unlocking speed_120/90/60/45/30 & pb_speed based on "seconds".
    },
    [
      unlock,
      persistQuizCount,
      persistCorrectTotal,
      persistPerfectCount,
      persistPerfectTopics,
      persistScoreSum,
      persistBestScore,
      persistQuizStreak,
      persistQuizLastDay,
      persistTopicLast,
    ]
  );

  const onQuizFinished = useCallback(
    (pct: number, subject: string, seconds?: number) => {
      AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
        type: "quizFinished",
        scorePct: pct,
        subject,
        seconds,
      });
    },
    []
  );

  useEffect(() => {
    if (!hydrated) return;

    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (payload) => {
      if (!payload || payload.type !== "quizFinished") return;
      const pct = Number(payload.scorePct ?? 0);
      const subject = String(payload.subject || "Quiz");
      const seconds = payload.seconds;
      handleQuizFinished(pct, subject, seconds);
    });

    return () => sub.remove();
  }, [hydrated, handleQuizFinished]);

  // ─────────────── DAILY CHECK-IN (generic app streak) ───────────────

  const onDailyCheckIn = useCallback(() => {
    const now = Date.now();
    const todayKey = dayKeyFromTs(now);
    const prevDay = lastDailyDayRef.current;

    if (!prevDay) {
      dailyStreakRef.current = 1;
    } else {
      const diff = daysBetween(prevDay, todayKey);
      if (diff === 0) {
        // already counted today; no change
      } else if (diff === 1) {
        dailyStreakRef.current = (dailyStreakRef.current || 0) + 1;
      } else if (diff > 1) {
        dailyStreakRef.current = 1;
      }
    }

    lastDailyDayRef.current = todayKey;
    persistDailyStreak();
    persistDailyLastDay();

    const streak = dailyStreakRef.current;

    // First ever check-in
    if (!unlockedRef.current["first_check"]) {
      unlock("first_check");
    }

    // Morning / night flavor achievements
    try {
      const hour = new Date(now).getHours();
      if (hour < 9 && !unlockedRef.current["check_morning"]) {
        unlock("check_morning");
      }
      if (hour >= 21 && !unlockedRef.current["check_night"]) {
        unlock("check_night");
      }
    } catch {}

    // Streak_x (1,3,5,7,...)
    for (const n of DAILY_STREAK_THRESHOLDS) {
      const id = `streak_${n}`;
      if (streak >= n && !unlockedRef.current[id]) {
        unlock(id);
      }
    }

    console.log("[Achievements] onDailyCheckIn streak =", streak, "day =", todayKey);
  }, [unlock, persistDailyStreak, persistDailyLastDay]);

  // 🔥 AUTO-RUN DAILY CHECK-IN AFTER HYDRATION
  useEffect(() => {
    if (!hydrated) return;
    onDailyCheckIn();
  }, [hydrated, onDailyCheckIn]);

  // 🔁 ALSO RUN WHEN APP RETURNS TO FOREGROUND
  useEffect(() => {
    if (!hydrated) return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        onDailyCheckIn();
      }
    });

    return () => sub.remove();
  }, [hydrated, onDailyCheckIn]);

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
      onDailyCheckIn,
    }),
    [
      unlocked,
      onQuizFinished,
      onAskQuestion,
      onFlashcardSaved,
      onBrainPairCompleted,
      onRelaxMinutes,
      onDailyCheckIn,
    ]
  );

  return (
    <AchievementsCtx.Provider value={value}>
      {children}
    </AchievementsCtx.Provider>
  );
}
