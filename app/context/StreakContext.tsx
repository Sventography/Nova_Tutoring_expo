// app/context/StreakContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { supabase } from "../lib/supabase";

const TZ = "America/New_York";

// Legacy keys from the original implementation (for migration)
const LEGACY_META = "@nova/streak.meta"; // { count:number,last:string|null }
const LEGACY_LOGS = "@nova/streak.logs"; // { [yyyy-mm-dd]: true }

// New namespaced keys (guest + per-user)
const GUEST_META = "@nova/streak.meta.guest.v2";
const GUEST_LOGS = "@nova/streak.logs.guest.v2";

const metaKeyFor = (uid: string | null) =>
  uid ? `@nova/streak.meta.user.${uid}.v1` : GUEST_META;
const logsKeyFor = (uid: string | null) =>
  uid ? `@nova/streak.logs.user.${uid}.v1` : GUEST_LOGS;

type State = {
  loaded: boolean;
  count: number;
  best: number;
  todayChecked: boolean;
  lastDate: string | null;
  markToday: () => Promise<void>;
  resetStreak: () => Promise<void>;
};

const C = createContext<State | null>(null);

const key = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const dDays = (a: string, b: string) =>
  Math.round(
    (+new Date(`${b}T00:00:00-04:00`) -
      +new Date(`${a}T00:00:00-04:00`)) /
      86400000
  );

type MetaShape = { count: number; last: string | null; best: number };
type LogsShape = Record<string, boolean>;

function parseMeta(raw: string | null): MetaShape {
  if (!raw) return { count: 0, last: null, best: 0 };
  try {
    const obj = JSON.parse(raw);
    return {
      count: Number.isFinite(Number(obj.count)) ? Number(obj.count) : 0,
      last:
        typeof obj.last === "string" && obj.last.length > 0 ? obj.last : null,
      best: Number.isFinite(Number(obj.best)) ? Number(obj.best) : 0,
    };
  } catch {
    return { count: 0, last: null, best: 0 };
  }
}

