import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";

type StoredStudyProgress = {
  totalXp: number;
  dateKey: string;
  fullRewardTopicIds: string[];
};

export type StudyQuizAward = {
  xpAwarded: number;
  fullReward: boolean;
  totalXp: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

type StudyProgressContextValue = {
  ready: boolean;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
  awardQuizStudyXp: (input: {
    topicId: string;
    scorePercent: number;
  }) => Promise<StudyQuizAward>;
};

const StudyProgressContext =
  createContext<StudyProgressContextValue | undefined>(
    undefined
  );

const STORAGE_PREFIX = "@nova/study-progress:v1:";

function localDateKey(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeTopicId(value: unknown): string {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"
  );
}

function scoreBonus(percent: number): number {
  const pct = Math.max(
    0,
    Math.min(100, Math.round(Number(percent) || 0))
  );

  if (pct === 100) return 25;
  if (pct >= 90) return 15;
  if (pct >= 80) return 10;
  if (pct >= 70) return 5;

  return 0;
}

function xpRequiredForLevel(level: number): number {
  return 100 + 25 * Math.max(0, level - 1);
}

function getLevelState(totalXpValue: number) {
  const totalXp = Math.max(
    0,
    Math.trunc(Number(totalXpValue) || 0)
  );

  let level = 1;
  let remaining = totalXp;
  let needed = xpRequiredForLevel(level);

  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpRequiredForLevel(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: needed,
  };
}

function emptyProgress(): StoredStudyProgress {
  return {
    totalXp: 0,
    dateKey: localDateKey(),
    fullRewardTopicIds: [],
  };
}

function parseStoredProgress(
  raw: string | null
): StoredStudyProgress {
  if (!raw) return emptyProgress();

  try {
    const parsed = JSON.parse(raw);

    const totalXp = Math.max(
      0,
      Math.trunc(Number(parsed?.totalXp) || 0)
    );

    const storedDate =
      typeof parsed?.dateKey === "string"
        ? parsed.dateKey
        : localDateKey();

    const topics = Array.isArray(
      parsed?.fullRewardTopicIds
    )
      ? parsed.fullRewardTopicIds
          .map((value: unknown) =>
            normalizeTopicId(value)
          )
          .filter(Boolean)
      : [];

    if (storedDate !== localDateKey()) {
      return {
        totalXp,
        dateKey: localDateKey(),
        fullRewardTopicIds: [],
      };
    }

    return {
      totalXp,
      dateKey: storedDate,
      fullRewardTopicIds: Array.from(
        new Set(topics)
      ),
    };
  } catch {
    return emptyProgress();
  }
}

export function StudyProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { supabaseUserId } = useUser();

  const ownerToken =
    supabaseUserId && String(supabaseUserId).trim()
      ? `user:${String(supabaseUserId).trim()}`
      : "guest";

  const storageKey = useMemo(
    () =>
      `${STORAGE_PREFIX}${encodeURIComponent(
        ownerToken
      )}`,
    [ownerToken]
  );

  const ownerRef = useRef(ownerToken);

  const mutationQueueRef = useRef<Promise<void>>(
    Promise.resolve()
  );

  const [ready, setReady] = useState(false);

  const [snapshot, setSnapshot] =
    useState<StoredStudyProgress>(
      emptyProgress()
    );

  useEffect(() => {
    let cancelled = false;

    ownerRef.current = ownerToken;
    setReady(false);
    setSnapshot(emptyProgress());

    const load = async () => {
      try {
        const raw =
          await AsyncStorage.getItem(storageKey);

        const parsed =
          parseStoredProgress(raw);

        if (
          parsed.dateKey !== localDateKey()
        ) {
          parsed.dateKey = localDateKey();
          parsed.fullRewardTopicIds = [];
        }

        if (
          !cancelled &&
          ownerRef.current === ownerToken
        ) {
          setSnapshot(parsed);
          setReady(true);
        }
      } catch (error) {
        console.warn(
          "[StudyProgress] load failed",
          error
        );

        if (
          !cancelled &&
          ownerRef.current === ownerToken
        ) {
          setSnapshot(emptyProgress());
          setReady(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [ownerToken, storageKey]);

  const awardQuizStudyXp = useCallback(
    async ({
      topicId,
      scorePercent,
    }: {
      topicId: string;
      scorePercent: number;
    }): Promise<StudyQuizAward> => {
      const resultPromise =
        mutationQueueRef.current.then(
          async (): Promise<StudyQuizAward> => {
            const raw =
              await AsyncStorage.getItem(
                storageKey
              );

            const current =
              parseStoredProgress(raw);

            const today = localDateKey();

            const priorTopics =
              current.dateKey === today
                ? current.fullRewardTopicIds
                : [];

            const normalizedTopic =
              normalizeTopicId(topicId);

            const alreadyReceivedFullReward =
              priorTopics.includes(
                normalizedTopic
              );

            const fullReward =
              !alreadyReceivedFullReward;

            const xpAwarded = fullReward
              ? 20 +
                scoreBonus(scorePercent)
              : 5;

            const before =
              getLevelState(
                current.totalXp
              );

            const nextTotalXp =
              current.totalXp + xpAwarded;

            const after =
              getLevelState(nextTotalXp);

            const nextTopics = fullReward
              ? Array.from(
                  new Set([
                    ...priorTopics,
                    normalizedTopic,
                  ])
                )
              : priorTopics;

            const next: StoredStudyProgress =
              {
                totalXp: nextTotalXp,
                dateKey: today,
                fullRewardTopicIds:
                  nextTopics,
              };

            await AsyncStorage.setItem(
              storageKey,
              JSON.stringify(next)
            );

            if (
              ownerRef.current === ownerToken
            ) {
              setSnapshot(next);
              setReady(true);
            }

            return {
              xpAwarded,
              fullReward,
              totalXp: nextTotalXp,
              levelBefore: before.level,
              levelAfter: after.level,
              leveledUp:
                after.level >
                before.level,
              xpIntoLevel:
                after.xpIntoLevel,
              xpForNextLevel:
                after.xpForNextLevel,
            };
          }
        );

      mutationQueueRef.current =
        resultPromise.then(
          () => undefined,
          () => undefined
        );

      return resultPromise;
    },
    [ownerToken, storageKey]
  );

  const levelState = useMemo(
    () =>
      getLevelState(snapshot.totalXp),
    [snapshot.totalXp]
  );

  const progress =
    levelState.xpForNextLevel > 0
      ? Math.max(
          0,
          Math.min(
            1,
            levelState.xpIntoLevel /
              levelState.xpForNextLevel
          )
        )
      : 0;

  const value: StudyProgressContextValue = {
    ready,
    totalXp: snapshot.totalXp,
    level: levelState.level,
    xpIntoLevel:
      levelState.xpIntoLevel,
    xpForNextLevel:
      levelState.xpForNextLevel,
    progress,
    awardQuizStudyXp,
  };

  return (
    <StudyProgressContext.Provider
      value={value}
    >
      {children}
    </StudyProgressContext.Provider>
  );
}

export function useStudyProgress() {
  const ctx = useContext(
    StudyProgressContext
  );

  if (!ctx) {
    throw new Error(
      "useStudyProgress must be used within StudyProgressProvider"
    );
  }

  return ctx;
}
