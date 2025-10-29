export function coinsForAchievement(id?: string): number {
  if (!id) return 0;
  const map: Record<string, number> = {
    daily_login_1: 25,
    streak_7: 100,
    streak_30: 300,
    quiz_score_80: 100,
    quiz_fast_120: 75,
    quiz_fast_60: 125,
    flashcards_saved_10: 50,
    flashcards_saved_50: 150,
    flashcards_saved_100: 400,
    flashcards_created_10: 50,
    flashcards_created_50: 200,
    first_voice_input: 25,
    voice_25: 75,
    ask_50: 100,
    ask_100: 250
  };
  return map[id] ?? 25;
}
