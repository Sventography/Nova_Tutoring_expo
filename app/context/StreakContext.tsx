// app/context/StreakContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { supabase } from "../lib/supabase";
import { useLegendaryCompanions } from "../hooks/useLegendaryCompanions";
import { AchieveEmitter, ACHIEVEMENT_EVENT } from "./AchievementsContext";
import { useCoins } from "./CoinsContext";
import { dailyStreakBaseCoins } from "../_lib/economy";

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

export type StreakMarkResult = {
  awarded: boolean;
  streakDays: number;
  baseCoins: number;
  coinsAwarded: number;
  nextBaseCoins: number;
  nextCoins: number;
  shieldUsed: boolean;
  appliedCompanions: string[];
};

type RemoteStreakStatus = {
  day_key?: string;
  current_streak?: number;
  streak_days?: number;
  best_streak?: number;
  last_day?: string | null;
  today_claimed?: boolean;
  today_base_coins?: number;
  today_actual_coins?: number;
  has_axolotl?: boolean;
  has_celestra?: boolean;
  has_aetherwyrm?: boolean;
};

type RemoteStreakAward = RemoteStreakStatus & {
  awarded?: boolean;
  reason?: string;
  streak_days?: number;
  shield_used?: boolean;
  base_coins?: number;
  specialist_bonus?: number;
  aetherwyrm_bonus?: number;
  coins_awarded?: number;
  next_base_coins?: number;
  next_coins?: number;
};

function safeNonNegativeInt(value: unknown): number {
  const amount = Math.floor(Number(value) || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function firstRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as T;
  }

  return null;
}

function remoteRowToMeta(row: RemoteStreakStatus): StreakMeta {
  const rawLast = row.last_day;

  return {
    count: safeNonNegativeInt(
      row.current_streak ?? row.streak_days
    ),
    best: safeNonNegativeInt(
      row.best_streak ?? row.current_streak ?? row.streak_days
    ),
    lastDate:
      typeof rawLast === "string" && rawLast.trim()
        ? rawLast.slice(0, 10)
        : null,
  };
}

