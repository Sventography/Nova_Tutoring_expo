import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nova.collection.v1";

export type SavedCard = {
  topicId: string;
  topicTitle: string;
  question: string;
  answer: string;
  savedAt?: number;
};

export async function addToCollection(card: SavedCard) {
  const raw = await AsyncStorage.getItem(KEY);
  const list: SavedCard[] = raw ? JSON.parse(raw) : [];
  list.unshift({ ...card, savedAt: Date.now() });
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return true;
}

export async function getCollection(): Promise<SavedCard[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}
