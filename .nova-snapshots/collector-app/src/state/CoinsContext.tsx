import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Ctx = {
  coins: number;
  add: (n: number) => void;
  set: (n: number) => void;
};
const CoinsContext = createContext<Ctx>({
  coins: 0,
  add: () => {},
  set: () => {},
});
export const CoinsProvider = ({ children }: { children: React.ReactNode }) => {
  const [coins, setCoins] = useState(0);
  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem("coins");
      if (r) setCoins(parseInt(r, 10) || 0);
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem("coins", String(coins));
  }, [coins]);
  const add = (n: number) => setCoins((c) => c + n);
  const set = (n: number) => setCoins(n);
  const v = useMemo(() => ({ coins, add, set }), [coins]);
  return <CoinsContext.Provider value={v}>{children}</CoinsContext.Provider>;
};
export const useCoins = () => useContext(CoinsContext);
