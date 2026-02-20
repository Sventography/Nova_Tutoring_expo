// app/context/StreakContext.tsx
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
import { supabase } from "../lib/supabase";
import { useCompanion } from "./CompanionContext";
import { canonId } from "../_lib/canonId";

// All streak logic is anchored to Eastern Time (America/New_York)
const EASTERN_TZ = "America/New_York";

const LEGACY_META = "@nova/streak.meta";
const LEGACY_LOGS = "@nova/streak.logs";

const GUEST_META = "@nova/streak.meta.guest.v2";
const GUEST_LOGS = "@nova/streak.logs.guest.v2";

const AXOLOTL_BASE = "@nova/streak.axolotlLastUsed";

const metaKeyFor = (uid: string | null) =>
  uid ? `@nova/streak.meta.user.${uid}.v1` : GUEST_META;
const logsKeyFor = (uid: string | null) =>
  uid ? `@nova/streak.logs.user.${uid}.v1` : GUEST_LOGS;
const axolotlKeyFor = (uid: string | null) =>
  uid ? `${AXOLOTL_BASE}.user.${uid}.v1` : `${AXOLOTL_BASE}.guest.v1`;

type StreakMeta = {
  count: number;
  best: number;
  lastDate: string | null; // YYYY-MM-DD in Eastern
};

type State = {
  loaded: boolean;
  count: number;
  best: number;
  todayChecked: boolean;
  lastDate: string | null;
  markToday: () => Promise<void>;
  resetStreak: () => Promise<void>;
  reload: () => Promise<void>;
};

const C = createContext<State | null>(null);

/**
 * Returns the "day id" in Eastern time, always formatted as YYYY-MM-DD.
 * This is the single source of truth for what "today" means for streaks.
 */
