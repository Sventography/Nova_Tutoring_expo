// app/context/IslandDecorationContext.tsx
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
  ISLAND_DECORATION_CATALOG,
  ISLAND_DECORATION_CATALOG_BY_ID,
  type IslandDecorationCatalogItem,
} from "../_lib/islandDecorationCatalog";
import { clampIslandBuildPosition } from "../_lib/islandBuilderBounds";
import { useCoins } from "./CoinsContext";
import { useIsland } from "./IslandContext";
import { useUser } from "./UserContext";

export type IslandDecorationTransform = {
  x: number;
  z: number;
  rotationY: number;
  scale: number;
};

export type IslandDecorationPlacement = {
  placementId: string;
  itemId: string;
  transform: IslandDecorationTransform;
  placedAt: number;
  updatedAt: number;
};

type DecorationState = {
  version: 1;
  ownedCounts: Record<string, number>;
  firstAcquiredAt: Record<string, number>;
  firstAcquiredAtEstimated: Record<string, boolean>;
  placements: IslandDecorationPlacement[];
  updatedAt: number;
};

export type IslandDecorationOwnershipInfo = {
  ownedCount: number;
  firstAcquiredAt: number | null;
  estimated: boolean;
};

type PurchaseResult = {
  ok: boolean;
  placementId?: string;
  reason?: "not_ready" | "not_editing" | "unknown_item" | "locked" | "insufficient_coins" | "save_failed";
};

type ContextValue = {
  ready: boolean;
  isEditing: boolean;
  catalog: IslandDecorationCatalogItem[];
  placements: IslandDecorationPlacement[];
  committedPlacements: IslandDecorationPlacement[];
  selectedPlacementId: string | null;
  selectPlacement: (placementId: string | null) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<boolean>;
  buyDecoration: (itemId: string) => Promise<PurchaseResult>;
  placeFromInventory: (itemId: string) => string | null;
  movePlacement: (placementId: string, transform: Partial<IslandDecorationTransform>) => boolean;
  rotatePlacement: (placementId: string, rotationY: number) => boolean;
  scalePlacement: (placementId: string, scale: number) => boolean;
  returnToInventory: (placementId: string) => boolean;
  moveAllToInventory: () => number;
  getInventoryCount: (itemId: string) => number;
  getOwnershipInfo: (
    itemId: string
  ) => IslandDecorationOwnershipInfo;
  armDecorationDrag: (placementId: string) => void;
  getArmedDecorationDrag: () => IslandDecorationPlacement | null;
  clearDecorationDrag: () => void;
};

const Context = createContext<ContextValue | undefined>(undefined);
const STATE_PREFIX = "@island/decorations/state.v1";

const keyFor = (userId: string | null) =>
  `${STATE_PREFIX}:${userId || "guest"}`;

const emptyState = (): DecorationState => ({
  version: 1,
  ownedCounts: {},
  firstAcquiredAt: {},
  firstAcquiredAtEstimated: {},
  placements: [],
  updatedAt: Date.now(),
});

const cloneState = (state: DecorationState): DecorationState => ({
  version: 1,
  ownedCounts: { ...state.ownedCounts },
  firstAcquiredAt: { ...state.firstAcquiredAt },
  firstAcquiredAtEstimated: {
    ...state.firstAcquiredAtEstimated,
  },
  placements: state.placements.map((placement) => ({
    ...placement,
    transform: { ...placement.transform },
  })),
  updatedAt: state.updatedAt,
});

