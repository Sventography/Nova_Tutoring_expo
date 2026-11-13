// app/context/IslandKeepsakeContext.tsx
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

import { clampIslandBuildPosition } from "../_lib/islandBuilderBounds";
import { useUser } from "./UserContext";

export type IslandKeepsakeTransform = {
  x: number;
  z: number;
  rotationY: number;
  scale: number;
};

export type RegisteredIslandKeepsake = {
  key: string;
  title: string;
  accent: string;
  defaultTransform: IslandKeepsakeTransform;
};

export type IslandKeepsakePlacement = {
  key: string;
  transform: IslandKeepsakeTransform;
  placed: boolean;
  updatedAt: number;
};

type PersistedState = {
  version: 1;
  entries: Record<string, IslandKeepsakePlacement>;
  updatedAt: number;
};

export type ActiveIslandKeepsake = RegisteredIslandKeepsake &
  IslandKeepsakePlacement;

type ContextValue = {
  ready: boolean;
  isEditing: boolean;
  selectedKeepsakeKey: string | null;
  selectedKeepsake: ActiveIslandKeepsake | null;
  placedKeepsakes: ActiveIslandKeepsake[];
  inventoryKeepsakes: ActiveIslandKeepsake[];
  registerKeepsake: (item: RegisteredIslandKeepsake) => void;
  getPlacement: (key: string) => IslandKeepsakePlacement | null;
  selectKeepsake: (key: string | null) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<boolean>;
  moveKeepsake: (
    key: string,
    transform: Partial<IslandKeepsakeTransform>
  ) => boolean;
  rotateKeepsake: (key: string, rotationY: number) => boolean;
  scaleKeepsake: (key: string, scale: number) => boolean;
  returnToInventory: (key: string) => boolean;
  placeFromInventory: (key: string) => boolean;
  armKeepsakeDrag: (key: string) => void;
  getArmedKeepsakeDrag: () => ActiveIslandKeepsake | null;
  clearKeepsakeDrag: () => void;
};

const Context = createContext<ContextValue | undefined>(undefined);
const STATE_PREFIX = "@island/keepsakes/state.v1";

const keyFor = (userId: string | null) =>
  `${STATE_PREFIX}:${userId || "guest"}`;

const emptyState = (): PersistedState => ({
  version: 1,
  entries: {},
  updatedAt: Date.now(),
});

const cloneState = (state: PersistedState): PersistedState => ({
  version: 1,
  entries: Object.fromEntries(
    Object.entries(state.entries).map(([key, entry]) => [
      key,
      {
        ...entry,
        transform: { ...entry.transform },
      },
    ])
  ),
  updatedAt: state.updatedAt,
});

function normalizeRotation(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const full = Math.PI * 2;
  const wrapped = n % full;
  return wrapped < 0 ? wrapped + full : wrapped;
}

function normalizeTransform(
  transform: Partial<IslandKeepsakeTransform> | undefined,
  fallback: IslandKeepsakeTransform
): IslandKeepsakeTransform {
  const scaleRaw = Number(transform?.scale ?? fallback.scale);
  const scale = Math.max(
    0.5,
    Math.min(4, Number.isFinite(scaleRaw) ? scaleRaw : fallback.scale)
  );

  const xRaw = Number(transform?.x ?? fallback.x);
  const zRaw = Number(transform?.z ?? fallback.z);
  const x = Number.isFinite(xRaw) ? xRaw : fallback.x;
  const z = Number.isFinite(zRaw) ? zRaw : fallback.z;
  const clamped = clampIslandBuildPosition(x, z, scale);

  return {
    x: clamped.x,
    z: clamped.z,
    rotationY: normalizeRotation(
      transform?.rotationY ?? fallback.rotationY
    ),
    scale,
  };
}

function normalizeStoredState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== "object") return emptyState();

  const value = raw as Partial<PersistedState>;
  const entries: Record<string, IslandKeepsakePlacement> = {};

  if (value.entries && typeof value.entries === "object") {
    for (const [key, rawEntry] of Object.entries(value.entries)) {
      if (!rawEntry || typeof rawEntry !== "object") continue;
      const entry = rawEntry as Partial<IslandKeepsakePlacement>;
      const fallback: IslandKeepsakeTransform = {
        x: 0,
        z: 0,
        rotationY: 0,
        scale: 1,
      };

      entries[key] = {
        key,
        transform: normalizeTransform(entry.transform, fallback),
        placed: entry.placed !== false,
        updatedAt: Number(entry.updatedAt) || Date.now(),
      };
    }
  }

  return {
    version: 1,
    entries,
    updatedAt: Number(value.updatedAt) || Date.now(),
  };
}

