import AsyncStorage from "@react-native-async-storage/async-storage";

export const COLLECTIONS_KEY = "nova.collections.v1";

export type SavedCard = {
  topicId: string;
  q: string;
  a: string;
  savedAt: number;
};

export async function getCollection(): Promise<SavedCard[]> {
  try {
    const raw = await AsyncStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addToCollection(card: SavedCard): Promise<void> {
  const list = await getCollection();
  // avoid exact duplicates (same topic + Q + A)
  const exists = list.some(
    (c) => c.topicId === card.topicId && c.q === card.q && c.a === card.a
  );
  if (!exists) {
    list.unshift(card);
    await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(list));
  }
}

export async function clearCollection(): Promise<void> {
  await AsyncStorage.removeItem(COLLECTIONS_KEY);
}
