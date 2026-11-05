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
  isIslandDecorationCoinShopItem,
  type IslandDecorationCatalogItem,
} from "../_lib/islandDecorationCatalog";
import { clampIslandBuildPosition } from "../_lib/islandBuilderBounds";
import { COLLECTOR_REWARD_ID, fetchCollectorEntitlements } from "../_lib/collectorClient";
import {
  COLLECTOR_CASTLE_PREFERRED_GROUND,
  NOVA_PEDESTAL_GROUND_OBSTACLE,
  decorationGroundRadius,
  findNearestFreeGround,
  landmarkGroundRadius,
  type GroundObstacle,
} from "../_lib/islandAutoPlacement";
import { useCoins } from "./CoinsContext";
import { useIslandBuilder } from "./IslandBuilderContext";
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
  placements: IslandDecorationPlacement[];
  updatedAt: number;
};

type PurchaseResult = {
  ok: boolean;
  placementId?: string;
  reason?: "not_ready" | "not_editing" | "unknown_item" | "not_for_sale" | "insufficient_coins" | "save_failed";
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
  refreshCollectorOwnership: () => Promise<boolean>;
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
  placements: [],
  updatedAt: Date.now(),
});

const cloneState = (state: DecorationState): DecorationState => ({
  version: 1,
  ownedCounts: { ...state.ownedCounts },
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

  return {
    version: 1,
    ownedCounts,
    placements,
    updatedAt: Number(value.updatedAt) || Date.now(),
  };
}

function spawnTransform(itemId: string): IslandDecorationTransform {
  if (itemId === COLLECTOR_REWARD_ID) {
    return normalizeTransform(itemId, { ...COLLECTOR_CASTLE_PREFERRED_GROUND, rotationY: 0 });
  }
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.2 + Math.random() * 4.2;

  return normalizeTransform(itemId, {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    rotationY: Math.random() * Math.PI * 2,
  });
}

// Local snapshots remember a layout, never the right to own this unique reward.
// Apply to the latest committed and draft snapshots independently so an ownership
// refresh cannot roll back an in-progress island edit.
function reconcileCollectorReward(state: DecorationState, owned: boolean): DecorationState {
  const castlePlacements = state.placements.filter((p) => p.itemId === COLLECTOR_REWARD_ID);
  if ((state.ownedCounts[COLLECTOR_REWARD_ID] || 0) === (owned ? 1 : 0) &&
      castlePlacements.length <= (owned ? 1 : 0)) return state;
  const next = cloneState(state);
  if (owned) next.ownedCounts[COLLECTOR_REWARD_ID] = 1;
  else delete next.ownedCounts[COLLECTOR_REWARD_ID];
  let keptCastle = false;
  next.placements = next.placements.filter((p) => {
    if (p.itemId !== COLLECTOR_REWARD_ID) return true;
    if (!owned || keptCastle) return false;
    keptCastle = true;
    return true;
  });
  next.updatedAt = Date.now();
  return next;
}

export function IslandDecorationProvider({ children }: { children: ReactNode }) {
  const {
    supabaseUserId,
    ready: userReady,
    session,
  } = (useUser() || {}) as any;
  const userId = supabaseUserId ? String(supabaseUserId) : null;
  const { coins, ready: coinsReady, addCoins } = useCoins();
  const islandBuilder = useIslandBuilder();
  const landmarkObstaclesRef = useRef<GroundObstacle[]>([]);
  landmarkObstaclesRef.current = [
    NOVA_PEDESTAL_GROUND_OBSTACLE,
    ...islandBuilder.placements.map((p) => ({
      x: p.transform.x,
      z: p.transform.z,
      radius: landmarkGroundRadius(p.itemId, p.transform.scale),
    })),
  ];

  const [stateReady, setReady] = useState(false);
  const loadedAccountRef = useRef<string | null | undefined>(undefined);
  const accessToken = userId && session?.user?.id === userId
    ? session.access_token || null
    : null;
  const authRef = useRef({ userId, accessToken, userReady });
  authRef.current = { userId, accessToken, userReady };
  const [confirmedCollectorSession, setConfirmedCollectorSession] = useState<{
    userId: string;
    accessToken: string;
  } | null>(null);
  const ownershipRequestRef = useRef(0);
  const persistTailRef = useRef<Promise<void>>(Promise.resolve());
  const ready = stateReady && userReady && loadedAccountRef.current === userId;
  const collectorIsVerified = ready && !!userId && !!accessToken &&
    confirmedCollectorSession?.userId === userId &&
    confirmedCollectorSession?.accessToken === accessToken;
  const collectorVerifiedRef = useRef(collectorIsVerified);
  collectorVerifiedRef.current = collectorIsVerified;
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
    (state: DecorationState) => {
      const serialized = JSON.stringify(state);
      // Serialize writes so an ownership response cannot overwrite a later SAVE.
      // The key is captured before queuing; an account switch cannot redirect it.
      const write = persistTailRef.current.catch(() => {}).then(() =>
        AsyncStorage.setItem(keyFor(userId), serialized)
      );
      persistTailRef.current = write;
      return write;
    },
    [userId]
  );

  useEffect(() => {
    ownershipRequestRef.current += 1;
    loadedAccountRef.current = undefined;
    setConfirmedCollectorSession(null);
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
        loadedAccountRef.current = userId;
        setCommitted(next);
      } catch (error) {
        console.warn("[IslandDecorationContext] load error", error);
        if (!cancelled) {
          const fallback = emptyState();
          committedRef.current = fallback;
          loadedAccountRef.current = userId;
          setCommitted(fallback);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, userReady]);

  const refreshCollectorOwnership = useCallback(async (): Promise<boolean> => {
    const request = ++ownershipRequestRef.current;
    const stillCurrent = () => request === ownershipRequestRef.current &&
      authRef.current.userReady && authRef.current.userId === userId &&
      authRef.current.accessToken === accessToken && loadedAccountRef.current === userId;
    if (!ready || !userId || !accessToken || !stillCurrent()) return false;
    try {
      const entitlements = await fetchCollectorEntitlements(accessToken);
      if (!stillCurrent()) return false;
      const owned = entitlements.some((item) => item.reward_id === COLLECTOR_REWARD_ID);
      const previous = committedRef.current;
      const next = reconcileCollectorReward(previous, owned);
      const nextDraft = draftRef.current ? reconcileCollectorReward(draftRef.current, owned) : null;
      // Publish without awaiting storage: edits made while the request was in
      // flight are already in these refs, and later edits remain independent.
      committedRef.current = next;
      setCommitted(next);
      if (nextDraft) {
        draftRef.current = nextDraft;
        setDraft(nextDraft);
      }
      collectorVerifiedRef.current = owned;
      setConfirmedCollectorSession(owned ? { userId, accessToken } : null);
      if (!owned) armedDragRef.current = null;
      if (next !== previous) {
        void persist(next).catch((error) =>
          console.warn("[IslandDecorationContext] collector cache save error", error)
        );
      }
      return owned;
    } catch (error) {
      if (!stillCurrent()) return false;
      // Preserve the owner's cached placement during an outage, but hide it
      // until this same signed-in session receives server confirmation again.
      collectorVerifiedRef.current = false;
      setConfirmedCollectorSession(null);
      armedDragRef.current = null;
      console.warn("[IslandDecorationContext] collector ownership unavailable", error);
      return false;
    }
  }, [accessToken, persist, ready, userId]);

  useEffect(() => {
    if (ready) void refreshCollectorOwnership();
  }, [ready, refreshCollectorOwnership]);

  const active = draft ?? committed;
  const isEditing = ready && draft !== null;
  const visiblePlacements = useMemo(() => ready
    ? active.placements.filter((p) => collectorIsVerified || p.itemId !== COLLECTOR_REWARD_ID)
    : [], [active.placements, collectorIsVerified, ready]);
  const visibleCommittedPlacements = useMemo(() => ready
    ? committed.placements.filter((p) => collectorIsVerified || p.itemId !== COLLECTOR_REWARD_ID)
    : [], [committed.placements, collectorIsVerified, ready]);
  const collectorCastle = collectorIsVerified
    ? active.placements.find((p) => p.itemId === COLLECTOR_REWARD_ID)
    : undefined;
  const castleX = collectorCastle?.transform.x;
  const castleZ = collectorCastle?.transform.z;
  const castleScale = collectorCastle?.transform.scale;
  const setCollectorCastleObstacle = islandBuilder.setCollectorCastleObstacle;
  useEffect(() => {
    setCollectorCastleObstacle(
      castleX !== undefined && castleZ !== undefined && castleScale !== undefined
        ? { x: castleX, z: castleZ, radius: decorationGroundRadius(COLLECTOR_REWARD_ID, castleScale) }
        : null
    );
    return () => setCollectorCastleObstacle(null);
  }, [castleX, castleZ, castleScale, setCollectorCastleObstacle]);

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
    if (!ready || !draftRef.current) return false;
    const savingAccount = userId;
    const savingDraft = draftRef.current;
    const saved = cloneState(draftRef.current);
    saved.updatedAt = Date.now();

    try {
      await persist(saved);
      if (authRef.current.userId !== savingAccount || loadedAccountRef.current !== savingAccount) return false;
      // A refresh or a newer edit may have reconciled the draft while storage
      // was busy. Keep that draft open instead of replacing it with this copy.
      if (draftRef.current !== savingDraft) return false;
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
  }, [persist, ready, selectPlacement, userId]);

  const mutateDraft = useCallback(
    (updater: (state: DecorationState) => boolean): boolean => {
      if (!draftRef.current || !authRef.current.userReady ||
          loadedAccountRef.current !== authRef.current.userId) return false;
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
    if (!ready || (itemId === COLLECTOR_REWARD_ID && !collectorVerifiedRef.current)) return 0;
    const source = draftRef.current ?? committedRef.current;
    const owned = source.ownedCounts[itemId] || 0;
    const placed = source.placements.filter((p) => p.itemId === itemId).length;
    return Math.max(0, owned - placed);
  }, [ready, collectorIsVerified]);

  const placeFromInventory = useCallback(
    (itemId: string): string | null => {
      if (!draftRef.current || !ISLAND_DECORATION_CATALOG_BY_ID[itemId]) return null;
      if (getInventoryCount(itemId) <= 0) return null;

      const id = newPlacementId(itemId);
      const ok = mutateDraft((state) => {
        const preferred = spawnTransform(itemId);
        const castle = state.placements.find((p) => p.itemId === COLLECTOR_REWARD_ID);
        let transform = preferred;
        if (itemId === COLLECTOR_REWARD_ID || (castle && collectorVerifiedRef.current)) {
          const obstacles = itemId === COLLECTOR_REWARD_ID
            ? [
                ...landmarkObstaclesRef.current,
                ...state.placements.map((p) => ({
                  x: p.transform.x, z: p.transform.z,
                  radius: decorationGroundRadius(p.itemId, p.transform.scale),
                })),
              ]
            : [{ ...castle!.transform, radius: decorationGroundRadius(castle!.itemId, castle!.transform.scale) }];
          const free = findNearestFreeGround(preferred, decorationGroundRadius(itemId, preferred.scale), obstacles);
          if (!free) return false;
          transform = { ...preferred, ...free };
        }
        state.placements.push({
          placementId: id,
          itemId,
          transform,
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
      if (itemId === COLLECTOR_REWARD_ID || !isIslandDecorationCoinShopItem(item)) {
        return { ok: false, reason: "not_for_sale" };
      }
      if (coins < item.price) return { ok: false, reason: "insufficient_coins" };

      try {
        await addCoins(
          -item.price,
          "island_decoration_purchase",
          { decorationId: item.id, decorationTitle: item.title, price: item.price }
        );

        const committedNext = cloneState(committedRef.current);
        committedNext.ownedCounts[itemId] =
          (committedNext.ownedCounts[itemId] || 0) + 1;
        committedNext.updatedAt = Date.now();

        await persist(committedNext);
        committedRef.current = committedNext;
        setCommitted(committedNext);

        const draftNext = cloneState(draftRef.current);
        draftNext.ownedCounts[itemId] =
          (draftNext.ownedCounts[itemId] || 0) + 1;
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
    [addCoins, coins, coinsReady, persist, ready]
  );

  const movePlacement = useCallback(
    (id: string, transform: Partial<IslandDecorationTransform>) =>
      mutateDraft((state) => {
        const p = state.placements.find((item) => item.placementId === id);
        if (!p) return false;
        if (p.itemId === COLLECTOR_REWARD_ID && !collectorVerifiedRef.current) return false;
        const next = normalizeTransform(p.itemId, { ...p.transform, ...transform });
        const castle = state.placements.find((item) => item.itemId === COLLECTOR_REWARD_ID && item.placementId !== id);
        if (p.itemId === COLLECTOR_REWARD_ID || (castle && collectorVerifiedRef.current)) {
          const obstacles = p.itemId === COLLECTOR_REWARD_ID
            ? [
                ...landmarkObstaclesRef.current,
                ...state.placements.filter((item) => item.placementId !== id).map((item) => ({
                  x: item.transform.x, z: item.transform.z,
                  radius: decorationGroundRadius(item.itemId, item.transform.scale),
                })),
              ]
            : [{ ...castle!.transform, radius: decorationGroundRadius(castle!.itemId, castle!.transform.scale) }];
          const free = findNearestFreeGround(next, decorationGroundRadius(p.itemId, next.scale), obstacles);
          if (!free) return false;
          next.x = free.x;
          next.z = free.z;
        }
        p.transform = next;
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
      const hiddenCastle = !collectorVerifiedRef.current
        ? state.placements.filter((p) => p.itemId === COLLECTOR_REWARD_ID)
        : [];
      moved = state.placements.length - hiddenCastle.length;
      if (moved <= 0) return false;

      state.placements = hiddenCastle;
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

    if (!placement || (placement.itemId === COLLECTOR_REWARD_ID && !collectorVerifiedRef.current)) {
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

        if (snapshot?.itemId === COLLECTOR_REWARD_ID && !collectorVerifiedRef.current) return null;

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
    placements: visiblePlacements,
    committedPlacements: visibleCommittedPlacements,
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
    refreshCollectorOwnership,
    armDecorationDrag,
    getArmedDecorationDrag,
    clearDecorationDrag,
  }), [
    visiblePlacements,
    armDecorationDrag,
    buyDecoration,
    cancelEditing,
    clearDecorationDrag,
    visibleCommittedPlacements,
    getArmedDecorationDrag,
    getInventoryCount,
    refreshCollectorOwnership,
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
