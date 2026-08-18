// app/hooks/useQuizCoinEconomy.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";
import { useLegendaryCompanions } from "./useLegendaryCompanions";
import {
  QUIZ_CORRECT_BASE_COINS,
  QUIZ_DAILY_BASE_COIN_LIMIT,
  QUIZ_DAILY_PERFECT_BASE_BONUS,
  QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT,
} from "../_lib/economy";

const STORAGE_PREFIX = "@nova/quiz-coin-economy:v1:";

type StoredQuizCoinEconomy = {
  version: 1;
  dateKey: string;
  dailyBaseCoinsEarned: number;
  dailyActualCoinsEarned: number;
  topicBaseCoinsEarned: Record<string, number>;
  topicActualCoinsEarned: Record<string, number>;
  perfectBonusTopicIds: string[];
  perfectBaseCoinsEarned: number;
  perfectActualCoinsEarned: number;
};

export type QuizCoinAwardResult = {
  awarded: boolean;
  reason: "awarded" | "topic_limit" | "daily_limit";
  baseCoins: number;
  coinsAwarded: number;
  dailyActualCoinsEarned: number;
  dailyActualCoinLimit: number;
  topicActualCoinsEarned: number;
  topicActualCoinLimit: number;
};

export type QuizPerfectBonusAwardResult = {
  awarded: boolean;
  alreadyClaimed: boolean;
  baseCoins: number;
  coinsAwarded: number;
  topicId: string;
};

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeToken(value: unknown): string {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"
  );
}

