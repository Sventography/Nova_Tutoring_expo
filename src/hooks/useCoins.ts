import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { getWallet } from "@lib/wallet";

export function useCoins() {
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const w = await getWallet();
      if (mounted) setCoins(w.coins);
    })();

    const update = async () => {
      const w = await getWallet();
      setCoins(w.coins);
    };

    const events = ["NT_WALLET_CHANGED", "wallet:changed", "wallet_changed"];
    const subs = events.map((e) => DeviceEventEmitter.addListener(e, update));

    return () => {
      mounted = false;
      subs.forEach((s) => s.remove());
    };
  }, []);

  return coins;
}
