// app/context/IslandContext.tsx
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
import { DeviceEventEmitter } from "react-native";

import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";
import type { CompanionActivityKey } from "../_lib/commonCompanionFriendship";

export type IslandMilestone = {
  id: string;
  level: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
};

export const ISLAND_MILESTONES: IslandMilestone[] = [
  {
    id: "study_grove",
    level: 1,
    title: "Study Grove",
    shortTitle: "Grove",
    description: "The first living patch of every Nova Island.",
    icon: "leaf-outline",
  },
  {
    id: "starlight_garden",
    level: 2,
    title: "Starlight Garden",
    shortTitle: "Garden",
    description: "A glowing garden that brightens as you keep learning.",
    icon: "flower-outline",
  },
  {
    id: "nova_library",
    level: 3,
    title: "Nova Library",
    shortTitle: "Library",
    description: "A future home for lessons, flashcards, and collections.",
    icon: "library-outline",
  },
  {
    id: "learning_falls",
    level: 5,
    title: "Learning Falls",
    shortTitle: "Waterfall",
    description: "A luminous waterfall powered by steady learning XP.",
    icon: "water-outline",
  },
  {
    id: "sky_observatory",
    level: 7,
    title: "Sky Observatory",
    shortTitle: "Observatory",
    description: "A tower for future goals, statistics, and discoveries.",
    icon: "planet-outline",
  },
  {
    id: "companion_habitat",
    level: 10,
    title: "Companion Habitat",
    shortTitle: "Habitat",
    description: "A living home where equipped companions will eventually roam.",
    icon: "paw-outline",
  },
];

type XpSource = "quiz" | "brainteasers" | "ask" | "login" | "other";

export const COMPANION_ACTIVITY_EVENT =
  "companion:activity";

function companionActivityForXpSource(
  source: XpSource
): CompanionActivityKey | null {
  if (source === "quiz") return "quiz";
  if (source === "brainteasers") {
    return "brainteasers";
  }
  if (source === "ask") return "ask";
  if (source === "login") {
    return "daily_login";
  }

  return null;
}

type TodayBreakdown = {
  date: string;
  quiz: number;
  brainteasers: number;
  ask: number;
  login: number;
  other: number;
};

type ProgressSnapshot = {
  xp: number;
  level: number;
  today: TodayBreakdown;
};

type StoredState = ProgressSnapshot & {
  version: 2;
  lastGain: number;
  lastGainReason: string;
  lastGainAt: number | null;
};

type IslandContextValue = {
  xp: number;
  level: number;
  islandXp: number;
  islandLevel: number;
  xpToNext: number;
  progress: number;
  islandStage: string;
  nextUnlock: IslandMilestone | null;

  collapsed: boolean;
  positionY: number;
  loading: boolean;
  ready: boolean;

  lastGain: number;
  lastGainReason: string;
  lastGainAt: number | null;
  lastGainToken: number;

  todayFromQuiz: number;
  todayFromBrainteasers: number;
  todayFromAsk: number;
  todayFromLogin: number;
  todayFromOther: number;
  totalToday: number;

  addIslandXp: (
    delta: number,
    reason?: string,
    meta?: Record<string, any>
  ) => Promise<void>;
  setCollapsed: (next: boolean) => Promise<void>;
  setPositionY: (y: number) => Promise<void>;
  refreshIsland: () => Promise<void>;
  grantDailyLoginXpIfNeeded: () => Promise<void>;
};

const IslandContext = createContext<IslandContextValue | undefined>(undefined);

const STATE_PREFIX = "@island/state.v2";
const LEGACY_STATE_KEY = "@island/state.v1";
const POS_KEY = "@island/xpbar/posY.v1";
const COLLAPSED_KEY = "@island/xpbar/collapsed.v1";
const DAILY_XP_KEY = "@island/daily_login_xp_date.v2";

