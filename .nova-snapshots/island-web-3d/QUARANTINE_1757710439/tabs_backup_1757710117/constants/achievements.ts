export type Difficulty = "easy" | "medium" | "hard" | "legendary";
export type Condition =
  | {
      type: "counter";
      key:
        | "ask_questions"
        | "quizzes_completed"
        | "perfect_quizzes"
        | "voice_uses"
        | "streak_days"
        | "flashcards_created"
        | "flashcards_reviewed"
        | "shop_purchases"
        | "themes_equipped"
        | "topics_mastered"
        | "score80_sessions"
        | "history_views"
        | "coins_spent"
        | "breathing_sessions"
        | "grounding_sessions"
        | "weeks_active";
      target: number;
    }
  | {
      type: "event";
      name:
        | "first_login"
        | "first_quiz"
        | "first_shop_open"
        | "first_theme_equip"
        | "first_voice_input"
        | "first_flashcard"
        | "first_history_open"
        | "supporter_donate"
        | "bug_report"
        | "share_app"
        | "rate_app"
        | "equip_legendary_theme"
        | "cursor_equip"
        | "relax_room_open"
        | "secret_tap"
        | "night_owl"
        | "early_bird"
        | "all_star_50";
      meta?: string;
    };
export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  hidden?: boolean;
  condition: Condition;
};
const mkSeries = (
  prefix: string,
  descMaker: (n: number) => string,
  key: Extract<Condition, { type: "counter" }>["key"],
  steps: number[],
  diffMap: Record<string, Difficulty>,
  pts: Record<Difficulty, number>,
  hiddenEvery?: number,
): AchievementDef[] =>
  steps.map((n, i) => {
    const diff = diffMap[String(n)] ?? "easy";
    return {
      id: `${prefix}_${n}`,
      title: `${prefix} ${n}`,
      description: descMaker(n),
      difficulty: diff,
      points: pts[diff],
      hidden: hiddenEvery && (i + 1) % hiddenEvery === 0 ? true : undefined,
      condition: { type: "counter", key, target: n },
    };
  });
