import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedCard = {
  id: string;
  topic: string;
  front: string;
  back: string;
  custom?: boolean;
};

const KEY = "saved:v2";

export async function getSaved(): Promise<SavedCard[]> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

export async function setSaved(arr: SavedCard[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
}

export async function addSaved(card: Omit<SavedCard, "id">) {
  const arr = await getSaved();
  const item: SavedCard = { ...card, id: String(Date.now()) };
  arr.unshift(item);
  await setSaved(arr);
  return item;
}

export async function removeSaved(id: string) {
  const arr = await getSaved();
  await setSaved(arr.filter((x) => x.id !== id));
}

export async function clearSaved() {
  await setSaved([]);
}
