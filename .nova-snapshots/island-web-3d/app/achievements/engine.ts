import AsyncStorage from "@react-native-async-storage/async-storage";

export type StatKey =
  | "questions"
  | "questions_streak"
  | "checkins"
  | "checkins_streak"
  | "voice_uses"
  | "flashcards_saved"
  | "collections_created"
  | "relax_minutes"
  | "breath_cycles"
  | "quizzes_taken"
  | "quiz_best"
  | "quiz_avg"
  | "quiz_streak"
  | "themes_equipped"
  | "purchases"
  | "sessions";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  points: number;
  hidden?: boolean;
  stat?: StatKey;
  threshold?: number;
  allOf?: { stat: StatKey; gte: number }[];
  anyOf?: { stat: StatKey; gte: number }[];
};

export type AchState = {
  earned: Record<string, number>;
  stats: Record<StatKey, number>;
};

const ACH_KEY = "achievements_state_v2";
const SHOP_KEY = "shop_state_v1";

function range(start: number, end: number, step = 1) {
  const out: number[] = [];
  for (let n = start; n <= end; n += step) out.push(n);
  return out;
}

function makeTiered(
  stat: StatKey,
  tiers: number[],
  baseTitle: string,
  baseDesc: (n: number) => string,
  points: (n: number) => number,
  idPrefix: string,
): Achievement[] {
  return tiers.map((n) => ({
    id: `${idPrefix}_${n}`,
    title: `${baseTitle} ${n}`,
    desc: baseDesc(n),
    points: points(n),
    stat,
    threshold: n,
  }));
}

function hidden(
  id: string,
  title: string,
  desc: string,
  points: number,
  rules: {
    allOf?: { stat: StatKey; gte: number }[];
    anyOf?: { stat: StatKey; gte: number }[];
  } = {},
): Achievement {
  return { id, title, desc, points, hidden: true, ...rules };
}

const A_QUESTIONS = makeTiered(
  "questions",
  [
    ...range(5, 50, 5),
    ...range(60, 100, 10),
    ...range(150, 500, 50),
    ...range(600, 1000, 100),
  ],
  "Curiosity",
  (n) => `Ask ${n} questions`,
  (n) => (n <= 50 ? 15 : n <= 100 ? 25 : n <= 500 ? 40 : 60),
  "q",
);

const A_Q_STREAK = makeTiered(
  "questions_streak",
  [3, 5, 7, 10, 15, 20, 30, 50],
  "On A Roll",
  (n) => `Ask ${n} in a row`,
  (n) => (n <= 7 ? 25 : n <= 20 ? 40 : 75),
  "qs",
);

const A_CHECKINS = makeTiered(
  "checkins",
  [1, 3, 7, 14, 21, 30, 60, 90],
  "Daily Glow",
  (n) => `Check in ${n} day${n > 1 ? "s" : ""}`,
  (n) => (n <= 7 ? 20 : n <= 30 ? 40 : 80),
  "ci",
);

const A_CHECKIN_STREAK = makeTiered(
  "checkins_streak",
  [3, 5, 7, 10, 14, 21, 30],
  "Never Miss",
  (n) => `Daily streak ${n}`,
  (n) => (n <= 7 ? 30 : n <= 21 ? 60 : 120),
  "cis",
);

const A_VOICE = makeTiered(
  "voice_uses",
  [5, 10, 20, 40, 60, 100, 200],
  "Speak Up",
  (n) => `Use voice ${n} times`,
  (n) => (n <= 20 ? 25 : n <= 60 ? 40 : 80),
  "vu",
);

const A_FLASH = makeTiered(
  "flashcards_saved",
  [5, 10, 20, 40, 80, 120, 200],
  "Collector",
  (n) => `Save ${n} flashcards`,
  (n) => (n <= 20 ? 20 : n <= 80 ? 40 : 80),
  "fc",
);

const A_COLL = makeTiered(
  "collections_created",
  [1, 3, 5, 10, 15, 20],
  "Curator",
  (n) => `Create ${n} collections`,
  (n) => (n <= 5 ? 25 : 50),
  "cl",
);

const A_RELAX = makeTiered(
  "relax_minutes",
  [10, 30, 60, 120, 240, 480, 720, 1000],
  "Calm Miles",
  (n) => `Log ${n} minutes relaxing`,
  (n) => (n <= 60 ? 20 : n <= 240 ? 40 : 90),
  "rx",
);

const A_BREATH = makeTiered(
  "breath_cycles",
  [10, 25, 50, 100, 200, 400, 800],
  "Steady Breath",
  (n) => `Complete ${n} cycles`,
  (n) => (n <= 50 ? 20 : n <= 200 ? 40 : 90),
  "bc",
);