export function xpForNextLevel(level: number): number {
  const safe = Math.max(1, Math.floor(Number(level) || 1));
  return 150 + (safe - 1) * 50;
}

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyToday(): TodayBreakdown {
  return {
    date: dateKey(),
    quiz: 0,
    brainteasers: 0,
    ask: 0,
    login: 0,
    other: 0,
  };
}

function normalizeToday(value?: Partial<TodayBreakdown> | null): TodayBreakdown {
  if (!value || value.date !== dateKey()) return emptyToday();

  return {
    date: dateKey(),
    quiz: Math.max(0, Number(value.quiz) || 0),
    brainteasers: Math.max(0, Number(value.brainteasers) || 0),
    ask: Math.max(0, Number(value.ask) || 0),
    login: Math.max(0, Number(value.login) || 0),
    other: Math.max(0, Number(value.other) || 0),
  };
}

function safeXp(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function safeLevel(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

function sourceForReason(reason?: string): XpSource {
  const value = String(reason || "").toLowerCase().replace(/[\s-]+/g, "_");

  if (value.includes("quiz")) return "quiz";
  if (
    value.includes("brainteaser") ||
    value.includes("brain_teaser") ||
    value.includes("riddle")
  ) {
    return "brainteasers";
  }
  if (value === "ask" || value.includes("ask_nova")) return "ask";
  if (value.includes("login")) return "login";
  return "other";
}

function prettyReason(source: XpSource, reason?: string): string {
  if (source === "quiz") return "Quiz";
  if (source === "brainteasers") return "Brainteaser";
  if (source === "ask") return "Ask Nova";
  if (source === "login") return "Daily login";

  const raw = String(reason || "").trim();
  if (!raw) return "Learning activity";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stageForLevel(level: number): string {
  if (level >= 12) return "Nova Realm";
  if (level >= 8) return "Starlit Sanctuary";
  if (level >= 5) return "Cascading Campus";
  if (level >= 2) return "Sprouting Haven";
  return "Seedling Isle";
}

function storageKey(userId: string | null): string {
  return `${STATE_PREFIX}:${userId || "guest"}`;
}

function storedState(
  snapshot: ProgressSnapshot,
  gain: { amount: number; reason: string; at: number | null }
): StoredState {
  return {
    version: 2,
    xp: safeXp(snapshot.xp),
    level: safeLevel(snapshot.level),
    today: normalizeToday(snapshot.today),
    lastGain: safeXp(gain.amount),
    lastGainReason: gain.reason,
    lastGainAt: gain.at,
  };
}

export function IslandProvider({ children }: { children: ReactNode }) {
  const { supabaseUserId } = (useUser() || {}) as any;
  const userId = supabaseUserId ? String(supabaseUserId) : null;

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [today, setToday] = useState<TodayBreakdown>(() => emptyToday());

  const [collapsed, setCollapsedState] = useState(false);
  const [positionY, setPositionYState] = useState(140);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const [lastGain, setLastGain] = useState(0);
  const [lastGainReason, setLastGainReason] = useState("");
  const [lastGainAt, setLastGainAt] = useState<number | null>(null);
  const [lastGainToken, setLastGainToken] = useState(0);

  const progressRef = useRef<ProgressSnapshot>({
    xp: 0,
    level: 1,
    today: emptyToday(),
  });

  const gainRef = useRef({
    amount: 0,
    reason: "",
    at: null as number | null,
  });

  const xpToNext = xpForNextLevel(level);
  const progress = Math.max(0, Math.min(1, xp / xpToNext));
  const islandStage = stageForLevel(level);
  const nextUnlock =
    ISLAND_MILESTONES.find((milestone) => milestone.level > level) ?? null;

  const totalToday =
    today.quiz + today.brainteasers + today.ask + today.login + today.other;

  useEffect(() => {
    void (async () => {
      try {
        const [position, collapsedValue] = await Promise.all([
          AsyncStorage.getItem(POS_KEY),
          AsyncStorage.getItem(COLLAPSED_KEY),
        ]);

        if (position) {
          const parsed = Number(position);
          if (Number.isFinite(parsed)) setPositionYState(parsed);
        }

        setCollapsedState(collapsedValue === "true");
      } catch {
        // UI preferences are non-critical.
      }
    })();
  }, []);

  const persistLocal = useCallback(
    async (
      snapshot: ProgressSnapshot,
      gain = gainRef.current
    ) => {
      try {
        await AsyncStorage.setItem(
          storageKey(userId),
          JSON.stringify(storedState(snapshot, gain))
        );
      } catch (error) {
        console.warn("[IslandContext] local save error", error);
      }
    },
    [userId]
  );

  const persistRemote = useCallback(
    async (nextXp: number, nextLevel: number) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            island_xp: nextXp,
            island_level: nextLevel,
          })
          .eq("id", userId);

        if (error) {
          console.warn("[IslandContext] Supabase save error", error);
        }
      } catch (error) {
        console.warn("[IslandContext] Supabase save exception", error);
      }
    },
    [userId]
  );

  const refreshIsland = useCallback(async () => {
    setLoading(true);
    setReady(false);

    try {
      let local: StoredState | null = null;
      const raw = await AsyncStorage.getItem(storageKey(userId));

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        local = storedState(
          {
            xp: safeXp(parsed.xp),
            level: safeLevel(parsed.level),
            today: normalizeToday(parsed.today),
          },
          {
            amount: safeXp(parsed.lastGain),
            reason: String(parsed.lastGainReason || ""),
            at:
              typeof parsed.lastGainAt === "number"
                ? parsed.lastGainAt
                : null,
          }
        );
      } else if (!userId) {
        const legacyRaw = await AsyncStorage.getItem(LEGACY_STATE_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          local = storedState(
            {
              xp: safeXp(legacy?.xp),
              level: safeLevel(legacy?.level),
              today: emptyToday(),
            },
            { amount: 0, reason: "", at: null }
          );
        }
      }

      local =
        local ??
        storedState(
          { xp: 0, level: 1, today: emptyToday() },
          { amount: 0, reason: "", at: null }
        );

      let nextXp = local.xp;
      let nextLevel = local.level;

      if (userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("island_xp,island_level")
          .eq("id", userId)
          .maybeSingle();

        if (!error && data) {
          nextXp = safeXp(data.island_xp);
          nextLevel = safeLevel(data.island_level);
        } else if (error) {
          console.warn("[IslandContext] Supabase load error", error);
        }
      }

      const snapshot: ProgressSnapshot = {
        xp: nextXp,
        level: nextLevel,
        today: normalizeToday(local.today),
      };

      const gain = {
        amount: local.lastGain,
        reason: local.lastGainReason,
        at: local.lastGainAt,
      };

      progressRef.current = snapshot;
      gainRef.current = gain;

      setXp(snapshot.xp);
      setLevel(snapshot.level);
      setToday(snapshot.today);
      setLastGain(gain.amount);
      setLastGainReason(gain.reason);
      setLastGainAt(gain.at);

      await persistLocal(snapshot, gain);
    } catch (error) {
      console.warn("[IslandContext] refresh error", error);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [persistLocal, userId]);

  useEffect(() => {
    void refreshIsland();
  }, [refreshIsland]);

  const addIslandXp = useCallback<IslandContextValue["addIslandXp"]>(
    async (delta, reason, _meta) => {
      const amount = Math.floor(Number(delta));
      if (!Number.isFinite(amount) || amount <= 0) return;

      const source = sourceForReason(reason);
      const current = progressRef.current;
      const currentToday = normalizeToday(current.today);

      const nextToday: TodayBreakdown = {
        ...currentToday,
        [source]: currentToday[source] + amount,
      };

      let nextXp = current.xp + amount;
      let nextLevel = current.level;
      let needed = xpForNextLevel(nextLevel);

      while (nextXp >= needed) {
        nextXp -= needed;
        nextLevel += 1;
        needed = xpForNextLevel(nextLevel);
      }

      const snapshot: ProgressSnapshot = {
        xp: nextXp,
        level: nextLevel,
        today: nextToday,
      };

      const gain = {
        amount,
        reason: prettyReason(source, reason),
        at: Date.now(),
      };

      progressRef.current = snapshot;
      gainRef.current = gain;

      setXp(nextXp);
      setLevel(nextLevel);
      setToday(nextToday);
      setLastGain(amount);
      setLastGainReason(gain.reason);
      setLastGainAt(gain.at);
      setLastGainToken((token) => token + 1);

      const companionActivity =
        companionActivityForXpSource(source);

      if (companionActivity) {
        DeviceEventEmitter.emit(
          COMPANION_ACTIVITY_EVENT,
          {
            activity: companionActivity,
            amount,
            reason: gain.reason,
            islandLevel: nextLevel,
          }
        );
      }

      if (nextLevel > current.level) {
        DeviceEventEmitter.emit(
          COMPANION_ACTIVITY_EVENT,
          {
            activity: "island_level_up",
            previousLevel: current.level,
            islandLevel: nextLevel,
          }
        );
      }

      await Promise.allSettled([
        persistLocal(snapshot, gain),
        persistRemote(nextXp, nextLevel),
      ]);
    },
    [persistLocal, persistRemote]
  );

  const grantDailyLoginXpIfNeeded = useCallback(async () => {
    try {
      const todayKey = dateKey();
      const key = `${DAILY_XP_KEY}:${userId || "guest"}`;
      const lastDate = await AsyncStorage.getItem(key);

      if (lastDate === todayKey) return;

      await addIslandXp(5, "daily_login", { date: todayKey });
      await AsyncStorage.setItem(key, todayKey);
    } catch (error) {
      console.warn("[IslandContext] daily XP error", error);
    }
  }, [addIslandXp, userId]);

  const setCollapsed = useCallback(async (next: boolean) => {
    setCollapsedState(next);
    try {
      await AsyncStorage.setItem(COLLAPSED_KEY, next ? "true" : "false");
    } catch {}
  }, []);

  const setPositionY = useCallback(async (y: number) => {
    const safeY = Number.isFinite(Number(y)) ? Number(y) : 140;
    setPositionYState(safeY);
    try {
      await AsyncStorage.setItem(POS_KEY, String(safeY));
    } catch {}
  }, []);

  const value = useMemo<IslandContextValue>(
    () => ({
      xp,
      level,
      islandXp: xp,
      islandLevel: level,
      xpToNext,
      progress,
      islandStage,
      nextUnlock,
      collapsed,
      positionY,
      loading,
      ready,
      lastGain,
      lastGainReason,
      lastGainAt,
      lastGainToken,
      todayFromQuiz: today.quiz,
      todayFromBrainteasers: today.brainteasers,
      todayFromAsk: today.ask,
      todayFromLogin: today.login,
      todayFromOther: today.other,
      totalToday,
      addIslandXp,
      setCollapsed,
      setPositionY,
      refreshIsland,
      grantDailyLoginXpIfNeeded,
    }),
    [
      xp,
      level,
      xpToNext,
      progress,
      islandStage,
      nextUnlock,
      collapsed,
      positionY,
      loading,
      ready,
      lastGain,
      lastGainReason,
      lastGainAt,
      lastGainToken,
      today,
      totalToday,
      addIslandXp,
      setCollapsed,
      setPositionY,
      refreshIsland,
      grantDailyLoginXpIfNeeded,
    ]
  );

  return (
    <IslandContext.Provider value={value}>
      {children}
    </IslandContext.Provider>
  );
}

export function useIsland(): IslandContextValue {
  const context = useContext(IslandContext);

  if (!context) {
    throw new Error("useIsland must be used within an IslandProvider");
  }

  return context;
}