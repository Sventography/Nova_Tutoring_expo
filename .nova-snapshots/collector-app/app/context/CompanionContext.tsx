// app/context/CompanionContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useUser } from "./UserContext";
import { usePurchases } from "./PurchasesContext";
import { canonId } from "../_lib/canonId";
import {
  COMPANIONS,
  type CompanionItem,
} from "../_lib/companionsCatalog";
import {
  getCommonCompanionFriendshipProfile,
  getFriendshipLevelFromPoints,
  getFriendshipProgress,
  normalizeCommonCompanionId,
  type CompanionActivityKey,
  type FriendshipLevel,
} from "../_lib/commonCompanionFriendship";

export type CompanionInteractionKind =
  | "tap"
  | "pet"
  | "activity";

export type CompanionInteractionResult = {
  points: number;
  level: FriendshipLevel;
  leveledUp: boolean;
  awardedPoints: number;
  dailyCapReached: boolean;
  maxed: boolean;
  nextLevelAt: number | null;
};

export type CompanionDailyStatus = {
  date: string;
  tapsUsed: number;
  petsUsed: number;
  activitiesUsed: number;
  tapsRemaining: number;
  petsRemaining: number;
  activitiesRemaining: number;
};

type DailyEntry = {
  tap: number;
  pet: number;
  activity: number;
};

type DailyInteractionState = {
  date: string;
  companions: Record<string, DailyEntry>;
};

type CompanionContextValue = {
  activeCompanionId: string | null;
  equippedCompanionId: string | null;
  activeCompanion: CompanionItem | null;
  ownedCompanions: string[];
  friendshipPoints: Record<string, number>;
  ready: boolean;

  equipCompanion: (id: string) => Promise<void>;
  clearCompanion: () => Promise<void>;
  reload: () => Promise<void>;

  isActive: (
    id: string | null | undefined
  ) => boolean;

  getFriendshipPoints: (
    id: string | null | undefined
  ) => number;

  getFriendshipLevel: (
    id: string | null | undefined
  ) => FriendshipLevel;

  getFriendshipDailyStatus: (
    id: string | null | undefined
  ) => CompanionDailyStatus;

  recordCompanionInteraction: (
    id: string,
    kind: "tap" | "pet"
  ) => Promise<CompanionInteractionResult>;

  recordCompanionActivity: (
    id: string,
    activity: CompanionActivityKey
  ) => Promise<CompanionInteractionResult>;
};

const CompanionContext =
  createContext<CompanionContextValue | null>(null);

const BASE_KEY = "@nova/companion.active";
const LEGACY_BASE_KEY = "@nova/active-companion";
const FRIENDSHIP_BASE_KEY =
  "@nova/companion.friendship.v1";
const FRIENDSHIP_DAILY_BASE_KEY =
  "@nova/companion.friendship.daily.v1";

const DAILY_CAPS: Record<
  CompanionInteractionKind,
  number
> = {
  tap: 8,
  pet: 2,
  activity: 5,
};

const FRIENDSHIP_POINTS_PER_ACTION: Record<
  CompanionInteractionKind,
  number
> = {
  tap: 1,
  pet: 3,
  activity: 2,
};

const MAX_FRIENDSHIP_POINTS = 120;

function storageKey(userId: string | null): string {
  return userId
    ? `${BASE_KEY}/${userId}`
    : `${BASE_KEY}/guest`;
}

function legacyStorageKey(
  userId: string | null
): string {
  return userId
    ? `${LEGACY_BASE_KEY}/${userId}`
    : `${LEGACY_BASE_KEY}/guest`;
}

function friendshipStorageKey(
  userId: string | null
): string {
  return userId
    ? `${FRIENDSHIP_BASE_KEY}/${userId}`
    : `${FRIENDSHIP_BASE_KEY}/guest`;
}

