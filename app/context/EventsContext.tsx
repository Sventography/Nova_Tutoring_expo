// app/context/EventsContext.tsx
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

import {
  getEventForDate,
  getUpcomingEvent,
  type NovaEventDefinition,
  type NovaEventReward,
} from "../_lib/novaEvents";
import {
  DAILY_QUEST_PROGRESS_EVENT,
  type DailyQuestProgressEvent,
} from "../_lib/dailyQuestEvents";
import { useCoins } from "./CoinsContext";
import { useUser } from "./UserContext";
import { usePurchases } from "./PurchasesContext";
import {
  useLegendaryCompanions,
} from "../hooks/useLegendaryCompanions";

type StoredEventState = {
  eventId: string;
  points: number;
  claimedFreeRewardIds: string[];
  claimedPremiumRewardIds: string[];
};

type EventsContextValue = {
  ready: boolean;
  dateKey: string;
  activeEvent:
    | NovaEventDefinition
    | null;
  upcomingEvent:
    | NovaEventDefinition
    | null;
  points: number;
  maxPoints: number;
  progress: number;
  eventDay: number;
  daysRemaining: number;
  claimedFreeRewardIds: string[];
  claimedPremiumRewardIds: string[];
  premiumPassOwned: boolean;
  unclaimedRewardCount: number;
  rewardCoinsFor: (
    baseCoins: number
  ) => number;
  claimFreeReward: (
    rewardId: string
  ) => Promise<number>;
  claimPremiumReward: (
    rewardId: string
  ) => Promise<number>;
};

const STORAGE_PREFIX =
  "@nova/events.v1:";

const EventsContext =
  createContext<
    EventsContextValue | null
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

function dayNumber(
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

function blankState(
  eventId = ""
): StoredEventState {
  return {
    eventId,
    points: 0,
    claimedFreeRewardIds: [],
    claimedPremiumRewardIds: [],
  };
}

function normalizeState(
  raw: any,
  eventId: string
): StoredEventState {
  if (
    !raw ||
    raw.eventId !== eventId
  ) {
    return blankState(eventId);
  }

  const freeClaims =
    Array.isArray(
      raw.claimedFreeRewardIds
    )
      ? raw.claimedFreeRewardIds
          .filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
                "string" &&
              value.length > 0
          )
      : [];

  const premiumClaims =
    Array.isArray(
      raw.claimedPremiumRewardIds
    )
      ? raw.claimedPremiumRewardIds
          .filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
                "string" &&
              value.length > 0
          )
      : [];

  return {
    eventId,
    points: Math.max(
      0,
      Math.trunc(
        Number(
          raw.points || 0
        )
      )
    ),
    claimedFreeRewardIds:
      Array.from(
        new Set(
          freeClaims
        )
      ),
    claimedPremiumRewardIds:
      Array.from(
        new Set(
          premiumClaims
        )
      ),
  };
}

function storageKey(
  owner: string,
  eventId: string
) {
  return `${STORAGE_PREFIX}${owner}:${eventId}`;
}

function eventPointsFor(
  event:
    DailyQuestProgressEvent
): number {
  if (
    event.type ===
    "quiz_correct"
  ) {
    return Math.max(
      1,
      Math.trunc(
        Number(
          event.amount || 1
        )
      )
    );
  }

  if (
    event.type ===
    "quiz_completed"
  ) {
    return 15;
  }

  if (
    event.type ===
    "quiz_score_80"
  ) {
    return 10;
  }

  return 0;
}

