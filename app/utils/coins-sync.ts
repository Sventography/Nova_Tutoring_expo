import AsyncStorage from "@react-native-async-storage/async-storage";
export async function loadCoinsFromStorage(): Promise<number> {
  const s = await AsyncStorage.getItem("coins_balance");
  return s ? Number(s) : 0;
}