function friendshipDailyStorageKey(
  userId: string | null
): string {
  return userId
    ? `${FRIENDSHIP_DAILY_BASE_KEY}/${userId}`
    : `${FRIENDSHIP_DAILY_BASE_KEY}/guest`;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function emptyDailyState(): DailyInteractionState {
  return {
    date: localDateKey(),
    companions: {},
  };
}

function emptyDailyEntry(): DailyEntry {
  return {
    tap: 0,
    pet: 0,
    activity: 0,
  };
}

function sanitizeCount(value: unknown): number {
  const parsed = Math.floor(Number(value));

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

function sanitizePoints(value: unknown): number {
  return Math.min(
    MAX_FRIENDSHIP_POINTS,
    sanitizeCount(value)
  );
}

function findCompanion(
  id: string | null | undefined
): CompanionItem | null {
  if (!id) return null;

  const cid = canonId(id);

  return (
    COMPANIONS.find(
      (companion) =>
        companion.canonId === cid ||
        canonId(companion.id) === cid
    ) ?? null
  );
}

function normalizeFriendshipMap(
  value: unknown
): Record<string, number> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const output: Record<string, number> = {};

  for (const [rawId, rawPoints] of Object.entries(
    value as Record<string, unknown>
  )) {
    const id = normalizeCommonCompanionId(rawId);

    if (!id) continue;

    output[id] = sanitizePoints(rawPoints);
  }

  return output;
}

function normalizeDailyState(
  value: unknown
): DailyInteractionState {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return emptyDailyState();
  }

  const raw = value as Partial<DailyInteractionState>;

  if (raw.date !== localDateKey()) {
    return emptyDailyState();
  }

  const companions: Record<string, DailyEntry> = {};

  if (
    raw.companions &&
    typeof raw.companions === "object"
  ) {
    for (const [rawId, rawEntry] of Object.entries(
      raw.companions
    )) {
      const id = normalizeCommonCompanionId(rawId);

      if (
        !id ||
        !rawEntry ||
        typeof rawEntry !== "object"
      ) {
        continue;
      }

      const entry = rawEntry as Partial<DailyEntry>;

      companions[id] = {
        tap: sanitizeCount(entry.tap),
        pet: sanitizeCount(entry.pet),
        activity: sanitizeCount(entry.activity),
      };
    }
  }

  return {
    date: localDateKey(),
    companions,
  };
}

function statusFromState(
  state: DailyInteractionState,
  id: string | null
): CompanionDailyStatus {
  const normalized =
    normalizeDailyState(state);
  const entry =
    (id && normalized.companions[id]) ||
    emptyDailyEntry();

  return {
    date: normalized.date,
    tapsUsed: entry.tap,
    petsUsed: entry.pet,
    activitiesUsed: entry.activity,
    tapsRemaining: Math.max(
      0,
      DAILY_CAPS.tap - entry.tap
    ),
    petsRemaining: Math.max(
      0,
      DAILY_CAPS.pet - entry.pet
    ),
    activitiesRemaining: Math.max(
      0,
      DAILY_CAPS.activity - entry.activity
    ),
  };
}

type CompanionProviderProps = {
  children: ReactNode;
};

export const CompanionProvider: React.FC<
  CompanionProviderProps
