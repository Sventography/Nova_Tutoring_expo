import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Prefs = {
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  username: string;
};
type Ctx = {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  resetProgress: () => Promise<void>;
  resetCollection: () => Promise<void>;
  resetAchievements: () => Promise<void>;
  resetCoins: () => Promise<void>;
  resetAll: () => Promise<void>;
};
const SettingsContext = createContext<Ctx>({
  prefs: { sound: true, haptics: true, animations: true, username: "" },
  setPrefs: () => {},
  resetProgress: async () => {},
  resetCollection: async () => {},
  resetAchievements: async () => {},
  resetCoins: async () => {},
  resetAll: async () => {},
});
const PREFS_KEY = "settings_prefs_v1";
export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [prefs, setPrefsState] = useState<Prefs>({
    sound: true,
    haptics: true,
    animations: true,
    username: "",
  });
  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem(PREFS_KEY);
      if (r) {
        setPrefsState(JSON.parse(r));
      }
    })();
  }, []);
  const setPrefs = (p: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const n = { ...prev, ...p };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(n));
      return n;
    });
  };
  const resetProgress = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const del = keys.filter((k) => k.startsWith("progress_"));
    if (del.length) await AsyncStorage.multiRemove(del);
  };
  const resetCollection = async () => {
    await AsyncStorage.removeItem("collection");
  };
  const resetAchievements = async () => {
    await AsyncStorage.removeItem("achievements_flags_v1");
  };
  const resetCoins = async () => {
    await AsyncStorage.removeItem("coins");
  };
  const resetAll = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const del = keys.filter((k) => k.startsWith("progress_"));
    await AsyncStorage.multiRemove([
      "collection",
      "achievements_flags_v1",
      "coins",
      "recent_topics",
      "favorite_topics",
      PREFS_KEY,
      ...del,
    ]);
    setPrefsState({
      sound: true,
      haptics: true,
      animations: true,
      username: "",
    });
  };
  const v = useMemo(
    () => ({
      prefs,
      setPrefs,
      resetProgress,
      resetCollection,
      resetAchievements,
      resetCoins,
      resetAll,
    }),
    [prefs],
  );
  return (
    <SettingsContext.Provider value={v}>{children}</SettingsContext.Provider>
  );
};
export const useSettings = () => useContext(SettingsContext);
