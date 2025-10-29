import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@nova:achievements:v1";

type AchState = {
  askCount: number;
  voiceCount: number;
  historyCount: number;
};

const DEFAULT_STATE: AchState = { askCount: 0, voiceCount: 0, historyCount: 0 };

async function loadState(): Promise<AchState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      askCount: Number(parsed.askCount ?? 0),
      voiceCount: Number(parsed.voiceCount ?? 0),
      historyCount: Number(parsed.historyCount ?? 0),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(s: AchState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export type AwardResult = {
  askCount?: number;
  voiceCount?: number;
  historyCount?: number;
  unlocked?: string[];
};

export async function awardAskQuestion(): Promise<AwardResult> {
  const state = await loadState();
  state.askCount += 1;

  const unlocked: string[] = [];
  if (state.askCount === 50) unlocked.push("🏅 50 questions — +100 coins!");
  if (state.askCount === 100) unlocked.push("🏆 100 questions — +250 coins!");

  await saveState(state);
  return { askCount: state.askCount, unlocked };
}

export async function awardVoiceUsed(): Promise<AwardResult> {
  const state = await loadState();
  state.voiceCount += 1;

  const unlocked: string[] = [];
  if (state.voiceCount === 1) unlocked.push("🎤 First voice input — +25 coins!");
  if (state.voiceCount === 25) unlocked.push("🎙️ 25 voice questions — +75 coins!");

  await saveState(state);
  return { voiceCount: state.voiceCount, unlocked };
}

export async function awardHistoryOpen(): Promise<AwardResult> {
  const state = await loadState();
  state.historyCount += 1;

  const unlocked: string[] = [];
  if (state.historyCount === 1) unlocked.push("📜 First time viewing History!");

  await saveState(state);
  return { historyCount: state.historyCount, unlocked };
}

export async function getAchievementTotals(): Promise<AchState> {
  return loadState();
}
