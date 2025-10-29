import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nova/coins.v1";

export default function useUnifiedCoins(pollMs: number = 700) {
  const [coins, setCoins] = useState(0);
  const t = useRef<any>(null);

  const read = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const v = raw ? parseInt(raw, 10) : 0;
      setCoins(Number.isFinite(v) ? v : 0);
    } catch {
      setCoins(0);
    }
  };

  useEffect(() => {
    read();
    t.current = setInterval(read, pollMs);
    return () => t.current && clearInterval(t.current);
  }, [pollMs]);

  return coins;
}
