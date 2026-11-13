// app/_lib/economy.ts

/**
 * Nova Tutoring economy foundation.
 *
 * Keep important progression/reward numbers here so we can rebalance
 * the economy without hunting through the entire app.
 */

export const NOVA_ECONOMY_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* COINS                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Base coins for one correct quiz answer.
 *
 * Legendary bonuses are applied AFTER this by useLegendaryCompanions.
 */
export const QUIZ_CORRECT_BASE_COINS = 5;

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