const A_QUIZ_TAKEN = makeTiered(
  "quizzes_taken",
  [1, 5, 10, 20, 40, 60, 100, 150],
  "Quiz Journey",
  (n) => `Finish ${n} quizzes`,
  (n) => (n <= 10 ? 25 : n <= 60 ? 45 : 90),
  "qt",
);

const A_QUIZ_BEST = makeTiered(
  "quiz_best",
  [70, 80, 90, 95, 100],
  "Peak Score",
  (n) => `Hit ${n}% on a quiz`,
  (n) => (n < 95 ? 35 : 80),
  "qb",
);

const A_QUIZ_AVG = makeTiered(
  "quiz_avg",
  [60, 70, 80, 85, 90],
  "Consistent",
  (n) => `Average ${n}% across quizzes`,
  (n) => (n < 80 ? 40 : 90),
  "qa",
);

const A_QUIZ_STREAK = makeTiered(
  "quiz_streak",
  [3, 5, 7, 10, 15, 20],
  "Hot Streak",
  (n) => `Score 80%+ for ${n} quizzes in a row`,
  (n) => (n <= 7 ? 40 : n <= 15 ? 70 : 120),
  "qsq",
);

const A_THEMES = makeTiered(
  "themes_equipped",
  [1, 3, 5, 8, 10],
  "Stylish",
  (n) => `Equip ${n} themes`,
  (n) => (n <= 5 ? 20 : 50),
  "th",
);

const A_PURCHASES = makeTiered(
  "purchases",
  [1, 3, 5, 10, 15, 20],
  "Supporter",
  (n) => `Buy ${n} items`,
  (n) => (n <= 5 ? 30 : 70),
  "buy",
);

const A_SESSIONS = makeTiered(
  "sessions",
  [1, 3, 5, 10, 20, 40, 80, 160],
  "Welcome Back",
  (n) => `Open the app ${n} times`,
  (n) => (n <= 10 ? 15 : n <= 40 ? 30 : 60),
  "ssn",
);

const HIDDEN: Achievement[] = [
  hidden(
    "h_midnight_breath",
    "Midnight Tide",
    "Complete a breathing session after midnight",
    60,
    { allOf: [{ stat: "breath_cycles", gte: 1 }] },
  ),
  hidden(
    "h_sound_all",
    "Sound Connoisseur",
    "Try ocean, fireplace, and rain in one day",
    80,
    { allOf: [{ stat: "relax_minutes", gte: 10 }] },
  ),
  hidden(
    "h_theme_black_gold",
    "Gilded Night",
    "Equip Black Gold after owning 3 themes",
    100,
    { allOf: [{ stat: "themes_equipped", gte: 3 }] },
  ),
  hidden(
    "h_quiz_perfect_streak3",
    "Flawless Run",
    "Score 100% three quizzes in a row",
    150,
    {
      allOf: [
        { stat: "quiz_streak", gte: 3 },
        { stat: "quiz_best", gte: 100 },
      ],
    },
  ),
  hidden(
    "h_first_day_bundle",
    "First Day Magic",
    "Earn 3 achievements in one day",
    70,
    {},
  ),
  hidden(
    "h_builder",
    "Builder’s Heart",
    "Create 5 collections and save 25 flashcards",
    120,
    {
      allOf: [
        { stat: "collections_created", gte: 5 },
        { stat: "flashcards_saved", gte: 25 },
      ],
    },
  ),
  hidden(
    "h_voice_flash_combo",
    "Speak And Save",
    "Use voice 10 times and save 10 flashcards",
    90,
    {
      allOf: [
        { stat: "voice_uses", gte: 10 },
        { stat: "flashcards_saved", gte: 10 },
      ],
    },
  ),
  hidden(
    "h_relax_marathon",
    "Serenity Marathon",
    "Log 6 hours of relax time",
    150,
    { allOf: [{ stat: "relax_minutes", gte: 360 }] },
  ),
  hidden(
    "h_questions_blast",
    "Lightning Curious",
    "Ask 20 questions in one session",
    100,
    { allOf: [{ stat: "questions_streak", gte: 20 }] },
  ),
  hidden("h_patron", "Patron Of Glow", "Make 10 purchases total", 150, {
    allOf: [{ stat: "purchases", gte: 10 }],
  }),
];

let CATALOG: Achievement[] = [];
CATALOG = [
  ...A_QUESTIONS,
  ...A_Q_STREAK,
  ...A_CHECKINS,
  ...A_CHECKIN_STREAK,
  ...A_VOICE,
  ...A_FLASH,
  ...A_COLL,
  ...A_RELAX,
  ...A_BREATH,
  ...A_QUIZ_TAKEN,
  ...A_QUIZ_BEST,
  ...A_QUIZ_AVG,
  ...A_QUIZ_STREAK,
  ...A_THEMES,
  ...A_PURCHASES,
  ...A_SESSIONS,
  ...HIDDEN,
];