function getEasternDayId(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function parseDayId(id: string | null): Date | null {
  if (!id) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(id);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(a: string | null, b: string | null): number | null {
  const da = parseDayId(a);
  const db = parseDayId(b);
  if (!da || !db) return null;
  const diffMs = db.getTime() - da.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(diffMs / oneDay);
}

async function safeGetJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function safeSetJSON(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Migrate any legacy guest keys into the v2 guest keys (one-time).
 */
async function migrateLegacyGuestIfNeeded(): Promise<void> {
  try {
    const legacyMeta = await AsyncStorage.getItem(LEGACY_META);
    const legacyLogs = await AsyncStorage.getItem(LEGACY_LOGS);
    const newMeta = await AsyncStorage.getItem(GUEST_META);
    const newLogs = await AsyncStorage.getItem(GUEST_LOGS);

    if (legacyMeta && !newMeta) {
      await AsyncStorage.setItem(GUEST_META, legacyMeta);
      await AsyncStorage.removeItem(LEGACY_META);
    }
    if (legacyLogs && !newLogs) {
      await AsyncStorage.setItem(GUEST_LOGS, legacyLogs);
      await AsyncStorage.removeItem(LEGACY_LOGS);
    }
  } catch (err) {
    console.warn("[StreakContext] migrateLegacyGuestIfNeeded error:", err);
  }
}

/**
 * Mirror streak info to Supabase profiles table, but *never* treat Supabase
 * as the source of truth (local AsyncStorage wins).
 */
async function syncStreakToSupabase(
  userId: string | null,
  meta: StreakMeta
): Promise<void> {
  if (!userId) return;
  try {
    const payload: any = {
      id: userId,
      // These column names are flexible; if they don't exist,
      // Supabase will throw and we'll just log a warning.
      streak_current: meta.count,
      streak_best: meta.best,
      streak_last_date: meta.lastDate,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("[StreakContext] Supabase upsert streak error:", error);
    }
  } catch (err) {
    console.warn("[StreakContext] syncStreakToSupabase error:", err);
  }
}

export function StreakProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId } = useUser() as any;
  const { activeCompanionId } = useCompanion();

  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<StreakMeta>({
    count: 0,
    best: 0,
    lastDate: null,
  });

  // logs are just a list of dayIds; mostly for future UX / debugging
  const [logs, setLogs] = useState<string[]>([]);

  const todayId = getEasternDayId();
  const todayChecked = meta.lastDate === todayId;

  const metaKey = useMemo(
    () => metaKeyFor(supabaseUserId ?? null),
    [supabaseUserId]
  );
  const logsKey = useMemo(
    () => logsKeyFor(supabaseUserId ?? null),
    [supabaseUserId]
  );
  const axolotlKey = useMemo(
    () => axolotlKeyFor(supabaseUserId ?? null),
    [supabaseUserId]
  );

  const activeCompanionCid = useMemo(
    () => (activeCompanionId ? canonId(activeCompanionId) : null),
    [activeCompanionId]
  );
  const hasAxolotl = activeCompanionCid === "companion:axolotl_oracle";

  const hydrate = useCallback(async () => {
    setLoaded(false);

    if (!supabaseUserId) {
      // only guests use legacy keys
      await migrateLegacyGuestIfNeeded();
    }

    try {
      const storedMeta =
        (await safeGetJSON<StreakMeta>(metaKey)) ?? undefined;
      const storedLogs =
        (await safeGetJSON<string[]>(logsKey)) ?? undefined;

      const nextMeta: StreakMeta = storedMeta || {
        count: 0,
        best: 0,
        lastDate: null,
      };
      const nextLogs: string[] = storedLogs || [];

      setMeta(nextMeta);
      setLogs(nextLogs);
    } catch (err) {
      console.warn("[StreakContext] hydrate error:", err);
      setMeta({ count: 0, best: 0, lastDate: null });
      setLogs([]);
    } finally {
      setLoaded(true);
    }
  }, [metaKey, logsKey, supabaseUserId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const persistAll = useCallback(
    async (nextMeta: StreakMeta, nextLogs: string[]) => {
      setMeta(nextMeta);
      setLogs(nextLogs);
      await Promise.all([
        safeSetJSON(metaKey, nextMeta),
        safeSetJSON(logsKey, nextLogs),
        syncStreakToSupabase(supabaseUserId ?? null, nextMeta),
      ]).catch((err) =>
        console.warn("[StreakContext] persistAll error:", err)
      );
    },
    [metaKey, logsKey, supabaseUserId]
  );

  const markToday = useCallback(async () => {
    const nowId = getEasternDayId();

    // If we've already marked today as checked, don't double-count
    if (meta.lastDate === nowId && meta.count > 0) {
      return;
    }

    const prevDate = meta.lastDate;
    const prevCount = meta.count;
    const prevBest = meta.best;

    let nextCount = 1;

    if (prevDate) {
      const diff = daysBetween(prevDate, nowId);

      if (diff === 0) {
        // weird edge case; treat as already marked
        nextCount = prevCount || 1;
      } else if (diff === 1) {
        // consecutive day – streak continues
        nextCount = prevCount + 1;
      } else if (diff && diff > 1) {
        // Missed at least one day – Axolotl Oracle may save you once per 7 days
        let usedShield = false;

        if (hasAxolotl) {
          try {
            const lastUsed = await AsyncStorage.getItem(axolotlKey);
            let canUseShield = false;

            if (!lastUsed) {
              canUseShield = true;
            } else {
              const since = daysBetween(lastUsed, nowId);
              if (since === null || since >= 7) {
                canUseShield = true;
              }
            }

            if (canUseShield) {
              // Treat it like the streak never broke: continue counting
              nextCount = prevCount + 1;
              usedShield = true;
              await AsyncStorage.setItem(axolotlKey, nowId);
              console.log(
                "[StreakContext] Axolotl Oracle shield used – streak preserved."
              );
            }
          } catch (err) {
            console.warn(
              "[StreakContext] Axolotl Oracle shield error:",
              err
            );
          }
        }

        if (!usedShield) {
          // No shield available: streak resets
          nextCount = 1;
        }
      }
    }

    const nextBest = Math.max(prevBest, nextCount);
    const nextMeta: StreakMeta = {
      count: nextCount,
      best: nextBest,
      lastDate: nowId,
    };

    const existingLogs = new Set(logs);
    existingLogs.add(nowId);
    const nextLogsArr = Array.from(existingLogs).sort(); // keeps ordering nice

    await persistAll(nextMeta, nextLogsArr);
  }, [meta, logs, persistAll, hasAxolotl, axolotlKey]);

  const resetStreak = useCallback(async () => {
    const nowId = getEasternDayId();
    const nextMeta: StreakMeta = {
      count: 0,
      best: meta.best, // keep best streak for bragging rights
      lastDate: nowId,
    };
    // we don't clear logs; we just add a new "break" day implicitly
    await persistAll(nextMeta, logs);
  }, [meta.best, logs, persistAll]);

  const reload = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const value: State = useMemo(
    () => ({
      loaded,
      count: meta.count,
      best: meta.best,
      todayChecked,
      lastDate: meta.lastDate,
      markToday,
      resetStreak,
      reload,
    }),
    [loaded, meta, todayChecked, markToday, resetStreak, reload]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStreak(): State {
  const ctx = useContext(C);
  if (!ctx) {
    throw new Error("useStreak must be used inside <StreakProvider>");
  }
  return ctx;
}