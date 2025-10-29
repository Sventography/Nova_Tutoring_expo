export type Achievement = {
  id: string;
  title: string;
  desc?: string;
  points?: number;
  icon?: string;
  tier?: "bronze" | "silver" | "gold" | "diamond";
  hidden?: boolean;
};

export type EvalContext = {
  stats: {
    quizzesCompleted: number;
    bestQuizPct: number;              // 0–100
    totalBrainteasersSolved: number;
    cardsSaved: number;
    streakDays: number;
  };
  history: {
    quizRuns: { pct: number; topic?: string; date: string }[];
    teasersSolvedToday: number;
  };
};

export type RegistryEntry = Achievement & { rule: (ctx: EvalContext) => boolean };

const rng = (start: number, end: number, step = 1) =>
  Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => start + i * step);

const tierBy = (val: number, cuts: number[], tiers: any[]) => {
  const idx = cuts.findIndex((c) => val <= c);
  return tiers[Math.max(0, idx === -1 ? tiers.length - 1 : idx)];
};

export const BASE: RegistryEntry[] = [
  { id: "first_quiz", title: "First Steps", desc: "Complete your first quiz", tier: "bronze",
    rule: (ctx) => ctx.stats.quizzesCompleted >= 1 },
  { id: "quiz_80_once", title: "B-Student", desc: "Score 80%+ once", tier: "bronze",
    rule: (ctx) => ctx.stats.bestQuizPct >= 80 },
  { id: "quiz_90_once", title: "A-Student", desc: "Score 90%+ once", tier: "silver",
    rule: (ctx) => ctx.stats.bestQuizPct >= 90 },
  { id: "quiz_100_once", title: "Perfect!", desc: "Score 100% once", tier: "gold",
    rule: (ctx) => ctx.stats.bestQuizPct >= 100 },
];

/* Quizzes: every 10 from 10→2000 (200 items) */
const QUIZ_MILESTONES = rng(10, 2000, 10);
const quizSeries: RegistryEntry[] = QUIZ_MILESTONES.map((n) => ({
  id: `quizzes_${n}`,
  title: `Quiz Master ${n}`,
  desc: `Complete ${n} quizzes`,
  tier: tierBy(n, [100, 500, 1200], ["bronze", "silver", "gold", "diamond"]),
  rule: (ctx) => ctx.stats.quizzesCompleted >= n,
}));

/* Cards saved: every 5 from 5→1000 (200 items) */
const CARD_MILESTONES = rng(5, 1000, 5);
const cardSeries: RegistryEntry[] = CARD_MILESTONES.map((n, i) => ({
  id: `cards_${n}`,
  title: `Collector ${i + 1}`,
  desc: `Save ${n} cards`,
  tier: tierBy(n, [50, 300, 700], ["bronze", "silver", "gold", "diamond"]),
  rule: (ctx) => ctx.stats.cardsSaved >= n,
}));

/* Brainteasers solved: dense early, up to 2000 (22 items) */
const TEASER_MILESTONES = [10,20,30,40,50,75,100,150,200,250,300,400,500,600,700,800,900,1000,1250,1500,1750,2000];
const teaserSeries: RegistryEntry[] = TEASER_MILESTONES.map((n, i) => ({
  id: `teasers_${n}`,
  title: `Riddle Crusher ${i + 1}`,
  desc: `Solve ${n} brainteasers`,
  tier: tierBy(n, [100, 500, 1200], ["bronze", "silver", "gold", "diamond"]),
  rule: (ctx) => ctx.stats.totalBrainteasersSolved >= n,
}));

/* Streaks: 3→1000 with curated rungs (21 items) */
const STREAK_MILESTONES = [3,7,14,21,30,45,60,90,120,150,180,240,300,365,400,500,600,700,800,900,1000];
const streakSeries: RegistryEntry[] = STREAK_MILESTONES.map((d) => ({
  id: `streak_${d}`,
  title: `Streak ${d}`,
  desc: `Use Nova ${d} days in a row`,
  tier: tierBy(d, [30, 180, 500], ["bronze", "silver", "gold", "diamond"]),
  rule: (ctx) => ctx.stats.streakDays >= d,
}));

/* Topics — expanded to 72; mastery at 70/80/90/95/100 (5 each = 360) and loyalty 5/10/25/50/100 (5 each = 360) */
const TOPICS = [
  "Algebra","Geometry","Calculus","Trigonometry","Statistics","Probability",
  "Biology","Chemistry","Physics","Earth Science",
  "US History","World History","Civics","Geography",
  "English","Literature","Grammar","Writing",
  "Computer Science","Data Structures","Algorithms","Databases","Networking","Cybersecurity",
  "Economics","Accounting","Finance","Business","Marketing","Entrepreneurship",
  "Spanish","French","German","Latin","Italian","Portuguese",
  "Art","Music","Psychology","Philosophy","Sociology",
  "Astronomy","Environmental Science","Geology","Anatomy",
  "Programming","Web Dev","Mobile Dev","AI","Machine Learning","Data Science",
  "Discrete Math","Number Theory","Set Theory","Logic","Combinatorics",
  "Poetry","Drama","Rhetoric","Critical Reading",
  "Health","Nutrition","Sports Science","Ethics",
  "Game Theory","Linear Algebra","Topology","Vector Calculus"
];

const pctLevels = [70,80,90,95,100];
const countLevels = [5,10,25,50,100];

const topicPctSeries: RegistryEntry[] = TOPICS.flatMap((topic) =>
  pctLevels.map((pct, i) => ({
    id: `topic_${topic.toLowerCase().replace(/\s+/g,"_")}_${pct}`,
    title: `${topic} ${pct}%`,
    desc: `Score ${pct}%+ on a ${topic} quiz`,
    tier: ["bronze","silver","silver","gold","diamond"][i] as any,
    rule: (ctx) =>
      ctx.history.quizRuns.some(
        (r) => (r.topic || "").toLowerCase() === topic.toLowerCase() && r.pct >= pct
      ),
  }))
);

const topicCountSeries: RegistryEntry[] = TOPICS.flatMap((topic) =>
  countLevels.map((n, i) => ({
    id: `topic_${topic.toLowerCase().replace(/\s+/g,"_")}_quizzes_${n}`,
    title: `${topic} Fan ${["I","II","III","IV","V"][i]}`,
    desc: `Complete ${n} ${topic} quizzes`,
    tier: ["bronze","silver","silver","gold","diamond"][i] as any,
    rule: (ctx) =>
      ctx.history.quizRuns.filter((r) => (r.topic || "").toLowerCase() === topic.toLowerCase()).length >= n,
  }))
);

export const ALL_ACHIEVEMENTS: RegistryEntry[] = [
  ...BASE,                       // 4
  ...quizSeries,                 // 200
  ...cardSeries,                 // 200
  ...teaserSeries,               // 22
  ...streakSeries,               // 21
  ...topicPctSeries,             // 72 * 5 = 360
  ...topicCountSeries,           // 72 * 5 = 360
]; // ≈ 1167 total
