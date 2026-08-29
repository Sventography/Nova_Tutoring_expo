// app/context/IslandBuilderContext.tsx
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

import {
  ISLAND_BUILDER_CATALOG,
  ISLAND_BUILDER_CATALOG_BY_ID,
  getUnlockedIslandBuilderItems,
  type IslandBuilderCatalogItem,
  type IslandLandmassId,
  type IslandTransform,
} from "../_lib/islandBuilderCatalog";
import { useIsland } from "./IslandContext";
import { useUser } from "./UserContext";

export type IslandPlacement = {
  placementId: string;
  itemId: string;
  landmassId: IslandLandmassId;
  transform: IslandTransform;
  placedAt: number;
  updatedAt: number;
};

export type IslandInventory = Record<string, number>;

type BuilderState = {
  version: 1;
  placements: IslandPlacement[];
  inventory: IslandInventory;
  grantedCatalogIds: string[];
  updatedAt: number;
};

type IslandBuilderContextValue = {
  ready: boolean;
  isEditing: boolean;
  catalog: IslandBuilderCatalogItem[];
  placements: IslandPlacement[];
  committedPlacements: IslandPlacement[];
  inventory: IslandInventory;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<boolean>;
  placeItem: (
    itemId: string,
    transform?: Partial<IslandTransform>
  ) => string | null;
  movePlacement: (
    placementId: string,
    transform: Partial<IslandTransform>
  ) => boolean;
  rotatePlacement: (
    placementId: string,
    rotationY: number
  ) => boolean;
  scalePlacement: (
    placementId: string,
    scale: number
  ) => boolean;
  returnToInventory: (placementId: string) => boolean;
  resetDraftToDefaultLayout: () => boolean;
  getInventoryCount: (itemId: string) => number;
};

const IslandBuilderContext =
  createContext<IslandBuilderContextValue | undefined>(undefined);

const STATE_PREFIX = "@island/builder/state.v1";