> = ({ children }) => {
  const { supabaseUserId } = useUser();
  const { purchases } = usePurchases();

  const userId = supabaseUserId
    ? String(supabaseUserId)
    : null;

  const [activeCompanionId, setActiveCompanionId] =
    useState<string | null>(null);
  const [friendshipPoints, setFriendshipPoints] =
    useState<Record<string, number>>({});
  const [
    dailyInteractionState,
    setDailyInteractionState,
  ] = useState<DailyInteractionState>(
    emptyDailyState
  );
  const [ready, setReady] = useState(false);

  const friendshipRef = useRef<
    Record<string, number>
  >({});
  const dailyRef = useRef<DailyInteractionState>(
    emptyDailyState()
  );

  const key = useMemo(
    () => storageKey(userId),
    [userId]
  );

  const legacyKey = useMemo(
    () => legacyStorageKey(userId),
    [userId]
  );

  const friendshipKey = useMemo(
    () => friendshipStorageKey(userId),
    [userId]
  );

  const friendshipDailyKey = useMemo(
    () => friendshipDailyStorageKey(userId),
    [userId]
  );

  const persistFriendship = useCallback(
    async (next: Record<string, number>) => {
      try {
        await AsyncStorage.setItem(
          friendshipKey,
          JSON.stringify(next)
        );
      } catch (error) {
        console.warn(
          "[CompanionContext] Failed to persist friendship",
          error
        );
      }
    },
    [friendshipKey]
  );

  const persistDailyState = useCallback(
    async (next: DailyInteractionState) => {
      try {
        await AsyncStorage.setItem(
          friendshipDailyKey,
          JSON.stringify(next)
        );
      } catch (error) {
        console.warn(
          "[CompanionContext] Failed to persist daily friendship limits",
          error
        );
      }
    },
    [friendshipDailyKey]
  );

  const loadFromStorage = useCallback(async () => {
    try {
      const [
        currentRaw,
        legacyRaw,
        friendshipRaw,
        dailyRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(key),
        AsyncStorage.getItem(legacyKey),
        AsyncStorage.getItem(friendshipKey),
        AsyncStorage.getItem(
          friendshipDailyKey
        ),
      ]);

      const raw = currentRaw || legacyRaw;

      if (raw) {
        setActiveCompanionId(canonId(raw));
      } else {
        setActiveCompanionId(null);
      }

      let parsedFriendship: unknown = {};
      let parsedDaily: unknown = {};

      if (friendshipRaw) {
        try {
          parsedFriendship =
            JSON.parse(friendshipRaw);
        } catch {
          parsedFriendship = {};
        }
      }

      if (dailyRaw) {
        try {
          parsedDaily = JSON.parse(dailyRaw);
        } catch {
          parsedDaily = {};
        }
      }

      const normalizedFriendship =
        normalizeFriendshipMap(
          parsedFriendship
        );
      const normalizedDaily =
        normalizeDailyState(parsedDaily);

      friendshipRef.current =
        normalizedFriendship;
      dailyRef.current = normalizedDaily;

      setFriendshipPoints(
        normalizedFriendship
      );
      setDailyInteractionState(
        normalizedDaily
      );

      await Promise.allSettled([
        persistFriendship(
          normalizedFriendship
        ),
        persistDailyState(normalizedDaily),
      ]);
    } catch (error) {
      console.warn(
        "[CompanionContext] Failed to hydrate companion data",
        error
      );

      setActiveCompanionId(null);
      friendshipRef.current = {};
      dailyRef.current =
        emptyDailyState();
      setFriendshipPoints({});
      setDailyInteractionState(
        dailyRef.current
      );
    } finally {
      setReady(true);
    }
  }, [
    friendshipDailyKey,
    friendshipKey,
    key,
    legacyKey,
    persistDailyState,
    persistFriendship,
  ]);

  useEffect(() => {
    setReady(false);
    setActiveCompanionId(null);

    friendshipRef.current = {};
    dailyRef.current = emptyDailyState();

    setFriendshipPoints({});
    setDailyInteractionState(
      dailyRef.current
    );

    void loadFromStorage();
  }, [loadFromStorage]);

  const persistActive = useCallback(
    async (id: string | null) => {
      try {
        if (id) {
          await AsyncStorage.setItem(
            key,
            id
          );
        } else {
          await AsyncStorage.removeItem(
            key
          );
        }
      } catch (error) {
        console.warn(
          "[CompanionContext] Failed to persist active companion",
          error
        );
      }
    },
    [key]
  );

  const equipCompanion = useCallback(
    async (id: string) => {
      const cid = canonId(id);

      setActiveCompanionId(cid);
      await persistActive(cid);
    },
    [persistActive]
  );

  const clearCompanion =
    useCallback(async () => {
      setActiveCompanionId(null);
      await persistActive(null);
    }, [persistActive]);

  const reload = useCallback(async () => {
    setReady(false);
    await loadFromStorage();
  }, [loadFromStorage]);

  const ownedCompanions = useMemo(() => {
    const ids = Object.keys(purchases || {});
    const output = new Set<string>();

    for (const raw of ids) {
      const cid = canonId(raw);

      if (cid.startsWith("companion:")) {
        output.add(cid);
      }
    }

    return Array.from(output);
  }, [purchases]);

  const activeCompanion =
    useMemo<CompanionItem | null>(() => {
      return findCompanion(
        activeCompanionId
      );
    }, [activeCompanionId]);

  const isActive = useCallback(
    (
      id: string | null | undefined
    ): boolean => {
      if (!id || !activeCompanionId) {
        return false;
      }

      return (
        canonId(id) ===
        canonId(activeCompanionId)
      );
    },
    [activeCompanionId]
  );

  const getFriendshipPoints = useCallback(
    (
      id: string | null | undefined
    ): number => {
      const normalized =
        normalizeCommonCompanionId(id);

      if (!normalized) return 0;

      return sanitizePoints(
        friendshipPoints[normalized]
      );
    },
    [friendshipPoints]
  );

  const getFriendshipLevel = useCallback(
    (
      id: string | null | undefined
    ): FriendshipLevel => {
      return getFriendshipLevelFromPoints(
        getFriendshipPoints(id)
      );
    },
    [getFriendshipPoints]
  );

  const getFriendshipDailyStatus =
    useCallback(
      (
        id: string | null | undefined
      ): CompanionDailyStatus => {
        const normalized =
          normalizeCommonCompanionId(id);

        return statusFromState(
          dailyInteractionState,
          normalized
        );
      },
      [dailyInteractionState]
    );

  const awardFriendship = useCallback(
    async (
      rawId: string,
      kind: CompanionInteractionKind
    ): Promise<CompanionInteractionResult> => {
      const id =
        normalizeCommonCompanionId(rawId);
      const profile =
        getCommonCompanionFriendshipProfile(
          rawId
        );
      const companion = findCompanion(rawId);

      if (
        !id ||
        !profile ||
        !companion ||
        companion.role !== "cosmetic"
      ) {
        return {
          points: 0,
          level: 1,
          leveledUp: false,
          awardedPoints: 0,
          dailyCapReached: false,
          maxed: false,
          nextLevelAt: 8,
        };
      }

      const currentPoints = sanitizePoints(
        friendshipRef.current[id]
      );
      const previousProgress =
        getFriendshipProgress(
          currentPoints
        );

      if (
        currentPoints >=
        MAX_FRIENDSHIP_POINTS
      ) {
        return {
          points: currentPoints,
          level: 6,
          leveledUp: false,
          awardedPoints: 0,
          dailyCapReached: false,
          maxed: true,
          nextLevelAt: null,
        };
      }

      const currentDaily =
        normalizeDailyState(
          dailyRef.current
        );
      const currentEntry =
        currentDaily.companions[id] ||
        emptyDailyEntry();
      const cap = DAILY_CAPS[kind];

      if (currentEntry[kind] >= cap) {
        return {
          points: currentPoints,
          level: previousProgress.level,
          leveledUp: false,
          awardedPoints: 0,
          dailyCapReached: true,
          maxed: false,
          nextLevelAt:
            previousProgress.nextLevelAt,
        };
      }

      const requestedIncrease =
        FRIENDSHIP_POINTS_PER_ACTION[kind];
      const nextPoints = Math.min(
        MAX_FRIENDSHIP_POINTS,
        currentPoints + requestedIncrease
      );
      const awardedPoints =
        nextPoints - currentPoints;
      const nextProgress =
        getFriendshipProgress(nextPoints);

      const nextFriendship = {
        ...friendshipRef.current,
        [id]: nextPoints,
      };

      const nextEntry: DailyEntry = {
        ...currentEntry,
        [kind]: currentEntry[kind] + 1,
      };

      const nextDaily: DailyInteractionState = {
        date: localDateKey(),
        companions: {
          ...currentDaily.companions,
          [id]: nextEntry,
        },
      };

      friendshipRef.current =
        nextFriendship;
      dailyRef.current = nextDaily;

      setFriendshipPoints(
        nextFriendship
      );
      setDailyInteractionState(
        nextDaily
      );

      await Promise.allSettled([
        persistFriendship(
          nextFriendship
        ),
        persistDailyState(nextDaily),
      ]);

      return {
        points: nextPoints,
        level: nextProgress.level,
        leveledUp:
          nextProgress.level >
          previousProgress.level,
        awardedPoints,
        dailyCapReached: false,
        maxed:
          nextPoints >=
          MAX_FRIENDSHIP_POINTS,
        nextLevelAt:
          nextProgress.nextLevelAt,
      };
    },
    [
      persistDailyState,
      persistFriendship,
    ]
  );

  const recordCompanionInteraction =
    useCallback(
      async (
        id: string,
        kind: "tap" | "pet"
      ) => {
        return awardFriendship(id, kind);
      },
      [awardFriendship]
    );

  const recordCompanionActivity =
    useCallback(
      async (
        id: string,
        _activity: CompanionActivityKey
      ) => {
        return awardFriendship(
          id,
          "activity"
        );
      },
      [awardFriendship]
    );

  const canonicalActiveId =
    activeCompanionId
      ? canonId(activeCompanionId)
      : null;

  const value =
    useMemo<CompanionContextValue>(
      () => ({
        ready,
        activeCompanionId:
          canonicalActiveId,
        equippedCompanionId:
          canonicalActiveId,
        activeCompanion,
        ownedCompanions,
        friendshipPoints,
        equipCompanion,
        clearCompanion,
        reload,
        isActive,
        getFriendshipPoints,
        getFriendshipLevel,
        getFriendshipDailyStatus,
        recordCompanionInteraction,
        recordCompanionActivity,
      }),
      [
        ready,
        canonicalActiveId,
        activeCompanion,
        ownedCompanions,
        friendshipPoints,
        equipCompanion,
        clearCompanion,
        reload,
        isActive,
        getFriendshipPoints,
        getFriendshipLevel,
        getFriendshipDailyStatus,
        recordCompanionInteraction,
        recordCompanionActivity,
      ]
    );

  return (
    <CompanionContext.Provider
      value={value}
    >
      {children}
    </CompanionContext.Provider>
  );
};

export function useCompanion(): CompanionContextValue {
  const context =
    useContext(CompanionContext);

  if (!context) {
    throw new Error(
      "useCompanion must be used inside <CompanionProvider>"
    );
  }

  return context;
}