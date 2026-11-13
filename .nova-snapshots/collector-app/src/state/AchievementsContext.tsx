import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Flags = { [k: string]: boolean };
type Ctx = {
  flags: Flags;
  unlock: (key: string) => boolean;
  has: (key: string) => boolean;
};
const AchievementsContext = createContext<Ctx>({
  flags: {},
  unlock: () => false,
  has: () => false,
});
const KEY = "achievements_flags_v1";
export const AchievementsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [flags, setFlags] = useState<Flags>({});
  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem(KEY);
      if (r) setFlags(JSON.parse(r));
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(flags));
  }, [flags]);
  const has = (key: string) => !!flags[key];
  const unlock = (key: string) => {
    if (flags[key]) return false;
    setFlags((f) => ({ ...f, [key]: true }));
    return true;
  };
  const v = useMemo(() => ({ flags, unlock, has }), [flags]);
  return (
    <AchievementsContext.Provider value={v}>
      {children}
    </AchievementsContext.Provider>
  );
};
export const useAchievements = () => useContext(AchievementsContext);
