import AsyncStorage from "@react-native-async-storage/async-storage";

export async function grantCoins(amount: number = 100000) {
  const v = await AsyncStorage.getItem("@nova/coins.v1");
  const cur = v ? parseInt(v, 10) : 0;
  const next = cur + amount;
  await AsyncStorage.setItem("@nova/coins.v1", String(next));
  console.log(`💰 granted +${amount} → total ${next}`);
}

if (__DEV__) {
  grantCoins();
}
