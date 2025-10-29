export type Tier = "bronze" | "silver" | "gold" | "diamond";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  tier: Tier;
  coins: number;
  icon?: string; // Ionicons name
  rule:
    | "firstQuiz"
    | "quizStreak5"
    | "persistence10"
    | "score90"
    | "quizMaster100"
    | "avg80"
    | "speedDemon"
    | "save10"
    | "save25"
    | "brainteasersPerfect"
    | "voiceStarter"
    | "voicePro"
    | "ask50"
    | "ask100"
    | "shopper"
    | "collector5"
    | "avatarSet"
    | "themeApplied";
};

export type AchievementState = Achievement & {
  unlocked: boolean;
  progressText?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id:"first-quiz", title:"First Quiz", desc:"Finish one quiz", tier:"bronze", coins:10, icon:"trophy-outline", rule:"firstQuiz" },
  { id:"streak-5", title:"Quiz Streak 5", desc:"Finish 5 total quizzes", tier:"silver", coins:20, icon:"footsteps-outline", rule:"quizStreak5" },
  { id:"persistence-10", title:"Persistence", desc:"Finish 10 quizzes", tier:"silver", coins:25, icon:"repeat-outline", rule:"persistence10" },
  { id:"score-90", title:"Score 90%+", desc:"Earn ≥ 90% once", tier:"gold", coins:30, icon:"star-outline", rule:"score90" },
  { id:"quiz-master", title:"Quiz Master", desc:"Score 100% on a quiz", tier:"diamond", coins:50, icon:"ribbon-outline", rule:"quizMaster100" },
  { id:"avg-80", title:"Average 80%+", desc:"Average score ≥ 80%", tier:"gold", coins:30, icon:"podium-outline", rule:"avg80" },
  { id:"speed-demon", title:"Speed Demon", desc:"Finish a quiz in ≤ 60s with ≥ 80%", tier:"gold", coins:40, icon:"flash-outline", rule:"speedDemon" },

  { id:"save-10", title:"Saved 10 Cards", desc:"Save 10 flashcards", tier:"bronze", coins:10, icon:"bookmark-outline", rule:"save10" },
  { id:"save-25", title:"Saved 25 Cards", desc:"Save 25 flashcards", tier:"silver", coins:25, icon:"book-outline", rule:"save25" },

  { id:"brainteasers-perfect", title:"Brainteasers Perfect", desc:"Get both daily brainteasers correct", tier:"gold", coins:25, icon:"bulb-outline", rule:"brainteasersPerfect" },

  { id:"voice-starter", title:"Voice Starter", desc:"Ask your first voice question", tier:"bronze", coins:25, icon:"mic-outline", rule:"voiceStarter" },
  { id:"voice-pro", title:"Voice Pro", desc:"Ask 25 voice questions", tier:"silver", coins:75, icon:"mic-circle-outline", rule:"voicePro" },

  { id:"ask-50", title:"Curious Mind", desc:"Ask 50 questions", tier:"silver", coins:100, icon:"chatbubbles-outline", rule:"ask50" },
  { id:"ask-100", title:"Relentless Learner", desc:"Ask 100 questions", tier:"gold", coins:250, icon:"chatbubble-ellipses-outline", rule:"ask100" },

  { id:"shopper", title:"Shopper", desc:"Make a purchase in the shop", tier:"bronze", coins:10, icon:"bag-handle-outline", rule:"shopper" },
  { id:"collector-5", title:"Collector", desc:"Own 5+ items", tier:"silver", coins:20, icon:"albums-outline", rule:"collector5" },

  { id:"avatar-set", title:"All Set", desc:"Add a profile avatar", tier:"bronze", coins:5, icon:"person-circle-outline", rule:"avatarSet" },
  { id:"theme-applied", title:"Themed Out", desc:"Apply a custom theme", tier:"bronze", coins:5, icon:"color-palette-outline", rule:"themeApplied" },
];

// palette per tier for glows
export const TIER_COLORS: Record<Tier, string> = {
  bronze: "#c07a2b",
  silver: "#a9b9c9",
  gold: "#ffd166",
  diamond: "#39FF14",
};

export type AchievementStats = {
  quizzesCompleted?: number;
  bestPercent?: number;
  avgPercent?: number;
  fastestGoodSeconds?: number; // best time for a quiz with ≥80% (seconds)
  flashSaved?: number;
  brainteasersPerfectDays?: number;

  voiceQuestions?: number;
  asksCount?: number;
  purchasesCount?: number;
  itemsOwned?: number;
  avatarSet?: boolean;
  themeApplied?: boolean;
};

function v(n?: number){ return typeof n === "number" ? n : 0; }
function b(x?: boolean){ return !!x; }

export function evaluateAchievements(stats: AchievementStats): AchievementState[] {
  const quizzes = v(stats.quizzesCompleted);
  const best = v(stats.bestPercent);
  const avg = v(stats.avgPercent);
  const fastest = v(stats.fastestGoodSeconds);
  const saved = v(stats.flashSaved);
  const daysPerfect = v(stats.brainteasersPerfectDays);
  const voice = v(stats.voiceQuestions);
  const asks = v(stats.asksCount);
  const buys = v(stats.purchasesCount);
  const owned = v(stats.itemsOwned);
  const hasAvatar = b(stats.avatarSet);
  const hasTheme = b(stats.themeApplied);

  const byRule = {
    firstQuiz:            { unlocked: quizzes >= 1,  progress:`${quizzes}/1` },
    quizStreak5:          { unlocked: quizzes >= 5,  progress:`${quizzes}/5` },
    persistence10:        { unlocked: quizzes >= 10, progress:`${quizzes}/10` },
    score90:              { unlocked: best >= 90,     progress:`Best ${best}%` },
    quizMaster100:        { unlocked: best >= 100,    progress:`Best ${best}%` },
    avg80:                { unlocked: avg >= 80,      progress:`Avg ${avg}%` },
    speedDemon:           { unlocked: (best >= 80 && (fastest > 0 && fastest <= 60)), progress: fastest ? `${fastest}s` : undefined },

    save10:               { unlocked: saved >= 10,    progress:`${saved}/10` },
    save25:               { unlocked: saved >= 25,    progress:`${saved}/25` },

    brainteasersPerfect:  { unlocked: daysPerfect >= 1, progress: daysPerfect ? `${daysPerfect} day(s)` : undefined },

    voiceStarter:         { unlocked: voice >= 1,     progress:`${voice}/1` },
    voicePro:             { unlocked: voice >= 25,    progress:`${voice}/25` },

    ask50:                { unlocked: asks >= 50,     progress:`${asks}/50` },
    ask100:               { unlocked: asks >= 100,    progress:`${asks}/100` },

    shopper:              { unlocked: buys >= 1,      progress:`${buys}/1` },
    collector5:           { unlocked: owned >= 5,     progress:`${owned}/5` },

    avatarSet:            { unlocked: hasAvatar,      progress: hasAvatar ? "Done" : "0%" },
    themeApplied:         { unlocked: hasTheme,       progress: hasTheme ? "Done" : "0%" },
  } as const;

  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: (byRule as any)[a.rule].unlocked,
    progressText: (byRule as any)[a.rule].progress,
  }));
}