const newPlacementId = (itemId: string) =>
  `${itemId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

function normalizeRotation(value: number): number {
  const full = Math.PI * 2;
  const safe = Number.isFinite(value) ? value : 0;
  const wrapped = safe % full;
  return wrapped < 0 ? wrapped + full : wrapped;
}

function normalizeTransform(
  itemId: string,
  input?: Partial<IslandDecorationTransform>
): IslandDecorationTransform {
  const item = ISLAND_DECORATION_CATALOG_BY_ID[itemId];
  const minScale = item?.minScale ?? 0.5;
  const maxScale = item?.maxScale ?? 4;
  const rawScale = Number(input?.scale ?? item?.defaultScale ?? 1);
  const scale = Math.max(
    minScale,
    Math.min(maxScale, Number.isFinite(rawScale) ? rawScale : 1)
  );

  const rawX = Number(input?.x ?? 0);
  const rawZ = Number(input?.z ?? 0);
  const x = Number.isFinite(rawX) ? rawX : 0;
  const z = Number.isFinite(rawZ) ? rawZ : 0;
  const next = clampIslandBuildPosition(x, z, scale, itemId);

  return {
    x: next.x,
    z: next.z,
    rotationY: normalizeRotation(Number(input?.rotationY ?? 0)),
    scale,
  };
}

function normalizeState(raw: unknown): DecorationState {
  if (!raw || typeof raw !== "object") return emptyState();
  const value = raw as Partial<DecorationState>;
  const ownedCounts: Record<string, number> = {};

  if (value.ownedCounts && typeof value.ownedCounts === "object") {
    for (const [itemId, count] of Object.entries(value.ownedCounts)) {
      if (!ISLAND_DECORATION_CATALOG_BY_ID[itemId]) continue;
      const safe = Math.max(0, Math.floor(Number(count) || 0));
      if (safe) ownedCounts[itemId] = safe;
    }
  }

  const used: Record<string, number> = {};
  const placements: IslandDecorationPlacement[] = [];

  if (Array.isArray(value.placements)) {
    value.placements.forEach((candidate, index) => {
      if (!candidate || typeof candidate !== "object") return;
      const p = candidate as Partial<IslandDecorationPlacement>;
      const itemId = String(p.itemId || "");
      if (!ISLAND_DECORATION_CATALOG_BY_ID[itemId]) return;

      used[itemId] = (used[itemId] || 0) + 1;
      if (used[itemId] > (ownedCounts[itemId] || 0)) return;

      placements.push({
        placementId: String(p.placementId || "").trim() || `${itemId}:recovered:${index}`,
        itemId,
        transform: normalizeTransform(itemId, p.transform),
        placedAt: Number(p.placedAt) || Date.now(),
        updatedAt: Number(p.updatedAt) || Date.now(),
      });
    });
  }

  const firstAcquiredAt: Record<string, number> = {};
  const firstAcquiredAtEstimated: Record<string, boolean> = {};

  if (
    value.firstAcquiredAt &&
    typeof value.firstAcquiredAt === "object"
  ) {
    for (const [itemId, timestamp] of Object.entries(
      value.firstAcquiredAt
    )) {
      if (!ISLAND_DECORATION_CATALOG_BY_ID[itemId]) continue;
      if ((ownedCounts[itemId] || 0) <= 0) continue;

      const safeTimestamp = Number(timestamp);
      if (
        !Number.isFinite(safeTimestamp) ||
        safeTimestamp <= 0
      ) {
        continue;
      }

      firstAcquiredAt[itemId] = safeTimestamp;
      firstAcquiredAtEstimated[itemId] =
        Boolean(
          value.firstAcquiredAtEstimated?.[itemId]
        );
    }
  }

  for (const [itemId, ownedCount] of Object.entries(
    ownedCounts
  )) {
    if (
      ownedCount <= 0 ||
      firstAcquiredAt[itemId]
    ) {
      continue;
    }

    const placementTimes =
      placements
        .filter(
          (placement) =>
            placement.itemId === itemId
        )
        .map(
          (placement) =>
            Number(placement.placedAt)
        )
        .filter(
          (timestamp) =>
            Number.isFinite(timestamp) &&
            timestamp > 0
        );

    /*
     * Older decoration snapshots did not store purchase timestamps.
     * Preserve the best historical date we actually have rather than
     * resetting tenure to today. The UI labels this migrated date as
     * estimated.
     */
    firstAcquiredAt[itemId] =
      placementTimes.length > 0
        ? Math.min(...placementTimes)
        : Number(value.updatedAt) ||
          Date.now();

    firstAcquiredAtEstimated[itemId] =
      true;
  }

  return {
    version: 1,
    ownedCounts,
    firstAcquiredAt,
    firstAcquiredAtEstimated,
    placements,
    updatedAt: Number(value.updatedAt) || Date.now(),
  };
}

function spawnTransform(itemId: string): IslandDecorationTransform {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.2 + Math.random() * 4.2;

  return normalizeTransform(itemId, {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    rotationY: Math.random() * Math.PI * 2,
  });
}

export function IslandDecorationProvider({ children }: { children: ReactNode }) {
  const {
    supabaseUserId,
    ready: userReady,
  } = (useUser() || {}) as any;
  const userId = supabaseUserId ? String(supabaseUserId) : null;
  const { coins, ready: coinsReady, addCoins } = useCoins();
  const { islandLevel } = useIsland();

  const [ready, setReady] = useState(false);
  const [committed, setCommitted] = useState<DecorationState>(emptyState);
  const [draft, setDraft] = useState<DecorationState | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  const committedRef = useRef(committed);
  const draftRef = useRef<DecorationState | null>(draft);
  const selectedRef = useRef<string | null>(selectedPlacementId);
  const armedDragRef =
    useRef<IslandDecorationPlacement | null>(
      null
    );

  useEffect(() => { committedRef.current = committed; }, [committed]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { selectedRef.current = selectedPlacementId; }, [selectedPlacementId]);

  const persist = useCallback(
    async (state: DecorationState) => {
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify(state));
    },
    [userId]
  );

  useEffect(() => {
    if (!userReady) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);
    setDraft(null);
    draftRef.current = null;
    setSelectedPlacementId(null);
    armedDragRef.current = null;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(keyFor(userId));
        const next = raw ? normalizeState(JSON.parse(raw)) : emptyState();
        if (cancelled) return;
        committedRef.current = next;
        setCommitted(next);
      } catch (error) {
        console.warn("[IslandDecorationContext] load error", error);
        if (!cancelled) {
          const fallback = emptyState();
          committedRef.current = fallback;
          setCommitted(fallback);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, userReady]);

  const active = draft ?? committed;
  const isEditing = draft !== null;

  const selectPlacement = useCallback((id: string | null) => {
    armedDragRef.current = null;
    selectedRef.current = id;
    setSelectedPlacementId(id);
  }, []);

  const startEditing = useCallback(() => {
    if (!ready) return;
    const next = cloneState(committedRef.current);
    draftRef.current = next;
    setDraft(next);
    selectPlacement(null);
  }, [ready, selectPlacement]);

  const cancelEditing = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
    selectPlacement(null);
  }, [selectPlacement]);

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
      selectPlacement(null);
      return true;
    } catch (error) {
      console.warn("[IslandDecorationContext] save error", error);
      return false;
    }
  }, [persist, selectPlacement]);

  const mutateDraft = useCallback(
    (updater: (state: DecorationState) => boolean): boolean => {
      if (!draftRef.current) return false;
      const next = cloneState(draftRef.current);
      if (!updater(next)) return false;
      next.updatedAt = Date.now();
      draftRef.current = next;
      setDraft(next);
      return true;
    },
    []
  );

  const getInventoryCount = useCallback((itemId: string) => {
    const source = draftRef.current ?? committedRef.current;
    const owned = source.ownedCounts[itemId] || 0;
    const placed = source.placements.filter((p) => p.itemId === itemId).length;
    return Math.max(0, owned - placed);
  }, []);

  const getOwnershipInfo = useCallback(
    (
      itemId: string
    ): IslandDecorationOwnershipInfo => {
      const ownedCount =
        Math.max(
          0,
          Math.floor(
            active.ownedCounts[itemId] || 0
          )
        );

      const timestamp =
        Number(
          active.firstAcquiredAt[itemId]
        );

      return {
        ownedCount,
        firstAcquiredAt:
          Number.isFinite(timestamp) &&
          timestamp > 0
            ? timestamp
            : null,
        estimated:
          Boolean(
            active.firstAcquiredAtEstimated[
              itemId
            ]
          ),
      };
    },
    [
      active.firstAcquiredAt,
      active.firstAcquiredAtEstimated,
      active.ownedCounts,
    ]
  );

  const placeFromInventory = useCallback(
    (itemId: string): string | null => {
      if (!draftRef.current || !ISLAND_DECORATION_CATALOG_BY_ID[itemId]) return null;
      if (getInventoryCount(itemId) <= 0) return null;

      const id = newPlacementId(itemId);
      const ok = mutateDraft((state) => {
        state.placements.push({
          placementId: id,
          itemId,
          transform: spawnTransform(itemId),
          placedAt: Date.now(),
          updatedAt: Date.now(),
        });
        return true;
      });

      if (!ok) return null;
      selectPlacement(id);
      return id;
    },
    [getInventoryCount, mutateDraft, selectPlacement]
  );

  const buyDecoration = useCallback(
    async (itemId: string): Promise<PurchaseResult> => {
      if (!ready || !coinsReady) return { ok: false, reason: "not_ready" };
      if (!draftRef.current) return { ok: false, reason: "not_editing" };

      const item = ISLAND_DECORATION_CATALOG_BY_ID[itemId];
      if (!item) return { ok: false, reason: "unknown_item" };
      if (islandLevel < item.unlockLevel) {
        return { ok: false, reason: "locked" };
      }
      if (coins < item.price) return { ok: false, reason: "insufficient_coins" };

      try {
        const acquiredAt = Date.now();

        await addCoins(
          -item.price,
          "island_decoration_purchase",
          { decorationId: item.id, decorationTitle: item.title, price: item.price }
        );

        const committedNext = cloneState(committedRef.current);
        committedNext.ownedCounts[itemId] =
          (committedNext.ownedCounts[itemId] || 0) + 1;

        if (!committedNext.firstAcquiredAt[itemId]) {
          committedNext.firstAcquiredAt[itemId] =
            acquiredAt;
          committedNext.firstAcquiredAtEstimated[itemId] =
            false;
        }

        committedNext.updatedAt = Date.now();

        await persist(committedNext);
        committedRef.current = committedNext;
        setCommitted(committedNext);

        const draftNext = cloneState(draftRef.current);
        draftNext.ownedCounts[itemId] =
          (draftNext.ownedCounts[itemId] || 0) + 1;

        if (!draftNext.firstAcquiredAt[itemId]) {
          draftNext.firstAcquiredAt[itemId] =
            acquiredAt;
          draftNext.firstAcquiredAtEstimated[itemId] =
            false;
        }

        draftNext.updatedAt = Date.now();

        draftRef.current = draftNext;
        setDraft(draftNext);

        return { ok: true };
      } catch (error) {
        console.warn("[IslandDecorationContext] purchase error", error);
        try {
          await addCoins(
            item.price,
            "island_decoration_purchase_refund",
            { decorationId: item.id }
          );
        } catch {}
        return { ok: false, reason: "save_failed" };
      }
    },
    [addCoins, coins, coinsReady, islandLevel, persist, ready]
  );

  const movePlacement = useCallback(
    (id: string, transform: Partial<IslandDecorationTransform>) =>
      mutateDraft((state) => {
        const p = state.placements.find((item) => item.placementId === id);
        if (!p) return false;
        p.transform = normalizeTransform(p.itemId, { ...p.transform, ...transform });
        p.updatedAt = Date.now();
        return true;
      }),
    [mutateDraft]
  );

  const rotatePlacement = useCallback(
    (id: string, rotationY: number) => movePlacement(id, { rotationY }),
    [movePlacement]
  );

  const scalePlacement = useCallback(
    (id: string, scale: number) => movePlacement(id, { scale }),
    [movePlacement]
  );

  const returnToInventory = useCallback(
    (id: string) => {
      const ok = mutateDraft((state) => {
        const index = state.placements.findIndex((p) => p.placementId === id);
        if (index < 0) return false;
        state.placements.splice(index, 1);
        return true;
      });
      if (ok && selectedRef.current === id) selectPlacement(null);
      return ok;
    },
    [mutateDraft, selectPlacement]
  );

  const moveAllToInventory = useCallback((): number => {
    let moved = 0;

    const ok = mutateDraft((state) => {
      moved = state.placements.length;
      if (moved <= 0) return false;

      state.placements = [];
      return true;
    });

    if (!ok) return 0;

    selectPlacement(null);
    return moved;
  }, [mutateDraft, selectPlacement]);

  const armDecorationDrag = useCallback((id: string) => {
    const source = draftRef.current;

    if (
      !source ||
      selectedRef.current !== id
    ) {
      return;
    }

    const placement =
      source.placements.find(
        (item) =>
          item.placementId === id
      );

    if (!placement) {
      return;
    }

    armedDragRef.current = {
      ...placement,
      transform: {
        ...placement.transform,
      },
    };
  }, []);

  const getArmedDecorationDrag =
    useCallback(
      (): IslandDecorationPlacement | null => {
        const snapshot =
          armedDragRef.current;

        return snapshot
          ? {
              ...snapshot,
              transform: {
                ...snapshot.transform,
              },
            }
          : null;
      },
      []
    );

  const clearDecorationDrag = useCallback(() => {
    armedDragRef.current = null;
  }, []);

  const value = useMemo<ContextValue>(() => ({
    ready,
    isEditing,
    catalog: ISLAND_DECORATION_CATALOG,
    placements: active.placements,
    committedPlacements: committed.placements,
    selectedPlacementId,
    selectPlacement,
    startEditing,
    cancelEditing,
    saveEditing,
    buyDecoration,
    placeFromInventory,
    movePlacement,
    rotatePlacement,
    scalePlacement,
    returnToInventory,
    moveAllToInventory,
    getInventoryCount,
    getOwnershipInfo,
    armDecorationDrag,
    getArmedDecorationDrag,
    clearDecorationDrag,
  }), [
    active.placements,
    armDecorationDrag,
    buyDecoration,
    cancelEditing,
    clearDecorationDrag,
    committed.placements,
    getArmedDecorationDrag,
    getOwnershipInfo,
    getInventoryCount,
    isEditing,
    moveAllToInventory,
    movePlacement,
    placeFromInventory,
    ready,
    returnToInventory,
    rotatePlacement,
    saveEditing,
    scalePlacement,
    selectPlacement,
    selectedPlacementId,
    startEditing,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useIslandDecorations(): ContextValue {
  const value = useContext(Context);
  if (!value) {
    throw new Error("useIslandDecorations must be used inside IslandDecorationProvider");
  }
  return value;
}
