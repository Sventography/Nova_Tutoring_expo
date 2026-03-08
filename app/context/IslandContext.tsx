// app/context/IslandContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

type IslandContextValue = {
  islandLevel: number;
  islandXp: number;
  loading: boolean;
  ready: boolean;
  addIslandXp: (
    delta: number,
    opts?: { reason?: string; meta?: Record<string, any> }
  ) => Promise<void>;
  refreshIsland: () => Promise<void>;
};

const IslandContext = createContext<IslandContextValue | undefined>(undefined);

const GUEST_LEVEL_KEY = "@nova/island.level.v1";
const GUEST_XP_KEY = "@nova/island.xp.v1";

/**
 * Simple XP curve.
 * You can tweak base/step later to make leveling faster/slower.
 */
function xpForNextLevel(level: number): number {
  const base = 150; // XP for Level 1 -> 2
  const step = 50;  // each level adds +50 XP requirement
  const lvl = Math.max(1, level);
  return base + (lvl - 1) * step;
}

export function IslandProvider({ children }: { children: ReactNode }) {
  const { user } = useUser() as any;
  const userId = user?.id as string | undefined;

  const [islandLevel, setIslandLevel] = useState<number>(1);
  const [islandXp, setIslandXp] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    loadIsland().catch((err) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn("[Island] initial load error", err);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadIsland() {
    setLoading(true);
    try {
      if (!userId) {
        // Guest mode: read from AsyncStorage
        const [lvlRaw, xpRaw] = await Promise.all([
          AsyncStorage.getItem(GUEST_LEVEL_KEY),
          AsyncStorage.getItem(GUEST_XP_KEY),
        ]);

        const lvl = lvlRaw ? parseInt(lvlRaw, 10) || 1 : 1;
        const xp = xpRaw ? parseInt(xpRaw, 10) || 0 : 0;

        setIslandLevel(lvl);
        setIslandXp(xp);
      } else {
        // Logged-in: read from Supabase profiles
        const { data, error } = await supabase
          .from("profiles")
          .select("island_level,island_xp")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn("[Island] supabase load error", error);
          }
          setIslandLevel(1);
          setIslandXp(0);
        } else if (data) {
          const lvl = (data as any).island_level ?? 1;
          const xpRaw = (data as any).island_xp ?? 0;
          const xp = Number.isFinite(Number(xpRaw)) ? Number(xpRaw) : 0;

          setIslandLevel(lvl || 1);
          setIslandXp(xp);
        } else {
          // No row found: safe defaults
          setIslandLevel(1);
          setIslandXp(0);
        }
      }
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  async function persistGuest(level: number, xp: number) {
    await Promise.all([
      AsyncStorage.setItem(GUEST_LEVEL_KEY, String(level)),
      AsyncStorage.setItem(GUEST_XP_KEY, String(xp)),
    ]);
  }

  async function persistUser(level: number, xp: number) {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        island_level: level,
        island_xp: xp,
      })
      .eq("id", userId);

    if (error && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[Island] supabase update error", error);
    }
  }

  /**
   * Add XP and handle level ups.
   * This uses the current in-memory level/xp snapshot,
   * which is totally fine for our single-device v1 flow.
   */
  async function addIslandXp(
    delta: number,
    _opts?: { reason?: string; meta?: Record<string, any> }
  ) {
    if (delta <= 0) return;

    let newLevel = islandLevel;
    let newXp = islandXp + delta;

    let needed = xpForNextLevel(newLevel);
    while (newXp >= needed) {
      newXp -= needed;
      newLevel += 1;
      needed = xpForNextLevel(newLevel);
    }

    setIslandLevel(newLevel);
    setIslandXp(newXp);

    try {
      if (!userId) {
        await persistGuest(newLevel, newXp);
      } else {
        await persistUser(newLevel, newXp);
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn("[Island] addIslandXp persist error", err);
      }
    }
  }

  async function refreshIsland() {
    await loadIsland();
  }

  const value: IslandContextValue = {
    islandLevel,
    islandXp,
    loading,
    ready,
    addIslandXp,
    refreshIsland,
  };

  return (
    <IslandContext.Provider value={value}>
      {children}
    </IslandContext.Provider>
  );
}

export function useIsland(): IslandContextValue {
  const ctx = useContext(IslandContext);
  if (!ctx) {
    throw new Error("useIsland() must be used inside <IslandProvider>");
  }
  return ctx;
}
