// app/context/CompanionContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { usePurchases } from "./PurchasesContext";
import { canonId } from "../_lib/canonId";
import { COMPANIONS, type CompanionItem } from "../_lib/companionsCatalog";

type CompanionContextValue = {
  /** Canonical ID of the currently active companion, e.g. "companion:nova_bunny" */
  activeCompanionId: string | null;
  /** Full companion object for the active companion (or null) */
  activeCompanion: CompanionItem | null;
  /** All owned companion canonical IDs (derived from PurchasesContext) */
  ownedCompanions: string[];
  /** Equip a companion by id (must be one of your catalog IDs) */
  equipCompanion: (id: string) => Promise<void>;
  /** Unequip any active companion */
  clearCompanion: () => Promise<void>;
  /** Hard reload from storage (rarely needed) */
  reload: () => Promise<void>;
  /** Whether we've finished hydrating from storage */
  ready: boolean;
  /** Convenience helper: is this id the currently active one? */
  isActive: (id: string | null | undefined) => boolean;
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

// New canonical base key for per-user active companion
const BASE_KEY = "@nova/companion.active";

// Legacy key prefix for backward-compatibility
const LEGACY_BASE_KEY = "@nova/active-companion";

function storageKey(userId: string | null): string {
  // Per-user active companion, fallback to a guest key
  return userId ? `${BASE_KEY}/${userId}` : `${BASE_KEY}/guest`;
}

function legacyStorageKey(userId: string | null): string {
  return userId ? `${LEGACY_BASE_KEY}/${userId}` : `${LEGACY_BASE_KEY}/guest`;
}

type CompanionProviderProps = {
  children: ReactNode;
};

export const CompanionProvider: React.FC<CompanionProviderProps> = ({
  children,
}) => {
  const { supabaseUserId } = useUser();
  const { purchases } = usePurchases();

  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(
    null
  );
  const [ready, setReady] = useState(false);

  const key = useMemo(
    () => storageKey(supabaseUserId ?? null),
    [supabaseUserId]
  );
  const legacyKey = useMemo(
    () => legacyStorageKey(supabaseUserId ?? null),
    [supabaseUserId]
  );

  const loadFromStorage = useCallback(async () => {
    try {
      // Prefer the new key, but fall back to the legacy one if needed
      let raw = await AsyncStorage.getItem(key);

      if (!raw) {
        raw = await AsyncStorage.getItem(legacyKey);
      }

      if (raw) {
        const cid = canonId(raw);
        setActiveCompanionId(cid);
        console.log(
          "[CompanionContext] loaded active companion from storage:",
          cid
        );
      } else {
        setActiveCompanionId(null);
        console.log(
          "[CompanionContext] no active companion stored for this user"
        );
      }
    } catch (err) {
      console.warn("[CompanionContext] Failed to load active companion", err);
      setActiveCompanionId(null);
    } finally {
      setReady(true);
    }
  }, [key, legacyKey]);

  useEffect(() => {
    setReady(false);
    setActiveCompanionId(null);
    loadFromStorage();
  }, [key, loadFromStorage]);

  const persist = useCallback(
    async (id: string | null) => {
      try {
        if (id) {
          await AsyncStorage.setItem(key, id);
        } else {
          await AsyncStorage.removeItem(key);
        }
      } catch (err) {
        console.warn(
          "[CompanionContext] Failed to persist active companion",
          err
        );
      }
    },
    [key]
  );

  const equipCompanion = useCallback(
    async (id: string) => {
      const cid = canonId(id);
      setActiveCompanionId(cid);
      await persist(cid);
      console.log("[CompanionContext] equipped companion:", cid);
    },
    [persist]
  );

  const clearCompanion = useCallback(async () => {
    setActiveCompanionId(null);
    await persist(null);
    console.log("[CompanionContext] cleared active companion");
  }, [persist]);

  const reload = useCallback(async () => {
    setReady(false);
    await loadFromStorage();
  }, [loadFromStorage]);

  // Derive owned companions from purchases map.
  // Convention: all companion IDs start with "companion:" after canonId.
  const ownedCompanions = useMemo(() => {
    const ids = Object.keys(purchases || {});
    const out = new Set<string>();
    for (const raw of ids) {
      const cid = canonId(raw);
      if (cid.startsWith("companion:")) {
        out.add(cid);
      }
    }
    return Array.from(out);
  }, [purchases]);

  const activeCompanion: CompanionItem | null = useMemo(() => {
    if (!activeCompanionId) return null;
    const cid = canonId(activeCompanionId);
    const found =
      COMPANIONS.find((c) => c.canonId === cid || c.id === activeCompanionId) ??
      null;
    return found;
  }, [activeCompanionId]);

  const isActive = useCallback(
    (id: string | null | undefined): boolean => {
      if (!id || !activeCompanionId) return false;
      return canonId(id) === canonId(activeCompanionId);
    },
    [activeCompanionId]
  );

  const value: CompanionContextValue = useMemo(
    () => ({
      ready,
      activeCompanionId: activeCompanionId ? canonId(activeCompanionId) : null,
      activeCompanion,
      ownedCompanions,
      equipCompanion,
      clearCompanion,
      reload,
      isActive,
    }),
    [
      ready,
      activeCompanionId,
      activeCompanion,
      ownedCompanions,
      equipCompanion,
      clearCompanion,
      reload,
      isActive,
    ]
  );

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
};

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    throw new Error("useCompanion must be used inside <CompanionProvider>");
  }
  return ctx;
}