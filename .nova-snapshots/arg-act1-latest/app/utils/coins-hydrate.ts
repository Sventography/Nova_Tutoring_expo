import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "@/state/wallet";

export async function hydrateWalletFromStorage() {
  const keys = ["@nova/coins_balance", "coins:balance:v1", "coins_balance"];
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    if (v && !isNaN(Number(v))) {
      useWallet.getState().setCoins(Number(v));
      return;
    }
  }
}
