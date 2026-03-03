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
import { AchieveEmitter, ACHIEVEMENT_EVENT } from "./AchievementsContext";

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
 * Read streak info from Supabase profiles table.
 *
 * We treat Supabase as the *source of truth* for logged-in users so that
 * streaks follow the account across devices and installs.
 */
async function fetchStreakFromSupabase(
  userId: string | null
): Promise<StreakMeta | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "daily_streak_current, daily_streak_best, daily_streak_last_utc"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[StreakContext] Supabase fetch streak error:", error);
      return null;
    }
    if (!data) return null;

    const rawCount = (data as any).daily_streak_current;
    const rawBest = (data as any).daily_streak_best;
    const rawLast = (data as any).daily_streak_last_utc as
      | string
      | null
      | undefined;

    const count =
      typeof rawCount === "number" && Number.isFinite(rawCount)
        ? rawCount
        : 0;
    const best =
      typeof rawBest === "number" && Number.isFinite(rawBest)
        ? rawBest
        : count;

    let lastDate: string | null = null;

    if (rawLast) {
      // If it's already YYYY-MM-DD, keep as-is.
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawLast)) {
        lastDate = rawLast;
      } else {
        // Otherwise, try to parse as a timestamp and convert to Eastern day id.
        const parsed = new Date(rawLast);
        if (!Number.isNaN(parsed.getTime())) {
          lastDate = getEasternDayId(parsed);
        }
      }
    }

    return {
      count,
      best,
      lastDate,
    };
  } catch (err) {
    console.warn("[StreakContext] fetchStreakFromSupabase exception:", err);
    return null;
  }
}

/**
 * Mirror streak info to Supabase profiles table, using the daily_streak_*
 * columns so streaks persist per account across devices.
 *
 * Logged-in users: Supabase is canonical; local is just a cache.
 * Guests: this is a no-op.
 */
async function syncStreakToSupabase(
  userId: string | null,
  meta: StreakMeta
): Promise<void> {
  if (!userId) return;
  try {
    const payload: any = {
      daily_streak_current: meta.count,
      daily_streak_best: meta.best,
      // We store the Eastern day-id string in daily_streak_last_utc.
      // If the column is timestamptz, Postgres will coerce it to a date.
      daily_streak_last_utc: meta.lastDate,
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      console.warn("[StreakContext] Supabase update streak error:", error);
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

    // Only guests use legacy keys
    if (!supabaseUserId) {
      await migrateLegacyGuestIfNeeded();
    }

    try {
      const [storedMeta, storedLogs, remoteMeta] = await Promise.all([
        safeGetJSON<StreakMeta>(metaKey),
        safeGetJSON<string[]>(logsKey),
        fetchStreakFromSupabase(supabaseUserId ?? null),
      ]);

      let nextMeta: StreakMeta = {
        count: 0,
        best: 0,
        lastDate: null,
      };
      let nextLogs: string[] = storedLogs || [];

      if (remoteMeta && (remoteMeta.count > 0 || remoteMeta.lastDate)) {
        // For logged-in users with real data, Supabase is canonical.
        nextMeta = {
          count: remoteMeta.count,
          best: remoteMeta.best,
          lastDate: remoteMeta.lastDate,
        };

        if (remoteMeta.lastDate) {
          const set = new Set(nextLogs);
          set.add(remoteMeta.lastDate);
          nextLogs = Array.from(set).sort();
        }
      } else if (storedMeta) {
        // Guest, or user with no streak data in Supabase yet
        nextMeta = storedMeta;
        nextLogs = storedLogs || [];
      }

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

    // 🔥 Fire streak achievements via AchievementsContext bridge
    try {
      const thresholds = [
        2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365,
      ];
      for (const d of thresholds) {
        if (nextCount >= d) {
          AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
            id: `streak_${d}`,
          });
        }
      }
    } catch (err) {
      console.warn(
        "[StreakContext] emit streak achievements error:",
        err
      );
    }
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