function parseLogs(raw: string | null): LogsShape {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as LogsShape) : {};
  } catch {
    return {};
  }
}

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUserId } = useUser();

  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(0);
  const [best, setBest] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [todayChecked, setTodayChecked] = useState(false);

  const resetStreak = useCallback(async () => {
    const uid = supabaseUserId ?? null;
    const metaKey = metaKeyFor(uid);
    const logsKey = logsKeyFor(uid);

    try {
      await Promise.all([
        AsyncStorage.removeItem(metaKey),
        AsyncStorage.removeItem(logsKey),
      ]);
    } catch {
      // ignore local errors
    }

    if (uid) {
      try {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: uid,
              daily_streak_current: 0,
              daily_streak_last_utc: null,
              daily_streak_best: 0,
            },
            { onConflict: "id" }
          );
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[StreakContext] Supabase resetStreak error:", err);
        }
      }
    }

    setCount(0);
    setBest(0);
    setLast(null);
    setTodayChecked(false);
  }, [supabaseUserId]);

  // Initial load / reload when user changes
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoaded(false);
      const today = key();

      try {
        const uid = supabaseUserId ?? null;

        let meta: MetaShape = { count: 0, last: null, best: 0 };
        let logs: LogsShape = {};

        if (uid) {
          // ---------- LOGGED-IN: Supabase source of truth ----------
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select(
                "daily_streak_current, daily_streak_last_utc, daily_streak_best"
              )
              .eq("id", uid)
              .maybeSingle();

            if (!error && data) {
              meta = {
                count: Number.isFinite(Number(data.daily_streak_current))
                  ? Number(data.daily_streak_current)
                  : 0,
                last:
                  typeof data.daily_streak_last_utc === "string" &&
                  data.daily_streak_last_utc.length > 0
                    ? data.daily_streak_last_utc
                    : null,
                best: Number.isFinite(Number(data.daily_streak_best))
                  ? Number(data.daily_streak_best)
                  : 0,
              };
            }
          } catch (err) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn("[StreakContext] Supabase load error:", err);
            }
          }

          // Local per-user cache (for logs / migration)
          const [metaRawLocal, logsRawLocal] = await Promise.all([
            AsyncStorage.getItem(metaKeyFor(uid)),
            AsyncStorage.getItem(logsKeyFor(uid)),
          ]);

          if (!meta.last && metaRawLocal) {
            const localMeta = parseMeta(metaRawLocal);
            if (localMeta.last) {
              meta = localMeta;
            }
          }

          logs = parseLogs(logsRawLocal);
        } else {
          // ---------- GUEST: AsyncStorage only ----------
          const [metaNew, logsNew, metaLegacy, logsLegacy] = await Promise.all([
            AsyncStorage.getItem(GUEST_META),
            AsyncStorage.getItem(GUEST_LOGS),
            AsyncStorage.getItem(LEGACY_META),
            AsyncStorage.getItem(LEGACY_LOGS),
          ]);

          const metaRaw = metaNew ?? metaLegacy;
          const logsRaw = logsNew ?? logsLegacy;

          meta = parseMeta(metaRaw);
          logs = parseLogs(logsRaw);

          // If we loaded from legacy keys, migrate into new guest keys
          if (metaRaw && !metaNew) {
            await AsyncStorage.setItem(GUEST_META, metaRaw);
          }
          if (logsRaw && !logsNew) {
            await AsyncStorage.setItem(GUEST_LOGS, logsRaw);
          }
        }

        // ---------- Handle streak break (> 1 day gap) ----------
        if (meta.last && dDays(meta.last, today) > 1) {
          // broken streak; clear current but keep best as "lifetime best"
          const uidNow = supabaseUserId ?? null;
          const metaKey = metaKeyFor(uidNow);
          const logsKey = logsKeyFor(uidNow);

          try {
            await Promise.all([
              AsyncStorage.removeItem(metaKey),
              AsyncStorage.removeItem(logsKey),
            ]);
          } catch {
            // ignore
          }

          if (uidNow) {
            try {
              await supabase
                .from("profiles")
                .upsert(
                  {
                    id: uidNow,
                    daily_streak_current: 0,
                    daily_streak_last_utc: null,
                    daily_streak_best: meta.best || 0,
                  },
                  { onConflict: "id" }
                );
            } catch (err) {
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.warn(
                  "[StreakContext] Supabase break-streak upsert error:",
                  err
                );
              }
            }
          }

          meta = { count: 0, last: null, best: meta.best || 0 };
          logs = {};
        }

        // ---------- After we know meta/logs, sync to Supabase once ----------
        const uidNow = supabaseUserId ?? null;
        if (uidNow) {
          try {
            await supabase
              .from("profiles")
              .upsert(
                {
                  id: uidNow,
                  daily_streak_current: meta.count || 0,
                  daily_streak_last_utc: meta.last,
                  daily_streak_best: meta.best || meta.count || 0,
                },
                { onConflict: "id" }
              );
          } catch (err) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn(
                "[StreakContext] Supabase sync-on-load error:",
                err
              );
            }
          }
        }

        if (!alive) return;

        setCount(meta.count || 0);
        setBest(meta.best || 0);
        setLast(meta.last || null);
        setTodayChecked(!!logs[today] || meta.last === today);
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[StreakContext] load error:", err);
        }
        if (!alive) return;
        setCount(0);
        setBest(0);
        setLast(null);
        setTodayChecked(false);
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseUserId]);

  const markToday = useCallback(async () => {
    const today = key();
    const uid = supabaseUserId ?? null;

    // Reload logs so we don't stomp other updates
    const logsKey = logsKeyFor(uid);
    const logsRaw = await AsyncStorage.getItem(logsKey);
    const logs = parseLogs(logsRaw);

    // Already marked for today? just ensure state reflects that
    if (logs[today] || last === today) {
      setTodayChecked(true);
      return;
    }

    let nextCount = 1;

    if (last) {
      const diff = dDays(last, today);
      if (diff === 1) {
        nextCount = (count || 0) + 1;
      } else if (diff <= 0) {
        // same day or "earlier" date; don't change
        nextCount = count || 1;
      } else {
        // gap > 1 day → fresh streak from 1
        nextCount = 1;
      }
    }

    const nextBest = Math.max(best || 0, nextCount);

    const newMeta: MetaShape = { count: nextCount, last: today, best: nextBest };
    const newLogs: LogsShape = { ...logs, [today]: true };

    const metaKey = metaKeyFor(uid);

    // Persist locally (guest or per-user cache)
    await Promise.all([
      AsyncStorage.setItem(metaKey, JSON.stringify(newMeta)),
      AsyncStorage.setItem(logsKey, JSON.stringify(newLogs)),
    ]);

    // Sync to Supabase if logged in
    if (uid) {
      try {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: uid,
              daily_streak_current: nextCount,
              daily_streak_last_utc: today,
              daily_streak_best: nextBest,
            },
            { onConflict: "id" }
          );
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[StreakContext] Supabase markToday error:", err);
        }
      }
    }

    setCount(nextCount);
    setBest(nextBest);
    setLast(today);
    setTodayChecked(true);
  }, [supabaseUserId, count, last, best]);

  const v = useMemo(
    () => ({
      loaded,
      count,
      best,
      todayChecked,
      lastDate: last,
      markToday,
      resetStreak,
    }),
    [loaded, count, best, todayChecked, last, markToday, resetStreak]
  );

  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useStreak() {
  const v = useContext(C);
  if (!v) throw new Error("useStreak must be used inside StreakProvider");
  return v;
}
