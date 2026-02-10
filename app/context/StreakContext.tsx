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

const TZ = "America/New_York";
const META = "@nova/streak.meta"; // { count:number,last:string|null }
const LOGS = "@nova/streak.logs"; // { [yyyy-mm-dd]: true }

type State = {
  loaded: boolean;
  count: number;
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

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [todayChecked, setTodayChecked] = useState(false);

  const resetStreak = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(META),
      AsyncStorage.removeItem(LOGS),
    ]);
    setCount(0);
    setLast(null);
    setTodayChecked(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [m, l] = await Promise.all([
          AsyncStorage.getItem(META),
          AsyncStorage.getItem(LOGS),
        ]);
        const meta = m ? JSON.parse(m) : { count: 0, last: null };
        const logs = l ? JSON.parse(l) : {};
        const today = key();

        const lastStored = meta.last || null;

        // if it has been more than 1 day since last streak date,
        // reset to zero; user must start over
        if (lastStored && dDays(lastStored, today) > 1) {
          await resetStreak();
          setLoaded(true);
          return;
        }

        setCount(meta.count || 0);
        setLast(lastStored);
        setTodayChecked(!!logs[today]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [resetStreak]);

  const markToday = useCallback(async () => {
    const [m, l] = await Promise.all([
      AsyncStorage.getItem(META),
      AsyncStorage.getItem(LOGS),
    ]);
    const meta = m ? JSON.parse(m) : { count: 0, last: null };
    const logs = l ? JSON.parse(l) : {};
    const today = key();

    if (logs[today]) return;

    let next = 1;
    if (meta.last) {
      const diff = dDays(meta.last, today);
      if (diff === 1) {
        next = (meta.count || 0) + 1;
      } else if (diff <= 0) {
        next = meta.count || 1;
      } else {
        // gap > 1 day, treat as fresh streak starting at 1
        next = 1;
      }
    }

    const newMeta = { count: next, last: today };
    const newLogs = { ...logs, [today]: true };

    await Promise.all([
      AsyncStorage.setItem(META, JSON.stringify(newMeta)),
      AsyncStorage.setItem(LOGS, JSON.stringify(newLogs)),
    ]);

    setCount(next);
    setLast(today);
    setTodayChecked(true);
  }, []);

  const v = useMemo(
    () => ({
      loaded,
      count,
      todayChecked,
      lastDate: last,
      markToday,
      resetStreak,
    }),
    [loaded, count, todayChecked, last, markToday, resetStreak]
  );

  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useStreak() {
  const v = useContext(C);
  if (!v) throw new Error("useStreak must be used inside StreakProvider");
  return v;
}
