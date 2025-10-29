import AsyncStorage from "@react-native-async-storage/async-storage";

const COINS = 250000; // ← set your test coins here

(async () => {
  try {
    await AsyncStorage.setItem("@nova/coins", String(COINS));
    await AsyncStorage.setItem("@nova/dev_coinseed_at", String(Date.now()));
    // eslint-disable-next-line no-console
    console.log("✅ Dev coin seed set to", COINS);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("seed_coins error:", e);
  }
})();
