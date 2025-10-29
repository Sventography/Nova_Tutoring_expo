import AsyncStorage from "@react-native-async-storage/async-storage";

export type QuizEntry = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt: string;
};

const KEY = "@nova/quizHistory.v1";

export async function getAll(): Promise<QuizEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function add(e: QuizEntry) {
  const list = await getAll();
  list.unshift(e);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

export async function clear() {
  await AsyncStorage.removeItem(KEY);
}
