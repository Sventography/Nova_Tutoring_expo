import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nova/purchases";

export async function safeAppendPurchase(purchase: any) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(purchase);
    await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  } catch (e) {
    console.error("appendPurchase error", e);
  }
}

export async function getPurchases(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

