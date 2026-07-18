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
  xp: number;
  level: number;
  xpToNext: number;
  collapsed: boolean;
  positionY: number;
  loading: boolean;
  lastGain: number;
  addIslandXp: (
    delta: number,
    reason?: string,
    meta?: Record<string, any>
  ) => Promise<void>;
  setCollapsed: (next: boolean) => Promise<void>;
  setPositionY: (y: number) => Promise<void>;
  refreshIsland: () => Promise<void>;
  /** Give +5 XP once per calendar day per user (used by Home screen). */
  grantDailyLoginXpIfNeeded: () => Promise<void>;
};

const IslandContext = createContext<IslandContextValue | undefined>(undefined);

const STATE_KEY = "@island/state.v1";
const POS_KEY = "@island/xpbar/posY.v1";
const COLLAPSED_KEY = "@island/xpbar/collapsed.v1";
/** Tracks the last day we granted daily-login XP, per user. */
const DAILY_XP_KEY = "@island/daily_login_xp_date.v1";

// Simple leveling curve: each level needs a bit more XP
function xpNeededForLevel(level: number): number {
  if (level <= 1) return 40;
  return 40 + (level - 1) * 20;
}

type PersistedState = {
  xp: number;
  level: number;
};

export function IslandProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId } = (useUser() || {}) as any;

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [collapsed, setCollapsedState] = useState(false);
  const [positionY, setPositionYState] = useState(140); // distance from top
  const [loading, setLoading] = useState(true);
  const [lastGain, setLastGain] = useState(0);

  const xpToNext = xpNeededForLevel(level);

  // ----------------------------------------
  // Load UI-only bits (position + collapsed)
  // ----------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const [posStr, colStr] = await Promise.all([
          AsyncStorage.getItem(POS_KEY),
          AsyncStorage.getItem(COLLAPSED_KEY),
        ]);
        if (posStr) {
          const y = parseFloat(posStr);
          if (!Number.isNaN(y)) setPositionYState(y);
        }
        if (colStr === "true") setCollapsedState(true);
      } catch {
        // ignore
      }
    })();
  }, []);

  // ----------------------------------------
  // Load XP + level from Supabase or local
  // ----------------------------------------
  const refreshIsland = async () => {
    setLoading(true);
    try {
      if (supabaseUserId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("island_xp,island_level")
          .eq("id", supabaseUserId)
          .maybeSingle();

        if (!error && data) {
          setXp(data.island_xp ?? 0);
          setLevel(data.island_level ?? 1);
          setLoading(false);
          return;
        }
      }

      // Guest / fallback: read from AsyncStorage
      const raw = await AsyncStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        setXp(typeof parsed.xp === "number" ? parsed.xp : 0);
        setLevel(typeof parsed.level === "number" ? parsed.level : 1);
      } else {
        setXp(0);
        setLevel(1);
      }
    } catch (e) {
      console.warn("[IslandContext] refreshIsland error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshIsland();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUserId]);

  // ----------------------------------------
  // Persistence helpers
  // ----------------------------------------
  const persistLocalState = async (nextXp: number, nextLevel: number) => {
    try {
      const payload: PersistedState = { xp: nextXp, level: nextLevel };
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch {}
  };

  const persistSupabaseState = async (nextXp: number, nextLevel: number) => {
    if (!supabaseUserId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          island_xp: nextXp,
          island_level: nextLevel,
        })
        .eq("id", supabaseUserId);
      if (error) {
        console.warn("[IslandContext] Supabase island update error", error);
      }
    } catch (e) {
      console.warn("[IslandContext] Supabase island update exception", e);
    }
  };

  // ----------------------------------------
  // Public actions
  // ----------------------------------------
  const addIslandXp: IslandContextValue["addIslandXp"] = async (
    delta,
    _reason,
    _meta
  ) => {
    if (!delta || delta <= 0) return;

    // record the most recent gain for the +XP!! pill
    setLastGain(delta);

    setXp((prevXp) => {
      let nextXp = prevXp + delta;
      let nextLevel = level;

      // Level up while XP spills over
      let needed = xpNeededForLevel(nextLevel);
      while (nextXp >= needed) {
        nextXp -= needed;
        nextLevel += 1;
        needed = xpNeededForLevel(nextLevel);
      }

      setLevel(nextLevel);

      // Persist
      if (supabaseUserId) {
        void persistSupabaseState(nextXp, nextLevel);
      } else {
        void persistLocalState(nextXp, nextLevel);
      }

      return nextXp;
    });
  };

  /**
   * Once-per-calendar-day XP drip.
   * Uses a per-user AsyncStorage key so multiple accounts on the same device
   * don't share the same daily reward.
   */
  const grantDailyLoginXpIfNeeded = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const userKey = supabaseUserId || "guest";
      const storageKey = `${DAILY_XP_KEY}:${userKey}`;

      const lastDate = await AsyncStorage.getItem(storageKey);
      if (lastDate === today) {
        // Already granted for this user today; nothing to do
        return;
      }

      // Give a small, cozy drip of XP for showing up today
      await addIslandXp(5, "daily_login", { date: today });

      await AsyncStorage.setItem(storageKey, today);
    } catch (e) {
      console.warn(
        "[IslandContext] grantDailyLoginXpIfNeeded error",
        e
      );
    }
  };

  const setCollapsed = async (next: boolean) => {
    setCollapsedState(next);
    try {
      await AsyncStorage.setItem(COLLAPSED_KEY, next ? "true" : "false");
    } catch {}
  };

  const setPositionY = async (y: number) => {
    setPositionYState(y);
    try {
      await AsyncStorage.setItem(POS_KEY, String(y));
    } catch {}
  };

  const value: IslandContextValue = {
    xp,
    level,
    xpToNext,
    collapsed,
    positionY,
    loading,
    lastGain,
    addIslandXp,
    setCollapsed,
    setPositionY,
    refreshIsland,
    grantDailyLoginXpIfNeeded,
  };

  return (
    <IslandContext.Provider value={value}>{children}</IslandContext.Provider>
  );
}

export function useIsland(): IslandContextValue {
  const ctx = useContext(IslandContext);
  if (!ctx) {
    throw new Error("useIsland must be used within an IslandProvider");
  }
  return ctx;
}