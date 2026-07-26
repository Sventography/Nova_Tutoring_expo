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

export type CompanionInteractionKind = "tap" | "pet";

export type CompanionInteractionResult = {
  points: number;
  level: number;
  leveledUp: boolean;
};

type CompanionContextValue = {
  /** Canonical ID of the currently active companion. */
  activeCompanionId: string | null;

  /**
   * Legacy alias used by an older CompanionOverlay component.
   * It always matches activeCompanionId.
   */
  equippedCompanionId: string | null;

  /** Full companion object for the active companion. */
  activeCompanion: CompanionItem | null;

  /** All owned companion canonical IDs derived from PurchasesContext. */
  ownedCompanions: string[];

  /** Persistent friendship points for regular cosmetic companions. */
  friendshipPoints: Record<string, number>;

  /** Equip a companion by catalog ID. */
  equipCompanion: (id: string) => Promise<void>;

  /** Unequip the active companion. */
  clearCompanion: () => Promise<void>;

  /** Reload the active companion and friendship data from storage. */
  reload: () => Promise<void>;

  /** Whether storage hydration has finished. */
  ready: boolean;

  /** Convenience helper for active state. */
  isActive: (
    id: string | null | undefined
  ) => boolean;

  /** Return stored friendship points for a companion. */
  getFriendshipPoints: (
    id: string | null | undefined
  ) => number;

  /** Return friendship level 1–6 for a companion. */
  getFriendshipLevel: (
    id: string | null | undefined
  ) => number;

  /**
   * Record a tap or pet interaction.
   * Only role="cosmetic" companions gain friendship in this version.
   */
  recordCompanionInteraction: (
    id: string,
    kind: CompanionInteractionKind
  ) => Promise<CompanionInteractionResult>;
};

const CompanionContext =
  createContext<CompanionContextValue | null>(null);

const BASE_KEY = "@nova/companion.active";
const LEGACY_BASE_KEY = "@nova/active-companion";
const FRIENDSHIP_BASE_KEY =
  "@nova/companion.friendship.v1";

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

function sanitizePoints(value: unknown): number {
  const parsed = Math.floor(Number(value));

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

function friendshipLevelForPoints(
  points: number
): number {
  if (points >= 120) return 6;
  if (points >= 75) return 5;
  if (points >= 40) return 4;
  if (points >= 20) return 3;
  if (points >= 8) return 2;
  return 1;
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
    const cid = canonId(rawId);
    const companion = findCompanion(cid);

    // Friendship is intentionally limited to the regular Nova
    // companions. Legendary power/support companions are untouched.
    if (!companion || companion.role !== "cosmetic") {
      continue;
    }

    output[cid] = sanitizePoints(rawPoints);
  }

  return output;
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
  const [ready, setReady] = useState(false);

  const friendshipRef = useRef<
    Record<string, number>
  >({});

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

  const loadFromStorage = useCallback(async () => {
    try {
      const [
        currentRaw,
        legacyRaw,
        friendshipRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(key),
        AsyncStorage.getItem(legacyKey),
        AsyncStorage.getItem(friendshipKey),
      ]);

      const raw = currentRaw || legacyRaw;

      if (raw) {
        const cid = canonId(raw);
        setActiveCompanionId(cid);

        console.log(
          "[CompanionContext] loaded active companion:",
          cid
        );
      } else {
        setActiveCompanionId(null);

        console.log(
          "[CompanionContext] no active companion stored"
        );
      }

      let parsedFriendship: unknown = {};

      if (friendshipRaw) {
        try {
          parsedFriendship =
            JSON.parse(friendshipRaw);
        } catch {
          parsedFriendship = {};
        }
      }

      const normalized =
        normalizeFriendshipMap(parsedFriendship);

      friendshipRef.current = normalized;
      setFriendshipPoints(normalized);
    } catch (error) {
      console.warn(
        "[CompanionContext] Failed to hydrate companion data",
        error
      );

      setActiveCompanionId(null);
      friendshipRef.current = {};
      setFriendshipPoints({});
    } finally {
      setReady(true);
    }
  }, [friendshipKey, key, legacyKey]);

  useEffect(() => {
    setReady(false);
    setActiveCompanionId(null);
    friendshipRef.current = {};
    setFriendshipPoints({});

    void loadFromStorage();
  }, [loadFromStorage]);

  const persistActive = useCallback(
    async (id: string | null) => {
      try {
        if (id) {
          await AsyncStorage.setItem(key, id);
        } else {
          await AsyncStorage.removeItem(key);
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

      console.log(
        "[CompanionContext] equipped companion:",
        cid
      );
    },
    [persistActive]
  );

  const clearCompanion = useCallback(async () => {
    setActiveCompanionId(null);
    await persistActive(null);

    console.log(
      "[CompanionContext] cleared active companion"
    );
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
      return findCompanion(activeCompanionId);
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
      if (!id) return 0;

      return sanitizePoints(
        friendshipPoints[canonId(id)]
      );
    },
    [friendshipPoints]
  );

  const getFriendshipLevel = useCallback(
    (
      id: string | null | undefined
    ): number => {
      return friendshipLevelForPoints(
        getFriendshipPoints(id)
      );
    },
    [getFriendshipPoints]
  );

  const recordCompanionInteraction =
    useCallback(
      async (
        id: string,
        kind: CompanionInteractionKind
      ): Promise<CompanionInteractionResult> => {
        const companion = findCompanion(id);
        const cid = canonId(id);

        if (
          !companion ||
          companion.role !== "cosmetic"
        ) {
          return {
            points: 0,
            level: 1,
            leveledUp: false,
          };
        }

        const currentMap =
          friendshipRef.current;
        const previousPoints = sanitizePoints(
          currentMap[cid]
        );
        const previousLevel =
          friendshipLevelForPoints(previousPoints);

        // Petting is a more deliberate interaction than tapping.
        const increase = kind === "pet" ? 3 : 1;
        const nextPoints =
          previousPoints + increase;
        const nextLevel =
          friendshipLevelForPoints(nextPoints);

        const nextMap = {
          ...currentMap,
          [cid]: nextPoints,
        };

        friendshipRef.current = nextMap;
        setFriendshipPoints(nextMap);

        await persistFriendship(nextMap);

        return {
          points: nextPoints,
          level: nextLevel,
          leveledUp: nextLevel > previousLevel,
        };
      },
      [persistFriendship]
    );

  const canonicalActiveId = activeCompanionId
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
        recordCompanionInteraction,
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
        recordCompanionInteraction,
      ]
    );

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
};

export function useCompanion(): CompanionContextValue {
  const context = useContext(CompanionContext);

  if (!context) {
    throw new Error(
      "useCompanion must be used inside <CompanionProvider>"
    );
  }

  return context;
}