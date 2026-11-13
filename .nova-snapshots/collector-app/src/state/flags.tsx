import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FlagsContextType = {
  devUnlocked: boolean;
  setDevUnlocked: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const FlagsContext = createContext<FlagsContextType | null>(null);
const KEY = "nova.flags.dev.unlocked.v1";

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [devUnlocked, setDevUnlockedState] = useState(false);

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      setDevUnlockedState(raw === "1");
    } catch {
      setDevUnlockedState(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setDevUnlocked = async (v: boolean) => {
    setDevUnlockedState(v);
    await AsyncStorage.setItem(KEY, v ? "1" : "0");
  };

  const value = useMemo<FlagsContextType>(
    () => ({
      devUnlocked,
      setDevUnlocked,
      refresh: load,
    }),
    [devUnlocked],
  );

  return (
    <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>
  );
}

export function useFlags() {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error("useFlags must be used inside <FlagsProvider>");
  return ctx;
}
