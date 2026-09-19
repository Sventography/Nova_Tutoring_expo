// app/context/DailyQuestsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  DeviceEventEmitter,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCoins } from "./CoinsContext";
import { useUser } from "./UserContext";
import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";
import {
  DAILY_QUEST_PROGRESS_EVENT,
  type DailyQuestProgressEvent,
} from "../_lib/dailyQuestEvents";

export type DailyQuestId =
  | "complete_quiz"
  | "quiz_correct_10"
  | "quiz_score_80";

type QuestDefinition = {
  id: DailyQuestId;
  title: string;
  description: string;
  target: number;
  baseRewardCoins: number;
};

export type DailyQuestView = QuestDefinition & {
  progress: number;
  complete: boolean;
  claimed: boolean;
  rewardCoins: number;
};

type StoredState = {
  dateKey: string;
  progress: Record<DailyQuestId, number>;
  claimed: Record<DailyQuestId, boolean>;
  bonusClaimed: boolean;
};

type DailyQuestsContextValue = {
  ready: boolean;
  dateKey: string;
  quests: DailyQuestView[];
  completedCount: number;
  claimableCount: number;
  allComplete: boolean;
  bonusClaimed: boolean;
  bonusRewardCoins: number;
  claimQuest: (
    id: DailyQuestId
  ) => Promise<number>;
  claimBonus: () => Promise<number>;
};

const STORAGE_PREFIX =
  "@nova/dailyQuests.v1:";

const QUIZ_COMPLETION_VARIANTS:
  QuestDefinition[] = [
    {
      id: "complete_quiz",
      title: "Finish a Quiz",
      description:
        "Complete all questions in any quiz.",
      target: 1,
      baseRewardCoins: 15,
    },
    {
      id: "complete_quiz",
      title: "Finish 2 Quizzes",
      description:
        "Complete two full quizzes today.",
      target: 2,
      baseRewardCoins: 20,
    },
  ];

const CORRECT_ANSWER_VARIANTS:
  QuestDefinition[] = [
    {
      id: "quiz_correct_10",
      title: "5 Correct Answers",
      description:
        "Answer 5 quiz questions correctly today.",
      target: 5,
      baseRewardCoins: 20,
    },
    {
      id: "quiz_correct_10",
      title: "10 Correct Answers",
      description:
        "Answer 10 quiz questions correctly today.",
      target: 10,
      baseRewardCoins: 25,
    },
    {
      id: "quiz_correct_10",
      title: "15 Correct Answers",
      description:
        "Answer 15 quiz questions correctly today.",
      target: 15,
      baseRewardCoins: 30,
    },
  ];

const SCORE_80_VARIANTS:
  QuestDefinition[] = [
    {
      id: "quiz_score_80",
      title: "Score 80%+",
      description:
        "Finish a quiz with a score of at least 80%.",
      target: 1,
      baseRewardCoins: 20,
    },
    {
      id: "quiz_score_80",
      title: "Two Strong Quizzes",
      description:
        "Score at least 80% on two quizzes today.",
      target: 2,
      baseRewardCoins: 25,
    },
  ];

const BONUS_BASE_COINS = 40;

function dayNumberFromKey(
  value: string
): number {
  const [
    y,
    m,
    d,
  ] = value
    .split("-")
    .map(Number);

  return Math.floor(
    Date.UTC(
      y,
      m - 1,
      d
    ) /
      86_400_000
  );
}

function getDailyQuestDefinitions(
  value: string
): QuestDefinition[] {
  const day =
    dayNumberFromKey(
      value
    );

  return [
    QUIZ_COMPLETION_VARIANTS[
      Math.abs(day) %
        QUIZ_COMPLETION_VARIANTS.length
    ],
    CORRECT_ANSWER_VARIANTS[
      Math.abs(day) %
        CORRECT_ANSWER_VARIANTS.length
    ],
    SCORE_80_VARIANTS[
      Math.abs(
        Math.floor(
          day / 2
        )
      ) %
        SCORE_80_VARIANTS.length
    ],
  ];
}

const DailyQuestsContext =
  createContext<
    DailyQuestsContextValue | null
  >(null);