const PTS: Record<Difficulty, number> = {
  easy: 25,
  medium: 75,
  hard: 150,
  legendary: 300,
};
const ASK = mkSeries(
  "Curious Mind",
  (n) => `Ask ${n} questions on Ask page.`,
  "ask_questions",
  [1, 10, 25, 50, 100, 250, 500, 1000, 2000],
  {
    "1": "easy",
    "10": "easy",
    "25": "medium",
    "50": "medium",
    "100": "hard",
    "250": "hard",
    "500": "legendary",
    "1000": "legendary",
    "2000": "legendary",
  },
  PTS,
  0,
);
const QUIZ = mkSeries(
  "Quiz Runner",
  (n) => `Complete ${n} quizzes.`,
  "quizzes_completed",
  [1, 5, 10, 20, 50, 100, 200],
  {
    "1": "easy",
    "5": "easy",
    "10": "medium",
    "20": "medium",
    "50": "hard",
    "100": "hard",
    "200": "legendary",
  },
  PTS,
  3,
);
const PERFECT = mkSeries(
  "Perfect Score",
  (n) => `Earn a perfect score ${n} times.`,
  "perfect_quizzes",
  [1, 5, 10, 20, 50, 100],
  {
    "1": "medium",
    "5": "medium",
    "10": "hard",
    "20": "hard",
    "50": "legendary",
    "100": "legendary",
  },
  PTS,
  2,
);
const VOICE = mkSeries(
  "Voice Voyager",
  (n) => `Use voice input ${n} times.`,
  "voice_uses",
  [1, 25, 50, 100, 250],
  {
    "1": "easy",
    "25": "medium",
    "50": "medium",
    "100": "hard",
    "250": "legendary",
  },
  PTS,
  0,
);
const STREAK = mkSeries(
  "Focus Streak",
  (n) => `Maintain a personal focus streak for ${n} days.`,
  "streak_days",
  [1, 3, 7, 14, 21, 30, 50, 75, 100, 150, 200],
  {
    "1": "easy",
    "3": "easy",
    "7": "medium",
    "14": "medium",
    "21": "medium",
    "30": "hard",
    "50": "hard",
    "75": "hard",
    "100": "legendary",
    "150": "legendary",
    "200": "legendary",
  },
  PTS,
  0,
);
const FLASH_CREATE = mkSeries(
  "Card Crafter",
  (n) => `Create ${n} custom flashcards.`,
  "flashcards_created",
  [1, 5, 10, 25, 50, 100],
  {
    "1": "easy",
    "5": "easy",
    "10": "medium",
    "25": "medium",
    "50": "hard",
    "100": "hard",
  },
  PTS,
  0,
);
const FLASH_REVIEW = mkSeries(
  "Memory Forge",
  (n) => `Review ${n} flashcards.`,
  "flashcards_reviewed",
  [10, 50, 100, 250, 500, 1000, 2000],
  {
    "10": "easy",
    "50": "easy",
    "100": "medium",
    "250": "medium",
    "500": "hard",
    "1000": "hard",
    "2000": "legendary",
  },
  PTS,
  0,
);
const SHOP = mkSeries(
  "Collector",
  (n) => `Purchase ${n} items in the shop.`,
  "shop_purchases",
  [1, 3, 5, 10, 20],
  {
    "1": "easy",
    "3": "medium",
    "5": "medium",
    "10": "hard",
    "20": "legendary",
  },
  PTS,
  0,
);
const THEMES = mkSeries(
  "Stylist",
  (n) => `Equip ${n} different themes.`,
  "themes_equipped",
  [1, 3, 5, 10],
  { "1": "easy", "3": "medium", "5": "medium", "10": "hard" },
  PTS,
  0,
);
const TOPICS = mkSeries(
  "Topic Master",
  (n) => `Master ${n} quiz topics.`,
  "topics_mastered",
  [5, 10, 15, 20, 25],
  {
    "5": "medium",
    "10": "medium",
    "15": "hard",
    "20": "hard",
    "25": "legendary",
  },
  PTS,
  0,
);
const SCORE80 = mkSeries(
  "Consistent 80",
  (n) => `Score ≥80% in ${n} quiz sessions.`,
  "score80_sessions",
  [10, 25, 50],
  { "10": "medium", "25": "hard", "50": "legendary" },
  PTS,
  0,
);
const HISTORY = mkSeries(
  "Archivist",
  (n) => `Open History page ${n} times.`,
  "history_views",
  [1, 10, 25],
  { "1": "easy", "10": "easy", "25": "medium" },
  PTS,
  0,
);
const COINS = mkSeries(
  "Big Spender",
  (n) => `Spend ${n} coins in total.`,
  "coins_spent",
  [100, 500, 1000, 5000, 10000],
  {
    "100": "easy",
    "500": "medium",
    "1000": "medium",
    "5000": "hard",
    "10000": "legendary",
  },
  PTS,
  0,
);
const BREATH = mkSeries(
  "Breathwork",
  (n) => `Complete ${n} breathing sessions in Relax.`,
  "breathing_sessions",
  [1, 10, 25, 50, 100],
  { "1": "easy", "10": "easy", "25": "medium", "50": "hard", "100": "hard" },
  PTS,
  0,
);
const GROUND = mkSeries(
  "Grounded",
  (n) => `Finish ${n} grounding exercises.`,
  "grounding_sessions",
  [1, 10, 25, 50],
  { "1": "easy", "10": "medium", "25": "hard", "50": "legendary" },
  PTS,
  0,
);
const WEEKS = mkSeries(
  "Long Haul",
  (n) => `Stay active for ${n} weeks (any activity).`,
  "weeks_active",
  [4, 8, 12, 24, 52],
  {
    "4": "medium",
    "8": "medium",
    "12": "hard",
    "24": "hard",
    "52": "legendary",
  },
  PTS,
  0,
);
const EVENTS: AchievementDef[] = [
  {
    id: "first_login",
    title: "Welcome Aboard",
    description: "Log in for the first time.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_login" },
  },
  {
    id: "first_quiz",
    title: "First Steps",
    description: "Complete your first quiz.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_quiz" },
  },
  {
    id: "first_shop_open",
    title: "Window Shopper",
    description: "Open the shop.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_shop_open" },
  },
  {
    id: "first_theme_equip",
    title: "Fresh Drip",
    description: "Equip your first theme.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_theme_equip" },
  },
  {
    id: "first_voice_input",
    title: "Speak Up",
    description: "Use voice input once.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_voice_input" },
  },
  {
    id: "first_flashcard",
    title: "Maker",
    description: "Create your first flashcard.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_flashcard" },
  },
  {
    id: "first_history_open",
    title: "Looking Back",
    description: "Open your History.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "first_history_open" },
  },
  {
    id: "donor",
    title: "Supporter",
    description: "Make a donation.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "supporter_donate" },
  },
  {
    id: "bug_report",
    title: "QA Scout",
    description: "Submit a bug report.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "bug_report" },
    hidden: true,
  },
  {
    id: "share_app",
    title: "Hype Train",
    description: "Share the app.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "share_app" },
  },
  {
    id: "rate_app",
    title: "Reviewer",
    description: "Rate the app.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "rate_app" },
  },
  {
    id: "legendary_theme",
    title: "Legendary Look",
    description: "Equip a legendary theme.",
    difficulty: "hard",
    points: PTS.hard,
    condition: { type: "event", name: "equip_legendary_theme" },
  },
  {
    id: "cursor_equip",
    title: "Pointer Pro",
    description: "Equip a cursor.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "cursor_equip" },
  },
  {
    id: "relax_open",
    title: "Find Your Calm",
    description: "Open the Relax room.",
    difficulty: "easy",
    points: PTS.easy,
    condition: { type: "event", name: "relax_room_open" },
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Use the app between 2–4 AM.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "night_owl" },
    hidden: true,
  },
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Use the app between 5–6 AM.",
    difficulty: "medium",
    points: PTS.medium,
    condition: { type: "event", name: "early_bird" },
    hidden: true,
  },
  {
    id: "secret_tap_1",
    title: "Secret Finder I",
    description: "You found a secret.",
    difficulty: "hard",
    points: PTS.hard,
    condition: { type: "event", name: "secret_tap" },
    hidden: true,
  },
  {
    id: "secret_tap_2",
    title: "Secret Finder II",
    description: "You found another secret.",
    difficulty: "hard",
    points: PTS.hard,
    condition: { type: "event", name: "secret_tap" },
    hidden: true,
  },
  {
    id: "secret_tap_3",
    title: "Secret Finder III",
    description: "You just keep tapping…",
    difficulty: "legendary",
    points: PTS.legendary,
    condition: { type: "event", name: "secret_tap" },
    hidden: true,
  },
  {
    id: "all_star_50",
    title: "All-Star",
    description: "Unlock 50 achievements.",
    difficulty: "legendary",
    points: PTS.legendary,
    condition: { type: "event", name: "all_star_50" },
    hidden: true,
  },
];
export const ACHIEVEMENTS: AchievementDef[] = [
  ...ASK,
  ...QUIZ,
  ...PERFECT,
  ...VOICE,
  ...STREAK,
  ...FLASH_CREATE,
  ...FLASH_REVIEW,
  ...SHOP,
  ...THEMES,
  ...TOPICS,
  ...SCORE80,
  ...HISTORY,
  ...COINS,
  ...BREATH,
  ...GROUND,
  ...WEEKS,
  ...EVENTS,
];
