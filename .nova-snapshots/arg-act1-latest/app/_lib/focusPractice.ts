// app/_lib/focusPractice.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const LEGACY_KEY = "@nova/focusPractice.v1";

async function getScopedFocusPracticeKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    return userId ? `${LEGACY_KEY}:${userId}` : `${LEGACY_KEY}:guest`;
  } catch {
    return `${LEGACY_KEY}:guest`;
  }
}

async function readFocusPracticeRaw(): Promise<string | null> {
  const key = await getScopedFocusPracticeKey();
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
const MAX_ITEMS = 500;

export type FocusPracticeMistake = {
  id: string;
  topicId: string;
  topicTitle: string;
  question: string;
  correctAnswer: string;
  lastChosenAnswer: string;
  choices: string[];
  missCount: number;
  correctAfterMissCount: number;
  firstMissedAt: string;
  lastMissedAt: string;
  lastCorrectAt?: string;
};

type RecordMistakeParams = {
  topicId: string;
  topicTitle: string;
  question: string;
  correctAnswer: string;
  chosenAnswer: string;
  choices?: string[];
};

type RecordCorrectParams = {
  topicId: string;
  question: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function mistakeId(topicId: string, question: string): string {
  const raw = `${clean(topicId)}::${clean(question)}`.toLowerCase();
  let hash = 2166136261;

  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `focus-${(hash >>> 0).toString(16)}`;
}

function normalize(raw: any): FocusPracticeMistake | null {
  if (!raw || typeof raw !== "object") return null;

  const topicId = clean(raw.topicId);
  const question = clean(raw.question);
  const correctAnswer = clean(raw.correctAnswer);

  if (!topicId || !question || !correctAnswer) return null;

  const now = new Date().toISOString();

  return {
    id: clean(raw.id) || mistakeId(topicId, question),
    topicId,
    topicTitle: clean(raw.topicTitle) || topicId,
    question,
    correctAnswer,
    lastChosenAnswer: clean(raw.lastChosenAnswer),
    choices: Array.isArray(raw.choices)
      ? raw.choices.map(clean).filter(Boolean)
      : [],
    missCount: Math.max(1, Number(raw.missCount || 1)),
    correctAfterMissCount: Math.max(
      0,
      Number(raw.correctAfterMissCount || 0)
    ),
    firstMissedAt: clean(raw.firstMissedAt) || now,
    lastMissedAt: clean(raw.lastMissedAt) || now,
    lastCorrectAt: clean(raw.lastCorrectAt) || undefined,
  };
}

export async function getFocusMistakes(): Promise<FocusPracticeMistake[]> {
  try {
    const raw = await readFocusPracticeRaw();
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalize)
      .filter(Boolean) as FocusPracticeMistake[];
  } catch (error) {
    console.warn("[FocusPractice] load failed", error);
    return [];
  }
}

async function saveFocusMistakes(items: FocusPracticeMistake[]) {
  const sorted = [...items]
    .sort((a, b) =>
      a.lastMissedAt < b.lastMissedAt
        ? 1
        : a.lastMissedAt > b.lastMissedAt
        ? -1
        : 0
    )
    .slice(0, MAX_ITEMS);

  const key = await getScopedFocusPracticeKey();
  await AsyncStorage.setItem(key, JSON.stringify(sorted));
}

export async function recordFocusMistake(
  params: RecordMistakeParams
): Promise<void> {
  const topicId = clean(params.topicId);
  const topicTitle = clean(params.topicTitle) || topicId;
  const question = clean(params.question);
  const correctAnswer = clean(params.correctAnswer);
  const chosenAnswer = clean(params.chosenAnswer);

  if (!topicId || !question || !correctAnswer) return;

  const id = mistakeId(topicId, question);
  const now = new Date().toISOString();
  const items = await getFocusMistakes();
  const existingIndex = items.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];

    items[existingIndex] = {
      ...existing,
      topicTitle,
      correctAnswer,
      lastChosenAnswer: chosenAnswer,
      choices: Array.isArray(params.choices)
        ? params.choices.map(clean).filter(Boolean)
        : existing.choices,
      missCount: existing.missCount + 1,
      lastMissedAt: now,
    };
  } else {
    items.unshift({
      id,
      topicId,
      topicTitle,
      question,
      correctAnswer,
      lastChosenAnswer: chosenAnswer,
      choices: Array.isArray(params.choices)
        ? params.choices.map(clean).filter(Boolean)
        : [],
      missCount: 1,
      correctAfterMissCount: 0,
      firstMissedAt: now,
      lastMissedAt: now,
    });
  }

  await saveFocusMistakes(items);
}

export async function recordFocusCorrect(
  params: RecordCorrectParams
): Promise<void> {
  const topicId = clean(params.topicId);
  const question = clean(params.question);

  if (!topicId || !question) return;

  const id = mistakeId(topicId, question);
  const items = await getFocusMistakes();
  const index = items.findIndex((item) => item.id === id);

  if (index < 0) return;

  const existing = items[index];
  items[index] = {
    ...existing,
    correctAfterMissCount: existing.correctAfterMissCount + 1,
    lastCorrectAt: new Date().toISOString(),
  };

  await saveFocusMistakes(items);
}

export async function clearFocusMistakes(): Promise<void> {
  const key = await getScopedFocusPracticeKey();
  await AsyncStorage.removeItem(key);
}
