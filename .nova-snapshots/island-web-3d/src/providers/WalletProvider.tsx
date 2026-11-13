import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

type WalletContextType = {
  coins: number;
  loading: boolean;
  addCoins: (amount: number, reason?: string) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  buyCoinPack: (packId: "small" | "medium" | "large") => Promise<void>;
  isOwned: (itemId: string) => Promise<boolean>;
  markOwned: (itemId: string) => Promise<void>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const COINS_KEY = "wallet:coins";
const OWNED_PREFIX = "owned:";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(COINS_KEY);
        setCoins(v ? parseInt(v, 10) : 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (value: number) => {
    setCoins(value);
    await AsyncStorage.setItem(COINS_KEY, String(value));
  };

  const addCoins = async (amount: number) => {
    const next = Math.max(0, coins + amount);
    await persist(next);
    try {
      await Haptics.selectionAsync();
    } catch {}
  };

  const spendCoins = async (amount: number) => {
    if (coins < amount) return false;
    const next = coins - amount;
    await persist(next);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    return true;
  };

  const buyCoinPack = async (packId: "small" | "medium" | "large") => {
    const map = { small: 300, medium: 900, large: 2200 };
    const amt = map[packId] ?? 0;
    await addCoins(amt);
  };

  const isOwned = async (itemId: string) =>
    (await AsyncStorage.getItem(OWNED_PREFIX + itemId)) === "1";
  const markOwned = async (itemId: string) => {
    await AsyncStorage.setItem(OWNED_PREFIX + itemId, "1");
  };

  const value = useMemo(
    () => ({
      coins,
      loading,
      addCoins,
      spendCoins,
      buyCoinPack,
      isOwned,
      markOwned,
    }),
    [coins, loading],
  );
  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
