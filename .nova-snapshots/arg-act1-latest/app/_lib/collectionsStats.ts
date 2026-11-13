import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "@nova/collections/savedCount.v1";

export async function incrFlashSaved(by:number=1) {
  const cur = parseInt((await AsyncStorage.getItem(KEY))||"0",10)||0;
  const next = cur + Math.max(0, by);
  await AsyncStorage.setItem(KEY, String(next));
  return next;
}

export async function getFlashSavedTotal() {
  const cur = parseInt((await AsyncStorage.getItem(KEY))||"0",10)||0;
  return cur;
}