function safeNonNegativeInt(value: unknown): number {
  const amount = Math.floor(Number(value) || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function emptyState(): StoredQuizCoinEconomy {
  return {
    version: 1,
    dateKey: localDateKey(),
    dailyBaseCoinsEarned: 0,
    dailyActualCoinsEarned: 0,
    topicBaseCoinsEarned: {},
    topicActualCoinsEarned: {},
    perfectBonusTopicIds: [],
    perfectBaseCoinsEarned: 0,
    perfectActualCoinsEarned: 0,
  };
}

function parseStored(raw: string | null): StoredQuizCoinEconomy {
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<StoredQuizCoinEconomy>;

    if (parsed.dateKey !== localDateKey()) {
      return emptyState();
    }

    const topicBaseCoinsEarned: Record<string, number> = {};
    const topicActualCoinsEarned: Record<string, number> = {};

    for (const [key, value] of Object.entries(parsed.topicBaseCoinsEarned || {})) {
      topicBaseCoinsEarned[normalizeToken(key)] = safeNonNegativeInt(value);
    }

    for (const [key, value] of Object.entries(parsed.topicActualCoinsEarned || {})) {
      topicActualCoinsEarned[normalizeToken(key)] = safeNonNegativeInt(value);
    }

    const perfectBonusTopicIds = Array.isArray(parsed.perfectBonusTopicIds)
      ? Array.from(
          new Set(
            parsed.perfectBonusTopicIds.map((value) => normalizeToken(value))
          )
        )
      : [];

    return {
      version: 1,
      dateKey: parsed.dateKey || localDateKey(),
      dailyBaseCoinsEarned: safeNonNegativeInt(parsed.dailyBaseCoinsEarned),
      dailyActualCoinsEarned: safeNonNegativeInt(parsed.dailyActualCoinsEarned),
      topicBaseCoinsEarned,
      topicActualCoinsEarned,
      perfectBonusTopicIds,
      perfectBaseCoinsEarned: safeNonNegativeInt(parsed.perfectBaseCoinsEarned),
      perfectActualCoinsEarned: safeNonNegativeInt(parsed.perfectActualCoinsEarned),
    };
  } catch {
    return emptyState();
  }
}

export function useQuizCoinEconomy(topicIdInput: string) {
  const { supabaseUserId } = useUser() as any;
  const { addCoins } = useCoins();
  const { calculateCoinReward } = useLegendaryCompanions();

  const topicId = normalizeToken(topicIdInput);

  const ownerToken =
    supabaseUserId && String(supabaseUserId).trim()
      ? `user:${String(supabaseUserId).trim()}`
      : "guest";

  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}${encodeURIComponent(ownerToken)}`,
    [ownerToken]
  );

  const ownerRef = useRef(ownerToken);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<StoredQuizCoinEconomy>(emptyState());

  const oneCorrectReward = useMemo(
    () => calculateCoinReward(QUIZ_CORRECT_BASE_COINS, "quiz_correct"),
    [calculateCoinReward]
  );

  const effectiveDailyRegularLimit = useMemo(() => {
    const fullAwards = Math.floor(
      QUIZ_DAILY_BASE_COIN_LIMIT / QUIZ_CORRECT_BASE_COINS
    );

    return fullAwards * oneCorrectReward.totalCoins;
  }, [oneCorrectReward.totalCoins]);

  const effectiveTopicRegularLimit = useMemo(() => {
    const fullAwards = Math.floor(
      QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT / QUIZ_CORRECT_BASE_COINS
    );

    return fullAwards * oneCorrectReward.totalCoins;
  }, [oneCorrectReward.totalCoins]);

  const perfectBonusPreview = useMemo(
    () => calculateCoinReward(QUIZ_DAILY_PERFECT_BASE_BONUS, "standard"),
    [calculateCoinReward]
  );

  useEffect(() => {
    let cancelled = false;

    ownerRef.current = ownerToken;
    setReady(false);

    void AsyncStorage.getItem(storageKey)
      .then((raw) => parseStored(raw))
      .then(async (next) => {
        if (next.dateKey !== localDateKey()) {
          next = emptyState();
          await AsyncStorage.setItem(storageKey, JSON.stringify(next));
        }

        if (!cancelled && ownerRef.current === ownerToken) {
          setSnapshot(next);
          setReady(true);
        }
      })
      .catch((error) => {
        console.warn("[QuizCoinEconomy] load failed", error);

        if (!cancelled && ownerRef.current === ownerToken) {
          setSnapshot(emptyState());
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ownerToken, storageKey]);

  const saveSnapshot = useCallback(
    async (next: StoredQuizCoinEconomy) => {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));

      if (ownerRef.current === ownerToken) {
        setSnapshot(next);
        setReady(true);
      }
    },
    [ownerToken, storageKey]
  );

  const awardCorrectAnswer = useCallback(
    async (input: {
      topicId?: string;
      questionIndex?: number;
      question?: string;
    }): Promise<QuizCoinAwardResult> => {
      const normalizedTopic = normalizeToken(input.topicId || topicId);

      let resolveResult!: (value: QuizCoinAwardResult) => void;
      let rejectResult!: (reason?: any) => void;

      const resultPromise = new Promise<QuizCoinAwardResult>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });

      mutationQueueRef.current = mutationQueueRef.current
        .then(async () => {
          const raw = await AsyncStorage.getItem(storageKey);
          const current = parseStored(raw);

          const currentTopicBase = safeNonNegativeInt(
            current.topicBaseCoinsEarned[normalizedTopic]
          );
          const currentTopicActual = safeNonNegativeInt(
            current.topicActualCoinsEarned[normalizedTopic]
          );

          const dailyBaseRemaining = Math.max(
            0,
            QUIZ_DAILY_BASE_COIN_LIMIT - current.dailyBaseCoinsEarned
          );
          const topicBaseRemaining = Math.max(
            0,
            QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT - currentTopicBase
          );

          if (dailyBaseRemaining <= 0 || topicBaseRemaining <= 0) {
            const reason =
              dailyBaseRemaining <= 0 ? "daily_limit" : "topic_limit";

            if (ownerRef.current === ownerToken) {
              setSnapshot(current);
              setReady(true);
            }

            resolveResult({
              awarded: false,
              reason,
              baseCoins: 0,
              coinsAwarded: 0,
              dailyActualCoinsEarned: current.dailyActualCoinsEarned,
              dailyActualCoinLimit: effectiveDailyRegularLimit,
              topicActualCoinsEarned: currentTopicActual,
              topicActualCoinLimit: effectiveTopicRegularLimit,
            });
            return;
          }

          const baseCoins = Math.min(
            QUIZ_CORRECT_BASE_COINS,
            dailyBaseRemaining,
            topicBaseRemaining
          );

          const reward = calculateCoinReward(baseCoins, "quiz_correct");

          const next: StoredQuizCoinEconomy = {
            ...current,
            dateKey: localDateKey(),
            dailyBaseCoinsEarned: current.dailyBaseCoinsEarned + baseCoins,
            dailyActualCoinsEarned:
              current.dailyActualCoinsEarned + reward.totalCoins,
            topicBaseCoinsEarned: {
              ...current.topicBaseCoinsEarned,
              [normalizedTopic]: currentTopicBase + baseCoins,
            },
            topicActualCoinsEarned: {
              ...current.topicActualCoinsEarned,
              [normalizedTopic]: currentTopicActual + reward.totalCoins,
            },
          };

          // Reserve quota first. If the wallet write fails, roll this reservation back.
          await saveSnapshot(next);

          try {
            await addCoins(reward.totalCoins, "quiz_correct", {
              topicId: normalizedTopic,
              questionIndex: input.questionIndex,
              question: input.question,
              baseCoins: reward.baseCoins,
              specialistBonus: reward.specialistBonus,
              aetherwyrmBonus: reward.aetherwyrmBonus,
              awardedCoins: reward.totalCoins,
              appliedCompanions: reward.appliedCompanions,
              dailyBaseCoinsEarned: next.dailyBaseCoinsEarned,
              dailyBaseCoinLimit: QUIZ_DAILY_BASE_COIN_LIMIT,
              topicBaseCoinsEarned: next.topicBaseCoinsEarned[normalizedTopic],
              topicBaseCoinLimit: QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT,
            });
          } catch (error) {
            await saveSnapshot(current);
            throw error;
          }

          resolveResult({
            awarded: true,
            reason: "awarded",
            baseCoins,
            coinsAwarded: reward.totalCoins,
            dailyActualCoinsEarned: next.dailyActualCoinsEarned,
            dailyActualCoinLimit: effectiveDailyRegularLimit,
            topicActualCoinsEarned: next.topicActualCoinsEarned[normalizedTopic],
            topicActualCoinLimit: effectiveTopicRegularLimit,
          });
        })
        .catch((error) => {
          console.warn("[QuizCoinEconomy] correct-answer award failed", error);
          rejectResult(error);
        });

      return resultPromise;
    },
    [
      addCoins,
      calculateCoinReward,
      effectiveDailyRegularLimit,
      effectiveTopicRegularLimit,
      ownerToken,
      saveSnapshot,
      storageKey,
      topicId,
    ]
  );

  const awardPerfectBonus = useCallback(
    async (input: {
      topicId?: string;
      title?: string;
    }): Promise<QuizPerfectBonusAwardResult> => {
      const normalizedTopic = normalizeToken(input.topicId || topicId);

      let resolveResult!: (value: QuizPerfectBonusAwardResult) => void;
      let rejectResult!: (reason?: any) => void;

      const resultPromise = new Promise<QuizPerfectBonusAwardResult>(
        (resolve, reject) => {
          resolveResult = resolve;
          rejectResult = reject;
        }
      );

      mutationQueueRef.current = mutationQueueRef.current
        .then(async () => {
          const raw = await AsyncStorage.getItem(storageKey);
          const current = parseStored(raw);

          if (current.perfectBonusTopicIds.includes(normalizedTopic)) {
            if (ownerRef.current === ownerToken) {
              setSnapshot(current);
              setReady(true);
            }

            resolveResult({
              awarded: false,
              alreadyClaimed: true,
              baseCoins: QUIZ_DAILY_PERFECT_BASE_BONUS,
              coinsAwarded: 0,
              topicId: normalizedTopic,
            });
            return;
          }

          const reward = calculateCoinReward(
            QUIZ_DAILY_PERFECT_BASE_BONUS,
            "standard"
          );

          const next: StoredQuizCoinEconomy = {
            ...current,
            perfectBonusTopicIds: Array.from(
              new Set([...current.perfectBonusTopicIds, normalizedTopic])
            ),
            perfectBaseCoinsEarned:
              current.perfectBaseCoinsEarned + QUIZ_DAILY_PERFECT_BASE_BONUS,
            perfectActualCoinsEarned:
              current.perfectActualCoinsEarned + reward.totalCoins,
          };

          await saveSnapshot(next);

          try {
            await addCoins(reward.totalCoins, "quiz_daily_perfect_bonus", {
              topicId: normalizedTopic,
              title: input.title,
              baseCoins: reward.baseCoins,
              specialistBonus: reward.specialistBonus,
              aetherwyrmBonus: reward.aetherwyrmBonus,
              awardedCoins: reward.totalCoins,
              appliedCompanions: reward.appliedCompanions,
              oncePerTopicPerDay: true,
            });
          } catch (error) {
            await saveSnapshot(current);
            throw error;
          }

          resolveResult({
            awarded: true,
            alreadyClaimed: false,
            baseCoins: QUIZ_DAILY_PERFECT_BASE_BONUS,
            coinsAwarded: reward.totalCoins,
            topicId: normalizedTopic,
          });
        })
        .catch((error) => {
          console.warn("[QuizCoinEconomy] perfect bonus failed", error);
          rejectResult(error);
        });

      return resultPromise;
    },
    [
      addCoins,
      calculateCoinReward,
      ownerToken,
      saveSnapshot,
      storageKey,
      topicId,
    ]
  );

  const currentTopicActualCoinsEarned = safeNonNegativeInt(
    snapshot.topicActualCoinsEarned[topicId]
  );

  const currentTopicBaseCoinsEarned = safeNonNegativeInt(
    snapshot.topicBaseCoinsEarned[topicId]
  );

  const dailyRegularRemaining = Math.max(
    0,
    effectiveDailyRegularLimit - snapshot.dailyActualCoinsEarned
  );

  const topicRegularRemaining = Math.max(
    0,
    effectiveTopicRegularLimit - currentTopicActualCoinsEarned
  );

  const dailyProgress =
    effectiveDailyRegularLimit > 0
      ? Math.max(
          0,
          Math.min(
            1,
            snapshot.dailyActualCoinsEarned / effectiveDailyRegularLimit
          )
        )
      : 0;

  const topicProgress =
    effectiveTopicRegularLimit > 0
      ? Math.max(
          0,
          Math.min(
            1,
            currentTopicActualCoinsEarned / effectiveTopicRegularLimit
          )
        )
      : 0;

  return {
    ready,

    dailyActualCoinsEarned: snapshot.dailyActualCoinsEarned,
    dailyActualCoinLimit: effectiveDailyRegularLimit,
    dailyRegularRemaining,
    dailyProgress,

    currentTopicBaseCoinsEarned,
    currentTopicActualCoinsEarned,
    currentTopicActualCoinLimit: effectiveTopicRegularLimit,
    topicRegularRemaining,
    topicProgress,

    perfectBonusClaimedForTopic:
      snapshot.perfectBonusTopicIds.includes(topicId),
    perfectBonusActualCoinsEarnedToday:
      snapshot.perfectActualCoinsEarned,
    perfectBonusPreviewCoins: perfectBonusPreview.totalCoins,

    dailyBaseCoinLimit: QUIZ_DAILY_BASE_COIN_LIMIT,
    topicBaseCoinLimit: QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT,

    awardCorrectAnswer,
    awardPerfectBonus,
  };
}