function stateKey(userId: string | null): string {
  return `${STATE_PREFIX}:${userId || "guest"}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizedRotation(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const full = Math.PI * 2;
  const wrapped = n % full;
  return wrapped < 0 ? wrapped + full : wrapped;
}

function normalizedTransform(
  value: Partial<IslandTransform> | undefined,
  fallback: IslandTransform
): IslandTransform {
  const num = (candidate: unknown, fallbackValue: number) => {
    const n = Number(candidate);
    return Number.isFinite(n) ? n : fallbackValue;
  };

  return {
    x: clamp(num(value?.x, fallback.x), -14, 14),
    y: clamp(num(value?.y, fallback.y), -2, 8),
    z: clamp(num(value?.z, fallback.z), -14, 14),
    rotationY: normalizedRotation(
      value?.rotationY ?? fallback.rotationY
    ),
    scale: clamp(num(value?.scale, fallback.scale), 0.5, 2),
  };
}

function cloneState(state: BuilderState): BuilderState {
  return {
    version: 1,
    placements: state.placements.map((placement) => ({
      ...placement,
      transform: { ...placement.transform },
    })),
    inventory: { ...state.inventory },
    grantedCatalogIds: [...state.grantedCatalogIds],
    updatedAt: state.updatedAt,
  };
}

function newPlacementId(itemId: string, index = 0): string {
  return `${itemId}:${Date.now().toString(36)}:${index.toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function defaultStateForLevel(islandLevel: number): BuilderState {
  const now = Date.now();
  const unlocked = getUnlockedIslandBuilderItems(islandLevel);

  return {
    version: 1,
    placements: unlocked.map((item, index) => ({
      placementId: newPlacementId(item.id, index),
      itemId: item.id,
      landmassId: item.landmassId,
      transform: { ...item.defaultTransform },
      placedAt: now,
      updatedAt: now,
    })),
    inventory: {},
    grantedCatalogIds: unlocked.map((item) => item.id),
    updatedAt: now,
  };
}

function reconcileUnlocks(
  state: BuilderState,
  islandLevel: number
): BuilderState {
  const next = cloneState(state);
  const granted = new Set(next.grantedCatalogIds);
  let changed = false;

  for (const item of getUnlockedIslandBuilderItems(islandLevel)) {
    if (granted.has(item.id)) continue;

    // New unlocks enter inventory. The player chooses where they go.
    next.inventory[item.id] =
      (next.inventory[item.id] || 0) + 1;
    granted.add(item.id);
    changed = true;
  }

  if (!changed) return state;

  next.grantedCatalogIds = Array.from(granted);
  next.updatedAt = Date.now();
  return next;
}

function normalizeStoredState(
  raw: unknown,
  islandLevel: number
): BuilderState {
  if (!raw || typeof raw !== "object") {
    return defaultStateForLevel(islandLevel);
  }

  const value = raw as Partial<BuilderState>;
  const now = Date.now();

  const placements: IslandPlacement[] = Array.isArray(value.placements)
    ? value.placements.flatMap((candidate, index) => {
        if (!candidate || typeof candidate !== "object") return [];

        const placement = candidate as Partial<IslandPlacement>;
        const item =
          ISLAND_BUILDER_CATALOG_BY_ID[String(placement.itemId || "")];
        if (!item) return [];

        return [{
          placementId:
            String(placement.placementId || "").trim() ||
            newPlacementId(item.id, index),
          itemId: item.id,
          landmassId: placement.landmassId || item.landmassId,
          transform: normalizedTransform(
            placement.transform,
            item.defaultTransform
          ),
          placedAt: Number(placement.placedAt) || now,
          updatedAt: Number(placement.updatedAt) || now,
        }];
      })
    : [];

  const inventory: IslandInventory = {};
  if (value.inventory && typeof value.inventory === "object") {
    for (const [itemId, count] of Object.entries(value.inventory)) {
      if (!ISLAND_BUILDER_CATALOG_BY_ID[itemId]) continue;
      const safeCount = Math.max(0, Math.floor(Number(count) || 0));
      if (safeCount > 0) inventory[itemId] = safeCount;
    }
  }

  const grantedCatalogIds = Array.isArray(value.grantedCatalogIds)
    ? Array.from(
        new Set(
          value.grantedCatalogIds
            .map(String)
            .filter((id) => Boolean(ISLAND_BUILDER_CATALOG_BY_ID[id]))
        )
      )
    : [];

  return reconcileUnlocks(
    {
      version: 1,
      placements,
      inventory,
      grantedCatalogIds,
      updatedAt: Number(value.updatedAt) || now,
    },
    islandLevel
  );
}

function defaultDraftFrom(
  state: BuilderState,
  islandLevel: number
): BuilderState {
  const next = cloneState(state);
  const unlocked = getUnlockedIslandBuilderItems(islandLevel);

  for (const placement of next.placements) {
    next.inventory[placement.itemId] =
      (next.inventory[placement.itemId] || 0) + 1;
  }

  next.placements = [];
  const now = Date.now();

  for (const [index, item] of unlocked.entries()) {
    const available = next.inventory[item.id] || 0;
    if (available > 0) {
      next.inventory[item.id] = available - 1;
      if (next.inventory[item.id] <= 0) {
        delete next.inventory[item.id];
      }
    }

    next.placements.push({
      placementId: newPlacementId(item.id, index),
      itemId: item.id,
      landmassId: item.landmassId,
      transform: { ...item.defaultTransform },
      placedAt: now,
      updatedAt: now,
    });
  }

  next.grantedCatalogIds = Array.from(
    new Set([
      ...next.grantedCatalogIds,
      ...unlocked.map((item) => item.id),
    ])
  );
  next.updatedAt = now;
  return next;
}

export function IslandBuilderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { islandLevel } = useIsland();
  const { supabaseUserId } = (useUser() || {}) as any;
  const userId = supabaseUserId ? String(supabaseUserId) : null;

  const [ready, setReady] = useState(false);
  const [committed, setCommitted] = useState<BuilderState>(
    () => defaultStateForLevel(islandLevel)
  );
  const [draft, setDraft] = useState<BuilderState | null>(null);

  const committedRef = useRef(committed);
  const draftRef = useRef<BuilderState | null>(draft);

  useEffect(() => {
    committedRef.current = committed;
  }, [committed]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persist = useCallback(
    async (state: BuilderState) => {
      await AsyncStorage.setItem(
        stateKey(userId),
        JSON.stringify(state)
      );
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setDraft(null);
    draftRef.current = null;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(stateKey(userId));
        const next = raw
          ? normalizeStoredState(JSON.parse(raw), islandLevel)
          : defaultStateForLevel(islandLevel);

        if (cancelled) return;

        committedRef.current = next;
        setCommitted(next);
        await persist(next);
      } catch (error) {
        console.warn("[IslandBuilderContext] load error", error);
        if (!cancelled) {
          const fallback = defaultStateForLevel(islandLevel);
          committedRef.current = fallback;
          setCommitted(fallback);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persist, userId]);

  useEffect(() => {
    if (!ready) return;

    const next = reconcileUnlocks(
      committedRef.current,
      islandLevel
    );
    if (next === committedRef.current) return;

    committedRef.current = next;
    setCommitted(next);

    if (draftRef.current) {
      const nextDraft = reconcileUnlocks(
        draftRef.current,
        islandLevel
      );
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }

    void persist(next).catch((error) =>
      console.warn("[IslandBuilderContext] unlock save error", error)
    );
  }, [islandLevel, persist, ready]);

  const active = draft ?? committed;
  const isEditing = draft !== null;

  const startEditing = useCallback(() => {
    if (!ready) return;
    const next = cloneState(committedRef.current);
    draftRef.current = next;
    setDraft(next);
  }, [ready]);

  const cancelEditing = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
  }, []);

  const saveEditing = useCallback(async () => {
    if (!draftRef.current) return false;

    const saved = cloneState(draftRef.current);
    saved.updatedAt = Date.now();

    try {
      await persist(saved);
      committedRef.current = saved;
      draftRef.current = null;
      setCommitted(saved);
      setDraft(null);
      return true;
    } catch (error) {
      console.warn("[IslandBuilderContext] save error", error);
      return false;
    }
  }, [persist]);

  const mutateDraft = useCallback(
    (
      updater: (state: BuilderState) => BuilderState | null
    ): BuilderState | null => {
      if (!draftRef.current) return null;
      const next = updater(cloneState(draftRef.current));
      if (!next) return null;

      next.updatedAt = Date.now();
      draftRef.current = next;
      setDraft(next);
      return next;
    },
    []
  );

  const placeItem = useCallback(
    (
      itemId: string,
      transform?: Partial<IslandTransform>
    ): string | null => {
      const item = ISLAND_BUILDER_CATALOG_BY_ID[itemId];
      if (!item || item.unlockLevel > islandLevel) return null;

      const placementId = newPlacementId(item.id);

      const next = mutateDraft((state) => {
        const count = state.inventory[item.id] || 0;
        if (count <= 0) return null;
        if (
          item.unique &&
          state.placements.some((p) => p.itemId === item.id)
        ) {
          return null;
        }

        state.inventory[item.id] = count - 1;
        if (state.inventory[item.id] <= 0) {
          delete state.inventory[item.id];
        }

        const now = Date.now();
        state.placements.push({
          placementId,
          itemId: item.id,
          landmassId: item.landmassId,
          transform: normalizedTransform(
            transform,
            item.defaultTransform
          ),
          placedAt: now,
          updatedAt: now,
        });
        return state;
      });

      return next ? placementId : null;
    },
    [islandLevel, mutateDraft]
  );

  const movePlacement = useCallback(
    (
      placementId: string,
      transform: Partial<IslandTransform>
    ): boolean =>
      Boolean(
        mutateDraft((state) => {
          const placement = state.placements.find(
            (p) => p.placementId === placementId
          );
          if (!placement) return null;

          const item =
            ISLAND_BUILDER_CATALOG_BY_ID[placement.itemId];
          if (!item) return null;

          placement.transform = normalizedTransform(
            { ...placement.transform, ...transform },
            item.defaultTransform
          );
          placement.updatedAt = Date.now();
          return state;
        })
      ),
    [mutateDraft]
  );

  const rotatePlacement = useCallback(
    (placementId: string, rotationY: number) =>
      movePlacement(placementId, { rotationY }),
    [movePlacement]
  );

  const scalePlacement = useCallback(
    (placementId: string, scale: number) =>
      movePlacement(placementId, { scale }),
    [movePlacement]
  );

  const returnToInventory = useCallback(
    (placementId: string): boolean =>
      Boolean(
        mutateDraft((state) => {
          const index = state.placements.findIndex(
            (p) => p.placementId === placementId
          );
          if (index < 0) return null;

          const [placement] = state.placements.splice(index, 1);
          state.inventory[placement.itemId] =
            (state.inventory[placement.itemId] || 0) + 1;
          return state;
        })
      ),
    [mutateDraft]
  );

  const resetDraftToDefaultLayout = useCallback(
    (): boolean =>
      Boolean(
        mutateDraft((state) =>
          defaultDraftFrom(state, islandLevel)
        )
      ),
    [islandLevel, mutateDraft]
  );

  const getInventoryCount = useCallback(
    (itemId: string) =>
      Math.max(0, Math.floor(active.inventory[itemId] || 0)),
    [active.inventory]
  );

  const value = useMemo<IslandBuilderContextValue>(
    () => ({
      ready,
      isEditing,
      catalog: ISLAND_BUILDER_CATALOG,
      placements: active.placements,
      committedPlacements: committed.placements,
      inventory: active.inventory,
      startEditing,
      cancelEditing,
      saveEditing,
      placeItem,
      movePlacement,
      rotatePlacement,
      scalePlacement,
      returnToInventory,
      resetDraftToDefaultLayout,
      getInventoryCount,
    }),
    [
      ready,
      isEditing,
      active.placements,
      active.inventory,
      committed.placements,
      startEditing,
      cancelEditing,
      saveEditing,
      placeItem,
      movePlacement,
      rotatePlacement,
      scalePlacement,
      returnToInventory,
      resetDraftToDefaultLayout,
      getInventoryCount,
    ]
  );

  return (
    <IslandBuilderContext.Provider value={value}>
      {children}
    </IslandBuilderContext.Provider>
  );
}

export function useIslandBuilder(): IslandBuilderContextValue {
  const context = useContext(IslandBuilderContext);
  if (!context) {
    throw new Error(
      "useIslandBuilder must be used within an IslandBuilderProvider"
    );
  }
  return context;
}