export function EventsProvider({
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
    isOwned,
  } = usePurchases();
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

  const activeEvent =
    useMemo(
      () =>
        getEventForDate(
          dateKey
        ),
      [
        dateKey,
      ]
    );

  const upcomingEvent =
    useMemo(
      () =>
        getUpcomingEvent(
          dateKey
        ),
      [
        dateKey,
      ]
    );

  const [
    state,
    setState,
  ] = useState<
    StoredEventState
  >(
    () =>
      blankState(
        activeEvent?.id
      )
  );

  const [
    ready,
    setReady,
  ] = useState(false);

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
    const syncDate = () => {
      const today =
        localDateKey();

      setDateKey(
        (current) =>
          current === today
            ? current
            : today
      );
    };

    syncDate();

    const timer =
      setInterval(
        syncDate,
        60 * 1000
      );

    const sub =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (
            nextState ===
            "active"
          ) {
            syncDate();
          }
        }
      );

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled =
      false;

    const eventId =
      activeEvent?.id || "";

    if (!eventId) {
      const next =
        blankState();

      stateRef.current =
        next;
      setState(next);
      setReady(true);

      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setReady(false);

      try {
        const raw =
          await AsyncStorage.getItem(
            storageKey(
              owner,
              eventId
            )
          );

        const next =
          raw
            ? normalizeState(
                JSON.parse(raw),
                eventId
              )
            : blankState(
                eventId
              );

        if (!cancelled) {
          stateRef.current =
            next;
          setState(next);
          setReady(true);
        }
      } catch (error) {
        console.warn(
          "[Events] load failed",
          error
        );

        if (!cancelled) {
          const next =
            blankState(
              eventId
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
    activeEvent?.id,
    owner,
  ]);

  useEffect(() => {
    if (
      !ready ||
      !activeEvent
    ) {
      return;
    }

    AsyncStorage.setItem(
      storageKey(
        owner,
        activeEvent.id
      ),
      JSON.stringify(state)
    ).catch((error) => {
      console.warn(
        "[Events] save failed",
        error
      );
    });
  }, [
    activeEvent,
    owner,
    ready,
    state,
  ]);

  const maxPoints =
    Math.max(
      activeEvent?.freeTrack[
        activeEvent.freeTrack.length -
          1
      ]?.requiredPoints || 0,
      activeEvent?.premiumTrack[
        activeEvent.premiumTrack.length -
          1
      ]?.requiredPoints || 0
    );

  const premiumPassOwned =
    !!(
      activeEvent
        ?.premiumTrackEnabled &&
      activeEvent
        ?.premiumProductId &&
      isOwned(
        activeEvent.premiumProductId
      )
    );

  useEffect(() => {
    if (
      !ready ||
      !activeEvent
    ) {
      return;
    }

    const sub =
      DeviceEventEmitter.addListener(
        DAILY_QUEST_PROGRESS_EVENT,
        (
          event:
            DailyQuestProgressEvent
        ) => {
          const points =
            eventPointsFor(event);

          if (
            points <= 0
          ) {
            return;
          }

          setState(
            (previous) => {
              if (
                previous.eventId !==
                activeEvent.id
              ) {
                return previous;
              }

              return {
                ...previous,
                points:
                  maxPoints > 0
                    ? Math.min(
                        maxPoints,
                        previous.points +
                          points
                      )
                    : previous.points +
                      points,
              };
            }
          );
        }
      );

    return () =>
      sub.remove();
  }, [
    activeEvent,
    maxPoints,
    ready,
  ]);

  const rewardCoinsFor =
    useCallback(
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

  const persistNow =
    useCallback(
      async (
        next:
          StoredEventState
      ) => {
        if (!activeEvent) {
          return;
        }

        stateRef.current =
          next;
        setState(next);

        await AsyncStorage.setItem(
          storageKey(
            owner,
            activeEvent.id
          ),
          JSON.stringify(next)
        );
      },
      [
        activeEvent,
        owner,
      ]
    );

  const claimFreeReward =
    useCallback(
      async (
        rewardId: string
      ): Promise<number> => {
        if (!activeEvent) {
          return 0;
        }

        const reward:
          | NovaEventReward
          | undefined =
          activeEvent.freeTrack.find(
            (item) =>
              item.id ===
              rewardId
          );

        if (!reward) {
          return 0;
        }

        const lockKey =
          `${activeEvent.id}:${reward.id}`;

        if (
          claimLocks.current.has(
            lockKey
          )
        ) {
          return 0;
        }

        const current =
          stateRef.current;

        if (
          current.eventId !==
            activeEvent.id ||
          current.points <
            reward.requiredPoints ||
          current.claimedFreeRewardIds.includes(
            reward.id
          )
        ) {
          return 0;
        }

        claimLocks.current.add(
          lockKey
        );

        const rewardCoins =
          rewardCoinsFor(
            reward.baseCoins
          );

        const next:
          StoredEventState = {
          ...current,
          claimedFreeRewardIds: [
            ...current.claimedFreeRewardIds,
            reward.id,
          ],
        };

        try {
          await persistNow(
            next
          );

          await addCoins(
            rewardCoins,
            "event_reward",
            {
              eventId:
                activeEvent.id,
              rewardId:
                reward.id,
              baseCoins:
                reward.baseCoins,
              totalCoins:
                rewardCoins,
            }
          );

          return rewardCoins;
        } catch (error) {
          console.warn(
            "[Events] reward claim failed",
            error
          );

          await persistNow(
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
        activeEvent,
        addCoins,
        persistNow,
        rewardCoinsFor,
      ]
    );

  const claimPremiumReward =
    useCallback(
      async (
        rewardId: string
      ): Promise<number> => {
        if (
          !activeEvent ||
          !premiumPassOwned
        ) {
          return 0;
        }

        const reward:
          | NovaEventReward
          | undefined =
          activeEvent.premiumTrack.find(
            (item) =>
              item.id ===
              rewardId
          );

        if (!reward) {
          return 0;
        }

        const lockKey =
          `${activeEvent.id}:premium:${reward.id}`;

        if (
          claimLocks.current.has(
            lockKey
          )
        ) {
          return 0;
        }

        const current =
          stateRef.current;

        if (
          current.eventId !==
            activeEvent.id ||
          current.points <
            reward.requiredPoints ||
          current.claimedPremiumRewardIds.includes(
            reward.id
          )
        ) {
          return 0;
        }

        claimLocks.current.add(
          lockKey
        );

        const rewardCoins =
          rewardCoinsFor(
            reward.baseCoins
          );

        const next:
          StoredEventState = {
          ...current,
          claimedPremiumRewardIds: [
            ...current.claimedPremiumRewardIds,
            reward.id,
          ],
        };

        try {
          await persistNow(
            next
          );

          await addCoins(
            rewardCoins,
            "event_premium_reward",
            {
              eventId:
                activeEvent.id,
              rewardId:
                reward.id,
              baseCoins:
                reward.baseCoins,
              totalCoins:
                rewardCoins,
              premiumProductId:
                activeEvent.premiumProductId,
            }
          );

          return rewardCoins;
        } catch (error) {
          console.warn(
            "[Events] premium reward claim failed",
            error
          );

          await persistNow(
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
        activeEvent,
        addCoins,
        persistNow,
        premiumPassOwned,
        rewardCoinsFor,
      ]
    );

  const points =
    activeEvent?.id ===
    state.eventId
      ? state.points
      : 0;

  const claimedFreeRewardIds =
    activeEvent?.id ===
    state.eventId
      ? state.claimedFreeRewardIds
      : [];

  const claimedPremiumRewardIds =
    activeEvent?.id ===
    state.eventId
      ? state.claimedPremiumRewardIds
      : [];

  const progress =
    maxPoints > 0
      ? Math.max(
          0,
          Math.min(
            1,
            points /
              maxPoints
          )
        )
      : 0;

  const eventDay =
    activeEvent
      ? Math.max(
          1,
          dayNumber(
            dateKey
          ) -
            dayNumber(
              activeEvent.startDate
            ) +
            1
        )
      : 0;

  const daysRemaining =
    activeEvent
      ? Math.max(
          0,
          dayNumber(
            activeEvent.endDate
          ) -
            dayNumber(
              dateKey
            ) +
            1
        )
      : 0;

  const unclaimedRewardCount =
    activeEvent
      ? activeEvent.freeTrack.filter(
          (reward) =>
            points >=
              reward.requiredPoints &&
            !claimedFreeRewardIds.includes(
              reward.id
            )
        ).length +
        (
          premiumPassOwned
            ? activeEvent.premiumTrack.filter(
                (reward) =>
                  points >=
                    reward.requiredPoints &&
                  !claimedPremiumRewardIds.includes(
                    reward.id
                  )
              ).length
            : 0
        )
      : 0;

  return (
    <EventsContext.Provider
      value={{
        ready,
        dateKey,
        activeEvent,
        upcomingEvent,
        points,
        maxPoints,
        progress,
        eventDay,
        daysRemaining,
        claimedFreeRewardIds,
        claimedPremiumRewardIds,
        premiumPassOwned,
        unclaimedRewardCount,
        rewardCoinsFor,
        claimFreeReward,
        claimPremiumReward,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useNovaEvents() {
  const value =
    useContext(
      EventsContext
    );

  if (!value) {
    throw new Error(
      "useNovaEvents must be used inside EventsProvider"
    );
  }

  return value;
}

export default EventsProvider;
