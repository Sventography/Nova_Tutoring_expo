import React, { createContext, useMemo, useContext } from "react";
import { DeviceEventEmitter } from "react-native";

export const ACHIEVEMENT_EVENT = "unlock";

type Listener = { remove: () => void };
type Ctx = {
  unlock: (id: string) => void;
  celebrate: (msg: string) => void;
  on: (name: string, cb: (p?: any) => void) => Listener;
  emit: (name: string, payload?: any) => void;
};

export const AchieveEmitter = {
  addListener(name: string, cb: (payload?: any) => void): Listener {
    const s1 = DeviceEventEmitter.addListener(name, cb);
    const s2 = DeviceEventEmitter.addListener(`achieve:${name}`, cb);
    return { remove() { try { s1.remove(); } catch {} try { s2.remove(); } catch {} } };
  },
  emit(name: string, payload?: any) {
    try { DeviceEventEmitter.emit(name, payload); } catch {}
    try { DeviceEventEmitter.emit(`achieve:${name}`, payload); } catch {}
  }
};

const AchievementsContext = createContext<Ctx>({
  unlock: (id: string) => { if (id) AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id }); },
  celebrate: (msg: string) => { AchieveEmitter.emit("celebrate", msg); },
  on: (name: string, cb: (p?: any) => void) => AchieveEmitter.addListener(name, cb),
  emit: (name: string, payload?: any) => AchieveEmitter.emit(name, payload),
});

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => ({
    unlock: (id: string) => { if (id) AchieveEmitter.emit(ACHIEVEMENT_EVENT, { id }); },
    celebrate: (msg: string) => { AchieveEmitter.emit("celebrate", msg); },
    on: (name: string, cb: (p?: any) => void) => AchieveEmitter.addListener(name, cb),
    emit: (name: string, payload?: any) => AchieveEmitter.emit(name, payload),
  }), []);

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
