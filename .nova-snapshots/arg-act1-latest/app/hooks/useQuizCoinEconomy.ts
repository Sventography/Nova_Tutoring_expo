// app/hooks/useQuizCoinEconomy.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../lib/supabase";
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

type RemoteQuizStatus = {
  day_key?: string;
  daily_base_coins_earned?: number;
  daily_actual_coins_earned?: number;
  topic_base_coins_earned?: number;
  topic_actual_coins_earned?: number;
  perfect_claimed?: boolean;
  perfect_base_coins_earned?: number;
  perfect_actual_coins_earned?: number;
  has_aetherwyrm?: boolean;
};

type RemoteQuizAward = RemoteQuizStatus & {
  awarded?: boolean;
  reason?: string;
  base_coins?: number;
  coins_awarded?: number;
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

function firstRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as T;
  }

  return null;
}

function remoteStatusToSnapshot(
  row: RemoteQuizStatus,
  topicId: string
): StoredQuizCoinEconomy {
  const perfectClaimed = !!row.perfect_claimed;

  return {
    version: 1,
    dateKey: String(row.day_key || localDateKey()),
    dailyBaseCoinsEarned: safeNonNegativeInt(row.daily_base_coins_earned),
    dailyActualCoinsEarned: safeNonNegativeInt(row.daily_actual_coins_earned),
    topicBaseCoinsEarned: {
      [topicId]: safeNonNegativeInt(row.topic_base_coins_earned),
    },
    topicActualCoinsEarned: {
      [topicId]: safeNonNegativeInt(row.topic_actual_coins_earned),
    },
    perfectBonusTopicIds: perfectClaimed ? [topicId] : [],
    perfectBaseCoinsEarned: safeNonNegativeInt(row.perfect_base_coins_earned),
    perfectActualCoinsEarned: safeNonNegativeInt(row.perfect_actual_coins_earned),
  };
}

