// app/_lib/economy.ts

/**
 * Nova Tutoring economy foundation.
 *
 * Keep important progression/reward numbers here so we can rebalance
 * the economy without hunting through the entire app.
 */

export const NOVA_ECONOMY_VERSION = 2;

/* -------------------------------------------------------------------------- */
/* QUIZ COINS                                                                 */
/* -------------------------------------------------------------------------- */

/** Base Nova Coins for one correct quiz answer before Legendary bonuses. */
export const QUIZ_CORRECT_BASE_COINS = 5;

/**
 * Normal correct-answer coins that one topic can contribute each day.
 * At 5 base coins per correct answer, 100 base coins = 20 correct answers.
 */
export const QUIZ_TOPIC_DAILY_BASE_COIN_LIMIT = 100;

/**
 * Normal correct-answer coins that all quizzes together can contribute daily.
 * At 5 base coins per correct answer, 500 base coins = 100 correct answers.
 *
 * Legendary bonuses are allowed on top of this base quota so powers like
 * Aetherwyrm remain genuinely valuable.
 */
export const QUIZ_DAILY_BASE_COIN_LIMIT = 500;

/**
 * A full bonus for a perfect quiz. This is separate from the normal answer
 * quota and can be earned once per topic per local calendar day.
 */
export const QUIZ_DAILY_PERFECT_BASE_BONUS = 50;

/* -------------------------------------------------------------------------- */
/* DAILY STREAK COINS                                                         */
/* -------------------------------------------------------------------------- */

export const DAILY_STREAK_START_BASE_COINS = 5;
export const DAILY_STREAK_STEP_BASE_COINS = 2;
export const DAILY_STREAK_MAX_BASE_COINS = 50;

/**
 * Daily streak payout:
 * Day 1 = 5
 * Day 2 = 7
 * Day 3 = 9
 * ...
 * Day 24+ = 50 max
 */
export function dailyStreakBaseCoins(streakDays: number): number {
  const days = Math.max(
    1,
    Math.floor(Number(streakDays) || 1)
  );

  return Math.min(
    DAILY_STREAK_MAX_BASE_COINS,
    DAILY_STREAK_START_BASE_COINS +
      (days - 1) * DAILY_STREAK_STEP_BASE_COINS
  );
}

/**
 * One-time streak achievement bonuses. These are intentionally separate from
 * the everyday streak payout and grow with the accomplishment.
 */
export const STREAK_ACHIEVEMENT_BASE_COINS: Record<number, number> = {
  2: 20,
  3: 30,
  5: 50,
  7: 75,
  10: 100,
  14: 150,
  21: 225,
  30: 350,
  50: 500,
  75: 750,
  100: 1000,
  150: 1500,
  200: 2000,
  250: 2500,
  300: 3000,
  365: 3650,
};

export function streakAchievementBaseCoins(
  streakDays: number
): number {
  const days = Math.max(
    0,
    Math.floor(Number(streakDays) || 0)
  );

  return STREAK_ACHIEVEMENT_BASE_COINS[days] ?? 0;
}

/* -------------------------------------------------------------------------- */
/* NOVA XP / ACCOUNT LEVEL                                                    */
/* -------------------------------------------------------------------------- */

/**
 * XP required to advance FROM the supplied Nova Level.
 *
 * Early progression is intentionally quick, while later progression
 * becomes increasingly meaningful instead of remaining linear forever.
 */
export function novaLevelXpRequired(
  level: number
): number {
  const safeLevel = Math.max(
    1,
    Math.floor(Number(level) || 1)
  );

  const completedLevels = safeLevel - 1;

  return Math.round(
    100 +
      20 *
        Math.pow(
          completedLevels,
          1.65
        )
  );
}

/**
 * Performance XP on a completed quiz.
 *
 * This is XP, not Nova Coins. XP can be more generous because it cannot
 * directly purchase Shop merchandise.
 */
export function novaQuizScoreXpBonus(
  percent: number
): number {
  const pct = Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(percent) || 0)
    )
  );

  if (pct === 100) return 35;
  if (pct >= 90) return 20;
  if (pct >= 80) return 12;
  if (pct >= 70) return 6;

  return 0;
}

/**
 * First completed quiz for a topic each day:
 *   30 base XP + performance bonus.
 *
 * Repeating that same topic during the same day:
 *   5 practice XP.
 *
 * This keeps practice worthwhile without making one repeated quiz the
 * fastest way to grind account levels.
 */
export function novaQuizXpAward(
  scorePercent: number,
  fullReward: boolean
): number {
  if (!fullReward) {
    return 5;
  }

  return (
    30 +
    novaQuizScoreXpBonus(
      scorePercent
    )
  );
}