type State = {
  loaded: boolean;
  count: number;
  best: number;
  todayChecked: boolean;
  lastDate: string | null;
  markToday: () => Promise<StreakMarkResult>;
  resetStreak: () => Promise<void>;
  reload: () => Promise<void>;

  /**
   * Development-only helpers for testing the Axolotl Oracle shield.
   * They are omitted from production behavior.
   */
  devPreviewAxolotlShield?: (
    previousCount?: number
  ) => Promise<{
    hasAxolotl: boolean;
    cooldownReady: boolean;
    previousCount: number;
    nextCount: number;
    shieldUsed: boolean;
    lastUsed: string | null;
    activeCompanionToken: string;
    activeAbilityType: string | null;
  }>;
  devResetAxolotlCooldown?: () => Promise<void>;
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

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn(
            `[StreakContext] Remote streak request timed out after ${milliseconds}ms`
          );
          resolve(fallback);
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
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
 * Read server-authoritative streak info for logged-in users.
 *
 * Phase 3B keeps the streak state and the daily coin claim on Supabase so
 * reinstalling or switching devices cannot reset or duplicate the reward.
 */
async function fetchStreakFromSupabase(
  userId: string | null
): Promise<StreakMeta | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase.rpc(
      "nova_streak_economy_status"
    );

    if (error) {
      console.warn(
        "[StreakContext] server streak status error:",
        error
      );
      return null;
    }

    const row = firstRpcRow<RemoteStreakStatus>(data);
    return row ? remoteRowToMeta(row) : null;
  } catch (err) {
    console.warn(
      "[StreakContext] fetch server streak exception:",
      err
    );
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
  const {
    hasAxolotlOracle:
      hasAxolotl,
    ownedLegendaryTokens,
    calculateCoinReward,
  } = useLegendaryCompanions();

  const {
    addCoins,
    refreshCoins,
  } = useCoins();

  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<StreakMeta>({
    count: 0,
    best: 0,
    lastDate: null,
  });

  // logs are just a list of dayIds; mostly for future UX / debugging
  const [logs, setLogs] = useState<string[]>([]);

  const markTodayInFlightRef =
    useRef<Promise<StreakMarkResult> | null>(null);

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

  /*
   * Keep the old debug field names so the existing hidden
   * development test screen continues to work.
   */
  const activeCompanionToken =
    ownedLegendaryTokens.join("|");

  const activeAbilityType =
    hasAxolotl
      ? "streak_shield"
      : null;

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
        withTimeout(
          fetchStreakFromSupabase(supabaseUserId ?? null),
          3000,
          null
        ),
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
      const writes: Promise<void>[] = [
        safeSetJSON(metaKey, nextMeta),
        safeSetJSON(logsKey, nextLogs),
      ];

      // Signed-in streak state is server-authoritative in Economy Phase 3B.
      // Guests remain local-only.
      if (!supabaseUserId) {
        writes.push(
          syncStreakToSupabase(null, nextMeta)
        );
      }

      await Promise.all(writes).catch((err) =>
        console.warn("[StreakContext] persistAll error:", err)
      );
    },
    [metaKey, logsKey, supabaseUserId]
  );

  const markToday = useCallback(async (): Promise<StreakMarkResult> => {
    if (markTodayInFlightRef.current) {
      return markTodayInFlightRef.current;
    }

    const run = (async (): Promise<StreakMarkResult> => {
      const nowId = getEasternDayId();

      if (supabaseUserId) {
        const eventKey = `streak:${nowId}`;

        const { data, error } = await supabase.rpc(
          "nova_mark_daily_streak",
          {
            p_event_key: eventKey,
          }
        );

        if (error) {
          console.warn(
            "[StreakContext] server daily streak claim failed:",
            error
          );
          throw error;
        }

        const row = firstRpcRow<RemoteStreakAward>(data);
        if (!row) {
          throw new Error(
            "Nova streak server returned no data."
          );
        }

        const nextMeta = remoteRowToMeta({
          ...row,
          current_streak: row.streak_days,
        });

        const nextLogs = new Set(logs);
        if (nextMeta.lastDate) {
          nextLogs.add(nextMeta.lastDate);
        }
        const nextLogsArr = Array.from(nextLogs).sort();

        setMeta(nextMeta);
        setLogs(nextLogsArr);
        await Promise.all([
          safeSetJSON(metaKey, nextMeta),
          safeSetJSON(logsKey, nextLogsArr),
        ]);

        const coinsAwarded = safeNonNegativeInt(
          row.coins_awarded
        );

        if (coinsAwarded > 0) {
          await refreshCoins();
        }

        const streakDays = safeNonNegativeInt(
          row.streak_days
        );

        // Milestone achievements remain one-time achievement rewards.
        try {
          const thresholds = [
            2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100,
            150, 200, 250, 300, 365,
          ];
          for (const d of thresholds) {
            if (streakDays >= d) {
              AchieveEmitter.emit(ACHIEVEMENT_EVENT, {
                id: `streak_${d}`,
              });
            }
          }
        } catch (err) {
          console.warn(
            "[StreakContext] emit server streak achievements error:",
            err
          );
        }

        const appliedCompanions: string[] = [];
        if (row.has_celestra) {
          appliedCompanions.push("companion:celestra");
        }
        if (row.has_aetherwyrm) {
          appliedCompanions.push("companion:aetherwyrm");
        }
        if (row.shield_used) {
          appliedCompanions.push("companion:axolotl_oracle");
        }

        return {
          awarded: !!row.awarded && coinsAwarded > 0,
          streakDays,
          baseCoins: safeNonNegativeInt(row.base_coins),
          coinsAwarded,
          nextBaseCoins: safeNonNegativeInt(
            row.next_base_coins
          ),
          nextCoins: safeNonNegativeInt(row.next_coins),
          shieldUsed: !!row.shield_used,
          appliedCompanions,
        };
      }

      // Guest mode keeps the proven local Phase-2 behavior.
      // If today was already marked, do not award the daily streak coins again.
      if (meta.lastDate === nowId && meta.count > 0) {
        const nextBaseCoins = dailyStreakBaseCoins(meta.count + 1);
        const nextReward = calculateCoinReward(
          nextBaseCoins,
          "streak_milestone"
        );

        return {
          awarded: false,
          streakDays: meta.count,
          baseCoins: 0,
          coinsAwarded: 0,
          nextBaseCoins,
          nextCoins: nextReward.totalCoins,
          shieldUsed: false,
          appliedCompanions: [],
        };
      }

      const prevDate = meta.lastDate;
      const prevCount = meta.count;
      const prevBest = meta.best;

      let nextCount = 1;
      let usedShield = false;

      if (prevDate) {
        const diff = daysBetween(prevDate, nowId);

        if (diff === 0) {
          nextCount = prevCount || 1;
        } else if (diff === 1) {
          nextCount = prevCount + 1;

          // NOVA_AXOLOTL_REARM_V1
          // A normal consecutive login re-arms the one-use guest shield.
          if (hasAxolotl) {
            try {
              await AsyncStorage.removeItem(axolotlKey);
            } catch (err) {
              console.warn(
                "[StreakContext] Axolotl Oracle re-arm error:",
                err
              );
            }
          }
        } else if (diff === 2) {
          // Exactly one missed login day may be protected once.
          if (hasAxolotl) {
            try {
              const shieldSpent = await AsyncStorage.getItem(axolotlKey);

              if (!shieldSpent) {
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
            nextCount = 1;
          }
        } else if (diff && diff > 2) {
          // More than one missed login day always breaks the streak.
          nextCount = 1;
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
      const nextLogsArr = Array.from(existingLogs).sort();

      // Persist the streak day first. This makes the daily reward idempotent across
      // the app: later markToday() calls see today as already claimed.
      await persistAll(nextMeta, nextLogsArr);

      const baseCoins = dailyStreakBaseCoins(nextCount);
      const reward = calculateCoinReward(
        baseCoins,
        "streak_milestone"
      );

      let coinsAwarded = 0;

      try {
        await addCoins(
          reward.totalCoins,
          "daily_streak_reward",
          {
            streakDays: nextCount,
            baseCoins: reward.baseCoins,
            specialistBonus: reward.specialistBonus,
            aetherwyrmBonus: reward.aetherwyrmBonus,
            awardedCoins: reward.totalCoins,
            appliedCompanions: reward.appliedCompanions,
            shieldUsed: usedShield,
          }
        );

        coinsAwarded = reward.totalCoins;
      } catch (error) {
        console.warn(
          "[StreakContext] daily streak coin reward failed:",
          error
        );
      }

      // Fire one-time streak achievement bonuses after the normal daily reward.
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

      const nextBaseCoins = dailyStreakBaseCoins(nextCount + 1);
      const nextReward = calculateCoinReward(
        nextBaseCoins,
        "streak_milestone"
      );

      return {
        awarded: coinsAwarded > 0,
        streakDays: nextCount,
        baseCoins: reward.baseCoins,
        coinsAwarded,
        nextBaseCoins,
        nextCoins: nextReward.totalCoins,
        shieldUsed: usedShield,
        appliedCompanions: reward.appliedCompanions,
      };
    })();

    markTodayInFlightRef.current = run;

    try {
      return await run;
    } finally {
      markTodayInFlightRef.current = null;
    }
  }, [
    addCoins,
    axolotlKey,
    calculateCoinReward,
    hasAxolotl,
    logs,
    logsKey,
    meta,
    metaKey,
    persistAll,
    refreshCoins,
    supabaseUserId,
  ]);

  const resetStreak = useCallback(async () => {
    const nowId = getEasternDayId();

    if (supabaseUserId) {
      const { data, error } = await supabase.rpc(
        "nova_reset_streak"
      );

      if (error) {
        console.warn(
          "[StreakContext] server reset streak failed:",
          error
        );
        throw error;
      }

      const row = firstRpcRow<RemoteStreakStatus>(data);
      const nextMeta: StreakMeta = {
        count: safeNonNegativeInt(row?.current_streak),
        best: safeNonNegativeInt(
          row?.best_streak ?? meta.best
        ),
        lastDate:
          typeof row?.last_day === "string"
            ? row.last_day.slice(0, 10)
            : nowId,
      };

      setMeta(nextMeta);
      await safeSetJSON(metaKey, nextMeta);
      return;
    }

    const nextMeta: StreakMeta = {
      count: 0,
      best: meta.best, // keep best streak for bragging rights
      lastDate: nowId,
    };
    // we don't clear logs; we just add a new "break" day implicitly
    await persistAll(nextMeta, logs);
  }, [
    logs,
    meta.best,
    metaKey,
    persistAll,
    supabaseUserId,
  ]);

  const reload = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const devPreviewAxolotlShield =
    useCallback(
      async (
        previousCount = 5
      ) => {
        const safeCount = Math.max(
          1,
          Math.floor(
            Number(previousCount) || 5
          )
        );

        const nowId =
          getEasternDayId();

        const lastUsed =
          await AsyncStorage.getItem(
            axolotlKey
          );

        const daysSinceUse =
          lastUsed
            ? daysBetween(
                lastUsed,
                nowId
              )
            : null;

        const cooldownReady =
          !lastUsed ||
          daysSinceUse === null ||
          daysSinceUse >= 7;

        const shieldUsed =
          hasAxolotl &&
          cooldownReady;

        return {
          hasAxolotl,
          cooldownReady,
          previousCount:
            safeCount,
          nextCount:
            shieldUsed
              ? safeCount + 1
              : 1,
          shieldUsed,
          lastUsed,
          activeCompanionToken,
          activeAbilityType,
        };
      },
      [
        axolotlKey,
        hasAxolotl,
        activeCompanionToken,
        activeAbilityType,
      ]
    );

  const devResetAxolotlCooldown =
    useCallback(async () => {
      if (!__DEV__) return;

      await AsyncStorage.removeItem(
        axolotlKey
      );

      console.log(
        "[StreakContext] DEV Axolotl cooldown reset",
        {
          activeCompanionToken,
          activeAbilityType,
          hasAxolotl,
        }
      );
    }, [
      axolotlKey,
      activeCompanionToken,
      activeAbilityType,
      hasAxolotl,
    ]);

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
      devPreviewAxolotlShield:
        __DEV__
          ? devPreviewAxolotlShield
          : undefined,
      devResetAxolotlCooldown:
        __DEV__
          ? devResetAxolotlCooldown
          : undefined,
    }),
    [
      loaded,
      meta,
      todayChecked,
      markToday,
      resetStreak,
      reload,
      devPreviewAxolotlShield,
      devResetAxolotlCooldown,
    ]
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