export function useQuizCoinEconomy(topicIdInput: string) {
  const { supabaseUserId } = useUser() as any;
  const { addCoins, refreshCoins } = useCoins();
  const { calculateCoinReward } = useLegendaryCompanions();

  const topicId = normalizeToken(topicIdInput);
  const isSignedIn = !!(supabaseUserId && String(supabaseUserId).trim());

  const ownerToken = isSignedIn
    ? `user:${String(supabaseUserId).trim()}`
    : "guest";

  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}${encodeURIComponent(ownerToken)}`,
    [ownerToken]
  );

  const ownerRef = useRef(ownerToken);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const eventSequenceRef = useRef(0);
  const sessionTokenRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );

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

  const nextEventKey = useCallback(
    (kind: "correct" | "perfect", suffix?: string) => {
      eventSequenceRef.current += 1;
      return [
        "quiz",
        localDateKey(),
        topicId,
        sessionTokenRef.current,
        kind,
        suffix || "event",
        eventSequenceRef.current,
      ].join(":");
    },
    [topicId]
  );

  const loadRemoteStatus = useCallback(async () => {
    const { data, error } = await supabase.rpc("nova_quiz_economy_status", {
      p_topic_id: topicId,
    });

    if (error) {
      throw error;
    }

    const row = firstRpcRow<RemoteQuizStatus>(data);
    if (!row) {
      throw new Error("Nova quiz economy status returned no data.");
    }

    const next = remoteStatusToSnapshot(row, topicId);

    if (ownerRef.current === ownerToken) {
      setSnapshot(next);
      setReady(true);
    }

    return next;
  }, [ownerToken, topicId]);

  useEffect(() => {
    let cancelled = false;

    ownerRef.current = ownerToken;
    setReady(false);

    if (isSignedIn) {
      void loadRemoteStatus().catch((error) => {
        console.warn("[QuizCoinEconomy] server status load failed", error);

        if (!cancelled && ownerRef.current === ownerToken) {
          // Fail closed for signed-in coin awards: do not silently fall back to
          // a resettable local quota when the server is unavailable.
          setSnapshot(emptyState());
          setReady(true);
        }
      });

      return () => {
        cancelled = true;
      };
    }

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
        console.warn("[QuizCoinEconomy] guest load failed", error);

        if (!cancelled && ownerRef.current === ownerToken) {
          setSnapshot(emptyState());
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, loadRemoteStatus, ownerToken, storageKey]);

  const saveGuestSnapshot = useCallback(
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

      if (isSignedIn) {
        const eventKey = nextEventKey(
          "correct",
          `q${safeNonNegativeInt(input.questionIndex)}`
        );

        const { data, error } = await supabase.rpc("nova_claim_quiz_reward", {
          p_topic_id: normalizedTopic,
          p_kind: "correct",
          p_event_key: eventKey,
        });

        if (error) {
          console.warn("[QuizCoinEconomy] server correct award failed", error);
          throw error;
        }

        const row = firstRpcRow<RemoteQuizAward>(data);
        if (!row) {
          throw new Error("Nova quiz reward server returned no data.");
        }

        const next = remoteStatusToSnapshot(row, normalizedTopic);
        if (ownerRef.current === ownerToken) {
          setSnapshot(next);
          setReady(true);
        }

        if (safeNonNegativeInt(row.coins_awarded) > 0) {
          await refreshCoins();
        }

        const rawReason = String(row.reason || "awarded");
        const reason: QuizCoinAwardResult["reason"] =
          rawReason === "daily_limit"
            ? "daily_limit"
            : rawReason === "topic_limit"
            ? "topic_limit"
            : "awarded";

        return {
          awarded: !!row.awarded && safeNonNegativeInt(row.coins_awarded) > 0,
          reason,
          baseCoins: safeNonNegativeInt(row.base_coins),
          coinsAwarded: safeNonNegativeInt(row.coins_awarded),
          dailyActualCoinsEarned: next.dailyActualCoinsEarned,
          dailyActualCoinLimit: effectiveDailyRegularLimit,
          topicActualCoinsEarned: safeNonNegativeInt(
            next.topicActualCoinsEarned[normalizedTopic]
          ),
          topicActualCoinLimit: effectiveTopicRegularLimit,
        };
      }

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

          await saveGuestSnapshot(next);

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
            await saveGuestSnapshot(current);
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
          console.warn("[QuizCoinEconomy] guest correct-answer award failed", error);
          rejectResult(error);
        });

      return resultPromise;
    },
    [
      addCoins,
      calculateCoinReward,
      effectiveDailyRegularLimit,
      effectiveTopicRegularLimit,
      isSignedIn,
      nextEventKey,
      ownerToken,
      refreshCoins,
      saveGuestSnapshot,
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

      if (isSignedIn) {
        const eventKey = nextEventKey("perfect", normalizedTopic);

        const { data, error } = await supabase.rpc("nova_claim_quiz_reward", {
          p_topic_id: normalizedTopic,
          p_kind: "perfect",
          p_event_key: eventKey,
        });

        if (error) {
          console.warn("[QuizCoinEconomy] server perfect bonus failed", error);
          throw error;
        }

        const row = firstRpcRow<RemoteQuizAward>(data);
        if (!row) {
          throw new Error("Nova perfect bonus server returned no data.");
        }

        const next = remoteStatusToSnapshot(row, normalizedTopic);
        if (ownerRef.current === ownerToken) {
          setSnapshot(next);
          setReady(true);
        }

        const coinsAwarded = safeNonNegativeInt(row.coins_awarded);
        if (coinsAwarded > 0) {
          await refreshCoins();
        }

        return {
          awarded: !!row.awarded && coinsAwarded > 0,
          alreadyClaimed:
            String(row.reason || "") === "perfect_claimed" ||
            (!row.awarded && !!row.perfect_claimed),
          baseCoins: safeNonNegativeInt(row.base_coins),
          coinsAwarded,
          topicId: normalizedTopic,
        };
      }

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

          await saveGuestSnapshot(next);

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
            await saveGuestSnapshot(current);
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
          console.warn("[QuizCoinEconomy] guest perfect bonus failed", error);
          rejectResult(error);
        });

      return resultPromise;
    },
    [
      addCoins,
      calculateCoinReward,
      isSignedIn,
      nextEventKey,
      ownerToken,
      refreshCoins,
      saveGuestSnapshot,
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
