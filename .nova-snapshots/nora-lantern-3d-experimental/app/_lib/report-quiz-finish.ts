import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Payload = {
  topicId?: string;
  topicTitle?: string;
  scorePct: number;
  correct?: number;
  total?: number;
  finishedAtISO?: string;
  username?: string;
};

const KEY = "@nova/quizHistory.v1";

// Safe on web/SSR: AsyncStorage web impl needs window at runtime, but this runs in browser (not Node).
// Still, keep a guard for SSR/bundler edge cases.
const isSSR = typeof window === "undefined";

export async function reportQuizFinished(p: Payload) {
  if (Platform.OS === "web" && isSSR) return;

  try {
    const finishedAtISO = p.finishedAtISO || new Date().toISOString();

    const rec = {
      topicId: p.topicId || "",
      topicTitle: p.topicTitle || "",
      scorePct: Number(p.scorePct || 0),
      correct: typeof p.correct === "number" ? p.correct : undefined,
      total: typeof p.total === "number" ? p.total : undefined,
      finishedAtISO,
      username: p.username || "",
    };

    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(arr) ? [rec, ...arr].slice(0, 200) : [rec];

    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return rec;
  } catch {
    return null;
  }
}