while (CATALOG.length < 300) {
  const i = CATALOG.length + 1;
  CATALOG.push(
    hidden(
      `h_secret_${i}`,
      `Secret ${i}`,
      `Discover a hidden path ${i}`,
      50,
      {},
    ),
  );
}

export function getCatalog() {
  return CATALOG;
}

async function loadState(): Promise<AchState> {
  const raw = await AsyncStorage.getItem(ACH_KEY);
  if (raw) return JSON.parse(raw);
  const init: AchState = {
    earned: {},
    stats: {
      questions: 0,
      questions_streak: 0,
      checkins: 0,
      checkins_streak: 0,
      voice_uses: 0,
      flashcards_saved: 0,
      collections_created: 0,
      relax_minutes: 0,
      breath_cycles: 0,
      quizzes_taken: 0,
      quiz_best: 0,
      quiz_avg: 0,
      quiz_streak: 0,
      themes_equipped: 0,
      purchases: 0,
      sessions: 0,
    },
  };
  await AsyncStorage.setItem(ACH_KEY, JSON.stringify(init));
  return init;
}

async function saveState(s: AchState) {
  await AsyncStorage.setItem(ACH_KEY, JSON.stringify(s));
}

async function addCoins(n: number) {
  const raw = await AsyncStorage.getItem(SHOP_KEY);
  const state = raw ? JSON.parse(raw) : { balance: 0, owned: [], equipped: {} };
  state.balance = (state.balance || 0) + n;
  await AsyncStorage.setItem(SHOP_KEY, JSON.stringify(state));
}

function meets(statValue: number | undefined, threshold: number | undefined) {
  if (threshold == null) return false;
  return (statValue || 0) >= threshold;
}

function checkCompound(s: AchState, a: Achievement) {
  if (a.allOf && !a.allOf.every((r) => (s.stats[r.stat] || 0) >= r.gte))
    return false;
  if (a.anyOf && !a.anyOf.some((r) => (s.stats[r.stat] || 0) >= r.gte))
    return false;
  return true;
}

export type EarnResult = { newlyEarned: Achievement[] };

export async function recordStat(
  delta: Partial<Record<StatKey, number>>,
): Promise<EarnResult> {
  const s = await loadState();
  const before = { ...s.stats };
  const next = { ...s.stats };
  Object.keys(delta).forEach((k) => {
    const key = k as StatKey;
    const v = (delta as any)[key];
    if (key === "quiz_best") next[key] = Math.max(next[key] || 0, v);
    else if (key === "quiz_avg") next[key] = v;
    else next[key] = (next[key] || 0) + v;
  });
  if ((delta.questions || 0) === 0) next.questions_streak = 0;
  if ((delta.questions || 0) > 0)
    next.questions_streak =
      (before.questions_streak || 0) + (delta.questions || 0);
  if ((delta.checkins || 0) > 0)
    next.checkins_streak =
      (before.checkins_streak || 0) + (delta.checkins || 0);
  if ((delta.checkins || 0) === 0 && delta.checkins !== undefined)
    next.checkins_streak = 0;
  if ((delta.quizzes_taken || 0) > 0 && (delta.quiz_best || 0) >= 80)
    next.quiz_streak = (before.quiz_streak || 0) + 1;
  if (
    (delta.quizzes_taken || 0) > 0 &&
    (delta.quiz_best || 0) < 80 &&
    delta.quiz_best !== undefined
  )
    next.quiz_streak = 0;
  s.stats = next;
  const newly: Achievement[] = [];
  for (const a of CATALOG) {
    if (s.earned[a.id]) continue;
    let ok = false;
    if (a.stat && a.threshold != null) ok = meets(s.stats[a.stat], a.threshold);
    if (a.allOf || a.anyOf) ok = ok || checkCompound(s, a);
    if (ok) newly.push(a);
  }
  for (const a of newly) s.earned[a.id] = Date.now();
  await saveState(s);
  let coinSum = 0;
  newly.forEach((a) => (coinSum += a.points));
  if (coinSum > 0) await addCoins(coinSum);
  return { newlyEarned: newly };
}

export async function getProgress() {
  const s = await loadState();
  return { stats: s.stats, earned: s.earned, catalog: CATALOG };
}

export async function resetAll() {
  const init: AchState = {
    earned: {},
    stats: {
      questions: 0,
      questions_streak: 0,
      checkins: 0,
      checkins_streak: 0,
      voice_uses: 0,
      flashcards_saved: 0,
      collections_created: 0,
      relax_minutes: 0,
      breath_cycles: 0,
      quizzes_taken: 0,
      quiz_best: 0,
      quiz_avg: 0,
      quiz_streak: 0,
      themes_equipped: 0,
      purchases: 0,
      sessions: 0,
    },
  };
  await AsyncStorage.setItem(ACH_KEY, JSON.stringify(init));
}
