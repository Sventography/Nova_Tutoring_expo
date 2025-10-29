import AsyncStorage from "@react-native-async-storage/async-storage";

export type BestScore = {
  topicId: string;
  topicTitle: string;
  bestCorrect: number;
  total: number;
  updatedAt: number; // epoch ms
};

export type Attempt = {
  topicId: string;
  topicTitle: string;
  correct: number;
  total: number;
  at: number; // epoch ms
};

const KEY_BEST = "nova.quiz.best.v1";
const KEY_ATTEMPTS = "nova.quiz.attempts.v1";

/** get map of best scores per topic */
export async function getBestMap(): Promise<Record<string, BestScore>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BEST);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** set best map (internal) */
async function setBestMap(map: Record<string, BestScore>) {
  await AsyncStorage.setItem(KEY_BEST, JSON.stringify(map));
}

/** list of all attempts (newest first) */
export async function getAttempts(): Promise<Attempt[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ATTEMPTS);
    const list: Attempt[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** clear only attempts (keeps best scores) */
export async function clearAttempts(): Promise<void> {
  await AsyncStorage.setItem(KEY_ATTEMPTS, JSON.stringify([]));
}

/** record an attempt; also update best if beaten */
export async function recordQuizResult(args: {
  topicId: string;
  topicTitle: string;
  correct: number;
  total: number;
}): Promise<{ beatBest: boolean; best: BestScore }> {
  const now = Date.now();

  // append attempt
  try {
    const raw = await AsyncStorage.getItem(KEY_ATTEMPTS);
    const list: Attempt[] = raw ? JSON.parse(raw) : [];
    list.push({
      topicId: args.topicId,
      topicTitle: args.topicTitle,
      correct: args.correct,
      total: args.total,
      at: now,
    });
    await AsyncStorage.setItem(KEY_ATTEMPTS, JSON.stringify(list));
  } catch {}

  // update best per topic only if beaten
  const map = await getBestMap();
  const prev = map[args.topicId];
  const beatBest =
    !prev ||
    args.correct > prev.bestCorrect ||
    (args.correct === prev.bestCorrect && args.total > prev.total);

  const best: BestScore = beatBest
    ? { topicId: args.topicId, topicTitle: args.topicTitle, bestCorrect: args.correct, total: args.total, updatedAt: now }
    : prev || { topicId: args.topicId, topicTitle: args.topicTitle, bestCorrect: 0, total: args.total, updatedAt: now };

  if (beatBest) {
    map[args.topicId] = best;
    await setBestMap(map);
  }

  return { beatBest, best };
}
