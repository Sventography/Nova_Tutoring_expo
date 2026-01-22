import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isSSR = typeof window === "undefined";

// A small, stable bridge used by quiz screens.
// Stores a "last quiz" snapshot + appends to a history list.
const LAST_KEY = "@nova/quiz.last.v1";
const LIST_KEY = "@nova/quiz.history.v1";

export type QuizHistoryItem = {
  topicId?: string;
  topicTitle?: string;
  scorePct: number;
  correct?: number;
  total?: number;
  finishedAtISO: string;
};

export async function writeLastQuiz(item: QuizHistoryItem) {
  if (Platform.OS === "web" && isSSR) return;
  try {
    await AsyncStorage.setItem(LAST_KEY, JSON.stringify(item));
  } catch {}
}

export async function readLastQuiz(): Promise<QuizHistoryItem | null> {
  if (Platform.OS === "web" && isSSR) return null;
  try {
    const raw = await AsyncStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as QuizHistoryItem) : null;
  } catch {
    return null;
  }
}

export async function appendQuizHistory(item: QuizHistoryItem) {
  if (Platform.OS === "web" && isSSR) return;
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(arr) ? [item, ...arr].slice(0, 300) : [item];
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {}
}

export async function readQuizHistory(): Promise<QuizHistoryItem[]> {
  if (Platform.OS === "web" && isSSR) return [];
  try {
    const raw = await AsyncStorage.getItem(LIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as QuizHistoryItem[]) : [];
  } catch {
    return [];
  }
}
