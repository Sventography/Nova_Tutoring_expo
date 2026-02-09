export type Achievement = {
  id: string;
  title: string;
  desc?: string;
  coins: number;
  group: string;
};

const REGULAR_MULTIPLIER = 10;
const LEGENDARY_MULTIPLIER = 3;
const LEGENDARY_THRESHOLD = 250;

function make(
  id: string,
  title: string,
  coins: number,
  group: string,
  desc?: string
): Achievement {
  return { id, title, coins, group, desc };
}

export function buildAchievements() {
  const list: Achievement[] = [];

  list.push(
    make("ask_1","First Question",10,"ask"),
    make("ask_10","Curious Mind",25,"ask"),
    make("quiz_total_1","First Quiz",20,"quiz"),
    make("quiz_score_80","Quiz 80%",100,"quiz"),
    make("quiz_score_100","Perfect Quiz",250,"quiz"),
    make("streak_7","7 Day Streak",80,"streaks"),
    make("relax_10","Relaxed",40,"relax")
  );

  /* ===== APPLY ECONOMY MULTIPLIERS ===== */
  for (const a of list) {
    const legendary = a.coins >= LEGENDARY_THRESHOLD;
    a.coins = legendary
      ? a.coins * LEGENDARY_MULTIPLIER
      : a.coins * REGULAR_MULTIPLIER;
  }

  const map: Record<string, Achievement> = {};
  for (const a of list) map[a.id] = a;

  return { LIST: list, MAP: map };
}

const BUILT = buildAchievements();
export const ACHIEVEMENT_LIST = BUILT.LIST;
export const ACHIEVEMENTS = BUILT.MAP;
