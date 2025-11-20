export type Achievement = {
  id: string;
  title: string;
  desc?: string;
  coins: number;
  group: string; // onboarding | ask | streaks | quiz | brainteasers | voice | shop
};

function make(id: string, title: string, coins: number, group: string, desc?: string): Achievement {
  return { id, title, coins, group, desc };
}

// Normalize a subject string -> id-safe token
export function subjectKey(s?: string) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export const SUBJECTS = ["math", "science", "history", "language"]; // add more anytime

export function buildAchievements() {
  const list: Achievement[] = [];

  // Onboarding
  list.push(make("first_login", "Welcome!", 25, "onboarding", "First successful login."));
  list.push(make("set_avatar", "New Look!", 25, "onboarding", "You set a profile avatar."));

  // ASK milestones (1→1000)
  for (let n of [1, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000]) {
    const coins = n <= 25 ? 10 : n <= 100 ? 25 : n <= 300 ? 50 : n <= 750 ? 100 : 200;
    list.push(make(`ask_${n}`, `Questions Asked: ${n}`, coins, "ask"));
  }

  // STREAKS (2→365)
  for (let d of [2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365]) {
    const coins = d <= 10 ? 20 : d <= 30 ? 40 : d <= 100 ? 80 : d <= 250 ? 150 : 300;
    list.push(make(`streak_${d}`, `Daily Streak: ${d}`, coins, "streaks"));
  }

  // QUIZ performance (global)
  for (let pct of [80, 85, 90, 95, 100]) {
    const coins = pct < 100 ? 100 : 250;
    list.push(make(`quiz_${pct}`, `Quiz Master ${pct}%`, coins, "quiz", `Scored ${pct}%+ on a quiz.`));
  }

  // QUIZ performance (per subject)
  for (const sub of SUBJECTS) {
    for (let pct of [80, 85, 90, 95, 100]) {
      const coins = pct < 100 ? 110 : 275; // slight premium for subject mastery
      const id = `quiz_${sub}_${pct}`;
      const title = `${titleCase(sub)} Master ${pct}%`;
      list.push(make(id, title, coins, "quiz", `Scored ${pct}%+ in ${titleCase(sub)}.`));
    }
  }

  // *** ADDED — REQUIRED BY AchievementsContext ***
  list.push(
    make(
      "first_quiz",
      "First Quiz!",
      50,
      "quiz",
      "Completed your very first quiz."
    )
  );
  list.push(
    make(
      "quiz_10",
      "Quiz Grinder I",
      100,
      "quiz",
      "Completed 10 total quizzes."
    )
  );
  list.push(
    make(
      "quiz_25",
      "Quiz Grinder II",
      250,
      "quiz",
      "Completed 25 total quizzes."
    )
  );
  // *** END ADDED ***

  // QUIZ volume (global taken count)
  for (let n of [1, 5, 10, 25, 50, 100, 200]) {
    const coins = n <= 10 ? 20 : n <= 50 ? 50 : 120;
    list.push(make(`quiz_taken_${n}`, `Quizzes Taken: ${n}`, coins, "quiz"));
  }

  // QUIZ volume (per subject taken count)
  for (const sub of SUBJECTS) {
    for (let n of [1, 5, 10, 25, 50, 100, 200]) {
      const coins = n <= 10 ? 25 : n <= 50 ? 60 : 140;
      const id = `quiz_taken_${sub}_${n}`;
      const title = `${titleCase(sub)} Quizzes: ${n}`;
      list.push(make(id, title, coins, "quiz"));
    }
  }

  // BRAINTEASERS daily pair
  for (let n of [1, 3, 5, 10, 20, 50, 100]) {
    const coins = n <= 10 ? 30 : n <= 50 ? 70 : 150;
    list.push(make(`brain_pair_${n}`, `Brainteaser Pairs: ${n}`, coins, "brainteasers"));
  }

  // VOICE usage
  for (let n of [1, 5, 10, 25, 50, 100]) {
    const coins = n <= 10 ? 25 : n <= 50 ? 60 : 120;
    list.push(make(`voice_${n}`, `Voice Sessions: ${n}`, coins, "voice"));
  }

  // SHOP purchases
  for (let n of [1, 3, 5, 10, 20]) {
    const coins = n <= 5 ? 50 : n <= 10 ? 100 : 200;
    list.push(make(`purchase_${n}`, `Purchases: ${n}`, coins, "shop"));
  }

  const map: Record<string, Achievement> = {};
  for (const a of list) map[a.id] = a;
  return { LIST: list, MAP: map };
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const BUILT = buildAchievements();
export const ACHIEVEMENTS = BUILT.MAP;
export const ACHIEVEMENT_LIST = BUILT.LIST;
export const SUBJECT_COLORS = {
  math:     { bg: "rgba(0,229,255,0.10)", border: "rgba(0,229,255,0.85)", text: "#9ff2ff" },
  science:  { bg: "rgba(0,255,153,0.10)", border: "rgba(0,255,153,0.85)", text: "#9fffcf" },
  history:  { bg: "rgba(255,153,0,0.10)", border: "rgba(255,153,0,0.85)", text: "#ffd8a6" },
  language: { bg: "rgba(153,102,255,0.10)", border: "rgba(153,102,255,0.85)", text: "#dbc8ff" },
};
