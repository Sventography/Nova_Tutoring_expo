// app/_lib/quizHistory.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type QuizHistoryEntry = {
  id: string;
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt: string; // ISO string
};

const KEY = "@nova/quizHistory.v1";

function normalizeEntry(raw: any): QuizHistoryEntry | null {
  if (!raw) return null;
  const topicId = String(raw.topicId || "");
  const title = String(raw.title || topicId || "Quiz");
  const total = Number(raw.total || 0);
  const correct = Number(raw.correct || 0);
  const percent =
    typeof raw.percent === "number"
      ? raw.percent
      : total
      ? Math.round((correct / total) * 100)
      : 0;
  const finishedAt =
    typeof raw.finishedAt === "string" && raw.finishedAt
      ? raw.finishedAt
      : new Date().toISOString();

  const id =
    typeof raw.id === "string" && raw.id
      ? raw.id
      : `${topicId || "quiz"}-${finishedAt}`;

  return {
    id,
    topicId,
    title,
    total,
    correct,
    percent,
    finishedAt,
  };
}

export async function getAll(): Promise<QuizHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    console.log("[quizHistory] raw =", raw);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    const normalized = arr
      .map(normalizeEntry)
      .filter(Boolean) as QuizHistoryEntry[];

    // newest first
    normalized.sort((a, b) =>
      a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0
    );

    console.log("[quizHistory] getAll ->", normalized.length, "entries");
    return normalized;
  } catch (err) {
    console.log("[quizHistory] getAll error", err);
    return [];
  }
}

type AddParams = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt?: string;
};

export async function add(e: AddParams) {
  const entry = normalizeEntry(e);
  if (!entry) return;

  console.log("[quizHistory.add] adding entry", entry);

  const list = await getAll();
  list.unshift(entry);
  const trimmed = list.slice(0, 200);

  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  console.log("[quizHistory.add] stored, new length =", trimmed.length);
}

export async function clear() {
  await AsyncStorage.removeItem(KEY);
}
