import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ACHIEVEMENT_EVENT = "unlock";

const STORAGE_KEY = "@nova/achievements.unlocked.v1";

type UnlockedMap = Record<string, number>;

type Listener = { remove: () => void };
type Ctx = {
  // 🔹 what the Achievements screen uses
  unlocked: UnlockedMap;

  // 🔹 generic actions
  unlock: (id: string) => void;
  celebrate: (msg: string) => void;
  on: (name: string, cb: (p?: any) => void) => Listener;
  emit: (name: string, payload?: any) => void;

  // 🔹 optional helpers used by the bridge/hooks (safe to be no-ops)
  onQuizFinished?: (scorePct: number, subject?: string) => void;
  incAsk?: () => void;
  incVoice?: () => void;
  onBrainsPair?: (bothCorrect: boolean) => void;
  onPurchase?: () => void;
  onDailyLogin?: () => void;
  onStreak?: (days: number) => void;
  onSetAvatar?: () => void;
};

export const AchieveEmitter = {
  addListener(name: string, cb: (payload?: any) => void): Listener {
    const s1 = DeviceEventEmitter.addListener(name, cb);
    const s2 = DeviceEventEmitter.addListener(`achieve:${name}`, cb);
    return {
      remove() {
        try {
          s1.remove();
        } catch {}
        try {
          s2.remove();
        } catch {}
      },
    };
  },
  emit(name: string, payload?: any) {
    try {
      DeviceEventEmitter.emit(name, payload);
    } catch {}
    try {
      DeviceEventEmitter.emit(`achieve:${name}`, payload);
    } catch {}
  },
};

const AchievementsContext = createContext<Ctx>({
  unlocked: {},

  unlock: (id: string) => {
    if (id) AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id });
  },
  celebrate: (msg: string) => {
    AchieveEmitter.emit("celebrate", msg);
  },
  on: (name: string, cb: (p?: any) => void) =>
    AchieveEmitter.addListener(name, cb),
  emit: (name: string, payload?: any) => AchieveEmitter.emit(name, payload),

  // default no-ops for helpers
  onQuizFinished: () => {},
  incAsk: () => {},
  incVoice: () => {},
  onBrainsPair: () => {},
  onPurchase: () => {},
  onDailyLogin: () => {},
  onStreak: () => {},
  onSetAvatar: () => {},
});

export function AchievementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState<UnlockedMap>({});

  // 🔹 Load previously unlocked achievements
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as UnlockedMap;
        if (mounted && parsed && typeof parsed === "object") {
          setUnlocked(parsed);
        }
      } catch (e) {
        console.warn("[achievements] load unlocked failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔹 Persist whenever unlocked map changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(unlocked || {})
        );
      } catch (e) {
        console.warn("[achievements] save unlocked failed", e);
      }
    })();
  }, [unlocked]);

  // 🔹 Listen to all ACHIEVEMENT_EVENT emissions and update unlocked[]
  useEffect(() => {
    const sub = AchieveEmitter.addListener(ACHIEVEMENT_EVENT, (p?: any) => {
      const id =
        p?.id ||
        p?.achievementId ||
        p?.key ||
        (typeof p === "string" ? p : undefined);
      if (!id) return;

      setUnlocked((prev) => {
        if (prev && prev[id]) return prev; // already marked
        const ts = Date.now();
        const next = { ...(prev || {}), [id]: ts };
        return next;
      });
    });
    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      unlocked,

      unlock: (id: string) => {
        if (!id) return;
        AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id });
      },
      celebrate: (msg: string) => {
        AchieveEmitter.emit("celebrate", msg);
      },
      on: (name: string, cb: (p?: any) => void) =>
        AchieveEmitter.addListener(name, cb),
      emit: (name: string, payload?: any) =>
        AchieveEmitter.emit(name, payload),

      // helpers just forward to namespaced events for now
      onQuizFinished: (scorePct: number, subject?: string) => {
        AchieveEmitter.emit("quiz:finished", { scorePct, subject });
      },
      incAsk: () => {
        AchieveEmitter.emit("ask:increment", {});
      },
      incVoice: () => {
        AchieveEmitter.emit("voice:increment", {});
      },
      onBrainsPair: (bothCorrect: boolean) => {
        AchieveEmitter.emit("brainteasers:pair", { bothCorrect });
      },
      onPurchase: () => {
        AchieveEmitter.emit("purchase:increment", {});
      },
      onDailyLogin: () => {
        AchieveEmitter.emit("daily_login", {});
      },
      onStreak: (days: number) => {
        AchieveEmitter.emit("streak:update", { days });
      },
      onSetAvatar: () => {
        AchieveEmitter.emit("set_avatar", {});
      },
    }),
    [unlocked]
  );

  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  return useContext(AchievementsContext);
}

export default AchievementsProvider;