export function IslandKeepsakeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    supabaseUserId,
    ready: userReady,
  } = (useUser() || {}) as any;
  const userId = supabaseUserId ? String(supabaseUserId) : null;

  const [ready, setReady] = useState(false);
  const [registry, setRegistry] = useState<
    Record<string, RegisteredIslandKeepsake>
  >({});
  const [committed, setCommitted] = useState<PersistedState>(emptyState);
  const [draft, setDraft] = useState<PersistedState | null>(null);
  const [selectedKeepsakeKey, setSelectedKeepsakeKey] =
    useState<string | null>(null);

  const committedRef = useRef(committed);
  const draftRef = useRef<PersistedState | null>(draft);
  const selectedRef = useRef<string | null>(selectedKeepsakeKey);
  const armedDragRef =
    useRef<ActiveIslandKeepsake | null>(
      null
    );

  useEffect(() => {
    committedRef.current = committed;
  }, [committed]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    selectedRef.current = selectedKeepsakeKey;
  }, [selectedKeepsakeKey]);

  const persist = useCallback(
    async (state: PersistedState) => {
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
    setSelectedKeepsakeKey(null);
    armedDragRef.current = null;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(keyFor(userId));
        const next = raw ? normalizeStoredState(JSON.parse(raw)) : emptyState();
        if (cancelled) return;
        committedRef.current = next;
        setCommitted(next);
      } catch (error) {
        console.warn("[IslandKeepsakeContext] load error", error);
        if (!cancelled) {
          const fallback = emptyState();
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
  }, [userId, userReady]);

  const registerKeepsake = useCallback(
    (item: RegisteredIslandKeepsake) => {
      setRegistry((current) => {
        const existing = current[item.key];
        if (
          existing &&
          existing.title === item.title &&
          existing.accent === item.accent &&
          existing.defaultTransform.x === item.defaultTransform.x &&
          existing.defaultTransform.z === item.defaultTransform.z
        ) {
          return current;
        }

        return {
          ...current,
          [item.key]: {
            ...item,
            defaultTransform: { ...item.defaultTransform },
          },
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!ready) return;

    let committedChanged = false;
    const nextCommitted = cloneState(committedRef.current);

    for (const item of Object.values(registry)) {
      if (nextCommitted.entries[item.key]) continue;

      nextCommitted.entries[item.key] = {
        key: item.key,
        transform: normalizeTransform(
          item.defaultTransform,
          item.defaultTransform
        ),
        placed: true,
        updatedAt: Date.now(),
      };
      committedChanged = true;
    }

    if (committedChanged) {
      nextCommitted.updatedAt = Date.now();
      committedRef.current = nextCommitted;
      setCommitted(nextCommitted);
      void persist(nextCommitted).catch((error) =>
        console.warn("[IslandKeepsakeContext] register save error", error)
      );
    }

    if (draftRef.current) {
      let draftChanged = false;
      const nextDraft = cloneState(draftRef.current);

      for (const item of Object.values(registry)) {
        if (nextDraft.entries[item.key]) continue;

        nextDraft.entries[item.key] = {
          key: item.key,
          transform: normalizeTransform(
            item.defaultTransform,
            item.defaultTransform
          ),
          placed: true,
          updatedAt: Date.now(),
        };
        draftChanged = true;
      }

      if (draftChanged) {
        nextDraft.updatedAt = Date.now();
        draftRef.current = nextDraft;
        setDraft(nextDraft);
      }
    }
  }, [persist, ready, registry]);

  const active = draft ?? committed;
  const isEditing = draft !== null;

  const selectKeepsake = useCallback((key: string | null) => {
    armedDragRef.current = null;
    selectedRef.current = key;
    setSelectedKeepsakeKey(key);
  }, []);

  const startEditing = useCallback(() => {
    if (!ready) return;
    const next = cloneState(committedRef.current);
    draftRef.current = next;
    setDraft(next);
    selectKeepsake(null);
  }, [ready, selectKeepsake]);

  const cancelEditing = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
    selectKeepsake(null);
  }, [selectKeepsake]);

  const saveEditing = useCallback(async () => {
    if (!draftRef.current) return true;

    const saved = cloneState(draftRef.current);
    saved.updatedAt = Date.now();

    try {
      await persist(saved);
      committedRef.current = saved;
      draftRef.current = null;
      setCommitted(saved);
      setDraft(null);
      selectKeepsake(null);
      return true;
    } catch (error) {
      console.warn("[IslandKeepsakeContext] save error", error);
      return false;
    }
  }, [persist, selectKeepsake]);

  const mutateDraft = useCallback(
    (updater: (state: PersistedState) => boolean): boolean => {
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

  const getPlacement = useCallback(
    (key: string): IslandKeepsakePlacement | null => {
      const entry = active.entries[key];
      return entry
        ? {
            ...entry,
            transform: { ...entry.transform },
          }
        : null;
    },
    [active.entries]
  );

  const moveKeepsake = useCallback(
    (
      key: string,
      transform: Partial<IslandKeepsakeTransform>
    ): boolean =>
      mutateDraft((state) => {
        const entry = state.entries[key];
        const item = registry[key];
        if (!entry || !item || !entry.placed) return false;

        entry.transform = normalizeTransform(
          { ...entry.transform, ...transform },
          item.defaultTransform
        );
        entry.updatedAt = Date.now();
        return true;
      }),
    [mutateDraft, registry]
  );

  const rotateKeepsake = useCallback(
    (key: string, rotationY: number) =>
      moveKeepsake(key, { rotationY }),
    [moveKeepsake]
  );

  const scaleKeepsake = useCallback(
    (key: string, scale: number) =>
      moveKeepsake(key, { scale }),
    [moveKeepsake]
  );

  const returnToInventory = useCallback(
    (key: string): boolean => {
      const changed = mutateDraft((state) => {
        const entry = state.entries[key];
        if (!entry || !entry.placed) return false;
        entry.placed = false;
        entry.updatedAt = Date.now();
        return true;
      });

      if (changed && selectedRef.current === key) {
        selectKeepsake(null);
      }

      return changed;
    },
    [mutateDraft, selectKeepsake]
  );

  const placeFromInventory = useCallback(
    (key: string): boolean => {
      const changed = mutateDraft((state) => {
        const entry = state.entries[key];
        if (!entry || entry.placed) return false;
        entry.placed = true;

        // Put returned keepsakes somewhere obvious instead of making the
        // player hunt for them.
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.4 + Math.random() * 3.4;
        entry.transform = normalizeTransform(
          {
            ...entry.transform,
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius,
          },
          registry[key]?.defaultTransform ?? entry.transform
        );
        entry.updatedAt = Date.now();
        return true;
      });

      if (changed) {
        selectKeepsake(key);
      }

      return changed;
    },
    [mutateDraft, registry, selectKeepsake]
  );

  const armKeepsakeDrag = useCallback((key: string) => {
    const source = draftRef.current;
    const item = registry[key];
    const entry =
      source?.entries[key];

    if (
      !source ||
      !item ||
      !entry ||
      !entry.placed ||
      selectedRef.current !== key
    ) {
      return;
    }

    armedDragRef.current = {
      ...item,
      ...entry,
      defaultTransform: {
        ...item.defaultTransform,
      },
      transform: {
        ...entry.transform,
      },
    };
  }, [registry]);

  const getArmedKeepsakeDrag =
    useCallback(
      (): ActiveIslandKeepsake | null => {
        const snapshot =
          armedDragRef.current;

        return snapshot
          ? {
              ...snapshot,
              defaultTransform: {
                ...snapshot.defaultTransform,
              },
              transform: {
                ...snapshot.transform,
              },
            }
          : null;
      },
      []
    );

  const clearKeepsakeDrag = useCallback(() => {
    armedDragRef.current = null;
  }, []);

  const combined = useMemo(
    () =>
      Object.values(registry).flatMap((item) => {
        const entry = active.entries[item.key];
        if (!entry) return [];
        return [
          {
            ...item,
            ...entry,
            defaultTransform: { ...item.defaultTransform },
            transform: { ...entry.transform },
          },
        ];
      }),
    [active.entries, registry]
  );

  const placedKeepsakes = useMemo(
    () => combined.filter((item) => item.placed),
    [combined]
  );

  const inventoryKeepsakes = useMemo(
    () => combined.filter((item) => !item.placed),
    [combined]
  );

  const selectedKeepsake = useMemo(
    () =>
      selectedKeepsakeKey
        ? combined.find((item) => item.key === selectedKeepsakeKey) ?? null
        : null,
    [combined, selectedKeepsakeKey]
  );

  const value = useMemo<ContextValue>(
    () => ({
      ready,
      isEditing,
      selectedKeepsakeKey,
      selectedKeepsake,
      placedKeepsakes,
      inventoryKeepsakes,
      registerKeepsake,
      getPlacement,
      selectKeepsake,
      startEditing,
      cancelEditing,
      saveEditing,
      moveKeepsake,
      rotateKeepsake,
      scaleKeepsake,
      returnToInventory,
      placeFromInventory,
      armKeepsakeDrag,
      getArmedKeepsakeDrag,
      clearKeepsakeDrag,
    }),
    [
      armKeepsakeDrag,
      cancelEditing,
      clearKeepsakeDrag,
      getArmedKeepsakeDrag,
      getPlacement,
      inventoryKeepsakes,
      isEditing,
      moveKeepsake,
      placeFromInventory,
      placedKeepsakes,
      ready,
      registerKeepsake,
      returnToInventory,
      rotateKeepsake,
      saveEditing,
      scaleKeepsake,
      selectKeepsake,
      selectedKeepsake,
      selectedKeepsakeKey,
      startEditing,
    ]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useIslandKeepsakes(): ContextValue {
  const value = useContext(Context);
  if (!value) {
    throw new Error(
      "useIslandKeepsakes must be used inside IslandKeepsakeProvider"
    );
  }
  return value;
}
