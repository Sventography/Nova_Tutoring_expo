// app/_lib/quizHistory.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export type QuizHistoryEntry = {
  id: string;
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
  finishedAt: string; // ISO string
};

const LEGACY_KEY = "@nova/quizHistory.v1";

async function getScopedQuizHistoryKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    return userId ? `${LEGACY_KEY}:${userId}` : `${LEGACY_KEY}:guest`;
  } catch {
    return `${LEGACY_KEY}:guest`;
  }
}

async function readQuizHistoryRaw(): Promise<string | null> {
  const key = await getScopedQuizHistoryKey();
  const scoped = await AsyncStorage.getItem(key);
  if (scoped !== null) return scoped;
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy !== null) {
    await AsyncStorage.setItem(key, legacy);
    await AsyncStorage.removeItem(LEGACY_KEY);
    return legacy;
  }
  return null;
}

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
    const raw = await readQuizHistoryRaw();
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

  const key = await getScopedQuizHistoryKey();
  await AsyncStorage.setItem(key, JSON.stringify(trimmed));
  console.log("[quizHistory.add] stored, new length =", trimmed.length);
}

export async function clear() {
  const key = await getScopedQuizHistoryKey();
  await AsyncStorage.removeItem(key);
}