function localDateKey(
  date = new Date()
): string {
  const y = date.getFullYear();
  const m = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const d = String(
    date.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function blankProgress():
  Record<DailyQuestId, number> {
  return {
    complete_quiz: 0,
    quiz_correct_10: 0,
    quiz_score_80: 0,
  };
}

function blankClaimed():
  Record<DailyQuestId, boolean> {
  return {
    complete_quiz: false,
    quiz_correct_10: false,
    quiz_score_80: false,
  };
}

function blankState(
  dateKey: string
): StoredState {
  return {
    dateKey,
    progress: blankProgress(),
    claimed: blankClaimed(),
    bonusClaimed: false,
  };
}

function normalizeState(
  raw: any,
  dateKey: string
): StoredState {
  if (
    !raw ||
    raw.dateKey !== dateKey
  ) {
    return blankState(dateKey);
  }

  return {
    dateKey,
    progress: {
      complete_quiz: Math.max(
        0,
        Number(
          raw?.progress?.complete_quiz ||
            0
        )
      ),
      quiz_correct_10: Math.max(
        0,
        Number(
          raw?.progress?.quiz_correct_10 ||
            0
        )
      ),
      quiz_score_80: Math.max(
        0,
        Number(
          raw?.progress?.quiz_score_80 ||
            0
        )
      ),
    },
    claimed: {
      complete_quiz:
        raw?.claimed?.complete_quiz ===
        true,
      quiz_correct_10:
        raw?.claimed?.quiz_correct_10 ===
        true,
      quiz_score_80:
        raw?.claimed?.quiz_score_80 ===
        true,
    },
    bonusClaimed:
      raw?.bonusClaimed === true,
  };
}

function storageKey(
  owner: string,
  dateKey: string
) {
  return `${STORAGE_PREFIX}${owner}:${dateKey}`;
}

export function DailyQuestsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    supabaseUserId,
  } = useUser();
  const {
    addCoins,
  } = useCoins();
  const {
    calculateCoinReward,
  } = useLegendaryCompanions();

  const owner =
    supabaseUserId || "guest";

  const [
    dateKey,
    setDateKey,
  ] = useState(
    () => localDateKey()
  );

  const [
    state,
    setState,
  ] = useState<StoredState>(
    () => blankState(
      localDateKey()
    )
  );

  const [
    ready,
    setReady,
  ] = useState(false);

  const questDefinitions =
    useMemo(
      () =>
        getDailyQuestDefinitions(
          dateKey
        ),
      [
        dateKey,
      ]
    );

  const stateRef =
    useRef(state);
  const claimLocks =
    useRef<Set<string>>(
      new Set()
    );

  useEffect(() => {
    stateRef.current =
      state;
  }, [state]);

  useEffect(() => {
    let timer:
      | ReturnType<typeof setInterval>
      | null = null;

    const syncDate = () => {
      const today =
        localDateKey();

      setDateKey((current) =>
        current === today
          ? current
          : today
      );
    };

    /*
     * Check periodically while Nova is open.
     * This catches midnight even during a long foreground session.
     */
    syncDate();

    timer = setInterval(
      syncDate,
      60 * 1000
    );

    /*
     * iOS can suspend timers while the app is backgrounded.
     * Re-check immediately whenever Nova becomes active again.
     */
    const appStateSub =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "active") {
            syncDate();
          }
        }
      );

    return () => {
      if (timer) {
        clearInterval(timer);
      }

      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setReady(false);

      try {
        const raw =
          await AsyncStorage.getItem(
            storageKey(
              owner,
              dateKey
            )
          );

        const next =
          raw
            ? normalizeState(
                JSON.parse(raw),
                dateKey
              )
            : blankState(
                dateKey
              );

        if (!cancelled) {
          stateRef.current =
            next;
          setState(next);
          setReady(true);
        }
      } catch (error) {
        console.warn(
          "[DailyQuests] load failed",
          error
        );

        if (!cancelled) {
          const next =
            blankState(
              dateKey
            );
          stateRef.current =
            next;
          setState(next);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    owner,
    dateKey,
  ]);

  useEffect(() => {
    if (!ready) return;

    AsyncStorage.setItem(
      storageKey(
        owner,
        dateKey
      ),
      JSON.stringify(state)
    ).catch((error) => {
      console.warn(
        "[DailyQuests] save failed",
        error
      );
    });
  }, [
    state,
    ready,
    owner,
    dateKey,
  ]);

  useEffect(() => {
    const sub =
      DeviceEventEmitter.addListener(
        DAILY_QUEST_PROGRESS_EVENT,
        (
          event:
            DailyQuestProgressEvent
        ) => {
          if (!ready) {
            return;
          }

          const amount =
            Math.max(
              1,
              Math.trunc(
                Number(
                  event?.amount || 1
                )
              )
            );

          setState((previous) => {
            if (
              previous.dateKey !==
              dateKey
            ) {
              return previous;
            }

            const progress = {
              ...previous.progress,
            };

            const advanceQuest =
              (
                id:
                  DailyQuestId
              ) => {
                const definition =
                  questDefinitions.find(
                    (quest) =>
                      quest.id ===
                      id
                  );

                const target =
                  definition?.target ||
                  1;

                progress[id] =
                  Math.min(
                    target,
                    (
                      progress[id] ||
                      0
                    ) +
                      amount
                  );
              };

            if (
              event.type ===
              "quiz_correct"
            ) {
              advanceQuest(
                "quiz_correct_10"
              );
            } else if (
              event.type ===
              "quiz_completed"
            ) {
              advanceQuest(
                "complete_quiz"
              );
            } else if (
              event.type ===
              "quiz_score_80"
            ) {
              advanceQuest(
                "quiz_score_80"
              );
            }

            return {
              ...previous,
              progress,
            };
          });
        }
      );

    return () =>
      sub.remove();
  }, [
    ready,
    dateKey,
    questDefinitions,
  ]);

  const rewardFor = useCallback(
    (
      baseCoins: number
    ) =>
      calculateCoinReward(
        baseCoins,
        "standard"
      ).totalCoins,
    [
      calculateCoinReward,
    ]
  );

  const quests =
    useMemo<DailyQuestView[]>(
      () =>
        questDefinitions.map(
          (quest) => {
            const progress =
              Math.min(
                quest.target,
                state.progress[
                  quest.id
                ] || 0
              );

            return {
              ...quest,
              progress,
              complete:
                progress >=
                quest.target,
              claimed:
                state.claimed[
                  quest.id
                ] === true,
              rewardCoins:
                rewardFor(
                  quest.baseRewardCoins
                ),
            };
          }
        ),
      [
        state,
        rewardFor,
        questDefinitions,
      ]
    );

  const completedCount =
    quests.filter(
      (quest) =>
        quest.complete
    ).length;

  const claimableCount =
    quests.filter(
      (quest) =>
        quest.complete &&
        !quest.claimed
    ).length;

  const allComplete =
    completedCount ===
    questDefinitions.length;

  const bonusRewardCoins =
    rewardFor(
      BONUS_BASE_COINS
    );

  const persistStateNow =
    useCallback(
      async (
        next: StoredState
      ) => {
        stateRef.current =
          next;
        setState(next);

        await AsyncStorage.setItem(
          storageKey(
            owner,
            dateKey
          ),
          JSON.stringify(next)
        );
      },
      [
        owner,
        dateKey,
      ]
    );

  const claimQuest =
    useCallback(
      async (
        id: DailyQuestId
      ): Promise<number> => {
        const lockKey =
          `quest:${id}`;

        if (
          claimLocks.current.has(
            lockKey
          )
        ) {
          return 0;
        }

        const definition =
          questDefinitions.find(
            (quest) =>
              quest.id === id
          );

        if (!definition) {
          return 0;
        }

        const current =
          stateRef.current;

        const progress =
          current.progress[id] ||
          0;

        if (
          progress <
            definition.target ||
          current.claimed[id]
        ) {
          return 0;
        }

        claimLocks.current.add(
          lockKey
        );

        const reward =
          rewardFor(
            definition.baseRewardCoins
          );

        const next: StoredState = {
          ...current,
          claimed: {
            ...current.claimed,
            [id]: true,
          },
        };

        try {
          /*
           * Persist claim state first.
           * This avoids a rapid restart
           * granting the same quest twice.
           */
          await persistStateNow(
            next
          );

          await addCoins(
            reward,
            "daily_quest",
            {
              questId: id,
              dateKey,
              baseCoins:
                definition.baseRewardCoins,
              totalCoins:
                reward,
            }
          );

          return reward;
        } catch (error) {
          console.warn(
            "[DailyQuests] claim failed",
            error
          );

          await persistStateNow(
            current
          ).catch(() => {});

          throw error;
        } finally {
          claimLocks.current.delete(
            lockKey
          );
        }
      },
      [
        addCoins,
        dateKey,
        persistStateNow,
        rewardFor,
        questDefinitions,
      ]
    );

  const claimBonus =
    useCallback(
      async (): Promise<number> => {
        const lockKey =
          "bonus";

        if (
          claimLocks.current.has(
            lockKey
          )
        ) {
          return 0;
        }

        const current =
          stateRef.current;

        const complete =
          questDefinitions.every(
            (quest) =>
              (
                current.progress[
                  quest.id
                ] || 0
              ) >= quest.target
          );

        if (
          !complete ||
          current.bonusClaimed
        ) {
          return 0;
        }

        claimLocks.current.add(
          lockKey
        );

        const reward =
          rewardFor(
            BONUS_BASE_COINS
          );

        const next = {
          ...current,
          bonusClaimed: true,
        };

        try {
          await persistStateNow(
            next
          );

          await addCoins(
            reward,
            "daily_quest_bonus",
            {
              dateKey,
              baseCoins:
                BONUS_BASE_COINS,
              totalCoins:
                reward,
            }
          );

          return reward;
        } catch (error) {
          console.warn(
            "[DailyQuests] bonus claim failed",
            error
          );

          await persistStateNow(
            current
          ).catch(() => {});

          throw error;
        } finally {
          claimLocks.current.delete(
            lockKey
          );
        }
      },
      [
        addCoins,
        dateKey,
        persistStateNow,
        rewardFor,
        questDefinitions,
      ]
    );

  return (
    <DailyQuestsContext.Provider
      value={{
        ready,
        dateKey,
        quests,
        completedCount,
        claimableCount,
        allComplete,
        bonusClaimed:
          state.bonusClaimed,
        bonusRewardCoins,
        claimQuest,
        claimBonus,
      }}
    >
      {children}
    </DailyQuestsContext.Provider>
  );
}

export function useDailyQuests() {
  const value =
    useContext(
      DailyQuestsContext
    );

  if (!value) {
    throw new Error(
      "useDailyQuests must be used inside DailyQuestsProvider"
    );
  }

  return value;
}

export default DailyQuestsProvider;
