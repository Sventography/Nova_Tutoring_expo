import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "user:collections:v1";

export type SavedCard = {
  id: string;           // e.g., `${topicId}:${cardId}`
  topicId?: string;
  title?: string;       // front text
  back?: string;        // back text
  addedAt: number;
};

async function readAll(): Promise<Record<string, SavedCard>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeAll(map: Record<string, SavedCard>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function hasCard(id: string): Promise<boolean> {
  const map = await readAll();
  return Boolean(map[id]);
}

export async function addCard(card: SavedCard): Promise<void> {
  const map = await readAll();
  map[card.id] = { ...card, addedAt: Date.now() };
  await writeAll(map);
}

export async function removeCard(id: string): Promise<void> {
  const map = await readAll();
  if (map[id]) {
    delete map[id];
    await writeAll(map);
  }
}

export async function listCards(): Promise<SavedCard[]> {
  const map = await readAll();
  return Object.values(map).sort((a,b)=>b.addedAt - a.addedAt);
}
