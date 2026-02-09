// app/constants/achievements.ts

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  desc?: string;
  coins: number;
};

// 🔥 Daily app usage streaks (generic check-in)
const STREAKS: Achievement[] = [
  {
    id: "first_check",
    icon: "🌟",
    title: "First Check-In",
    desc: "Checked in for the first time.",
    coins: 250,
  },
  {
    id: "streak_1",
    icon: "🔥",
    title: "Day 1",
    desc: "One day streak.",
    coins: 250,
  },
  {
    id: "streak_3",
    icon: "🔥🔥",
    title: "3 Day Streak",
    desc: "Checked in 3 days in a row.",
    coins: 300,
  },
  {
    id: "streak_5",
    icon: "🔥🔥🔥",
    title: "5 Day Streak",
    desc: "Five day streak.",
    coins: 350,
  },
  {
    id: "streak_7",
    icon: "🔥7",
    title: "One Week",
    desc: "Seven day streak.",
    coins: 400,
  },
  {
    id: "streak_10",
    icon: "🔥10",
    title: "Tenacious",
    desc: "Ten day streak.",
    coins: 450,
  },
  {
    id: "streak_14",
    icon: "🔥14",
    title: "Two Weeks",
    desc: "Fourteen day streak.",
    coins: 500,
  },
  {
    id: "streak_21",
    icon: "🔥21",
    title: "Habit Formed",
    desc: "Twenty-one day streak.",
    coins: 600,
  },
  {
    id: "streak_30",
    icon: "🔥30",
    title: "One Month",
    desc: "Thirty day streak.",
    coins: 700,
  },
  {
    id: "streak_50",
    icon: "🔥50",
    title: "Fifty Flames",
    desc: "Fifty day streak.",
    coins: 850,
  },
  {
    id: "streak_75",
    icon: "🔥75",
    title: "On a Roll",
    desc: "Seventy-five day streak.",
    coins: 1000,
  },
  {
    id: "streak_100",
    icon: "🔥100",
    title: "Century Streak",
    desc: "One hundred day streak.",
    coins: 1250,
  },
  {
    id: "check_morning",
    icon: "🌅",
    title: "Early Bird",
    desc: "Checked in before 9am.",
    coins: 300,
  },
  {
    id: "check_night",
    icon: "🌙",
    title: "Night Owl",
    desc: "Checked in after 9pm.",
    coins: 300,
  },
];

// 🧠 Quiz count milestones
const QUIZ_COUNTS: Achievement[] = [
  {
    id: "quiz_1",
    icon: "🎯",
    title: "First Quiz",
    desc: "Completed your first quiz.",
    coins: 250,
  },
  {
    id: "quiz_5",
    icon: "🎯",
    title: "Quiz 5",
    desc: "Completed 5 quizzes.",
    coins: 300,
  },
  {
    id: "quiz_10",
    icon: "🎯",
    title: "Quiz 10",
    desc: "Completed 10 quizzes.",
    coins: 350,
  },
  {
    id: "quiz_20",
    icon: "🎯",
    title: "Quiz 20",
    desc: "Completed 20 quizzes.",
    coins: 400,
  },
  {
    id: "quiz_30",
    icon: "🎯",
    title: "Quiz 30",
    desc: "Completed 30 quizzes.",
    coins: 450,
  },
  {
    id: "quiz_50",
    icon: "🎯",
    title: "Quiz 50",
    desc: "Completed 50 quizzes.",
    coins: 550,
  },
  {
    id: "quiz_75",
    icon: "🎯",
    title: "Quiz 75",
    desc: "Completed 75 quizzes.",
    coins: 650,
  },
  {
    id: "quiz_100",
    icon: "🎯",
    title: "Quiz 100",
    desc: "Completed 100 quizzes.",
    coins: 800,
  },
  {
    id: "quiz_150",
    icon: "🎯",
    title: "Quiz 150",
    desc: "Completed 150 quizzes.",
    coins: 950,
  },
  {
    id: "quiz_200",
    icon: "🎯",
    title: "Quiz 200",
    desc: "Completed 200 quizzes.",
    coins: 1200,
  },
];

// 🗂️ Distinct topics attempted
const DISTINCT_TOPICS: Achievement[] = [
  {
    id: "topics_3",
    icon: "🗂️",
    title: "Explorer",
    desc: "Tried 3 different topics.",
    coins: 300,
  },
  {
    id: "topics_5",
    icon: "🗂️",
    title: "Curious",
    desc: "Tried 5 different topics.",
    coins: 350,
  },
  {
    id: "topics_10",
    icon: "🗂️",
    title: "Wide Learner",
    desc: "Tried 10 different topics.",
    coins: 450,
  },
  {
    id: "topics_15",
    icon: "🗂️",
    title: "Surveyor",
    desc: "Tried 15 different topics.",
    coins: 550,
  },
  {
    id: "topics_20",
    icon: "🗂️",
    title: "Generalist",
    desc: "Tried 20 different topics.",
    coins: 650,
  },
  {
    id: "topics_30",
    icon: "🗂️",
    title: "Polymath (lite)",
    desc: "Tried 30 topics.",
    coins: 800,
  },
  {
    id: "topics_40",
    icon: "🗂️",
    title: "Omni-Curious",
    desc: "Tried 40 topics.",
    coins: 950,
  },
  {
    id: "topics_50",
    icon: "🗂️",
    title: "Collector",
    desc: "Tried 50 topics.",
    coins: 1200,
  },
];

// 💯 Perfects + Mastery
const PERFECTS: Achievement[] = [
  {
    id: "perfect_1",
    icon: "💯",
    title: "First Perfect",
    desc: "Scored 100% on a quiz.",
    coins: 500,
  },
  {
    id: "perfect_3",
    icon: "💯",
    title: "Triple Perfect",
    desc: "Three 100% quizzes.",
    coins: 650,
  },
  {
    id: "perfect_5",
    icon: "💯",
    title: "Five Perfects",
    desc: "Five 100% quizzes.",
    coins: 800,
  },
  {
    id: "perfect_10",
    icon: "💯",
    title: "Deca Perfect",
    desc: "Ten 100% quizzes.",
    coins: 1000,
  },
  {
    id: "perfect_20",
    icon: "💯",
    title: "Perfect Streaker",
    desc: "Twenty 100% quizzes.",
    coins: 1400,
  },
  {
    id: "master_3",
    icon: "🏅",
    title: "Master 3",
    desc: "Perfect 20/20 in 3 different topics.",
    coins: 900,
  },
  {
    id: "master_5",
    icon: "🏅",
    title: "Master 5",
    desc: "Perfect 20/20 in 5 different topics.",
    coins: 1200,
  },
  {
    id: "master_10",
    icon: "🏅",
    title: "Master 10",
    desc: "Perfect 20/20 in 10 different topics.",
    coins: 1600,
  },
  {
    id: "master_20",
    icon: "🏅",
    title: "Master 20",
    desc: "Perfect 20/20 in 20 different topics.",
    coins: 2200,
  },
];

// ✅ Correct answers cumulative
const CORRECTS: Achievement[] = [
  {
    id: "correct_50",
    icon: "✅",
    title: "50 Correct",
    desc: "Got 50 answers correct.",
    coins: 250,
  },
  {
    id: "correct_100",
    icon: "✅",
    title: "100 Correct",
    desc: "Got 100 answers correct.",
    coins: 350,
  },
  {
    id: "correct_250",
    icon: "✅",
    title: "250 Correct",
    desc: "Got 250 answers correct.",
    coins: 500,
  },
  {
    id: "correct_500",
    icon: "✅",
    title: "500 Correct",
    desc: "Got 500 answers correct.",
    coins: 700,
  },
  {
    id: "correct_750",
    icon: "✅",
    title: "750 Correct",
    desc: "Got 750 answers correct.",
    coins: 900,
  },
  {
    id: "correct_1000",
    icon: "✅",
    title: "1000 Correct",
    desc: "Got 1000 answers correct.",
    coins: 1200,
  },
  {
    id: "correct_1500",
    icon: "✅",
    title: "1500 Correct",
    desc: "Got 1500 answers correct.",
    coins: 1500,
  },
  {
    id: "correct_2000",
    icon: "✅",
    title: "2000 Correct",
    desc: "Got 2000 answers correct.",
    coins: 1800,
  },
];

// 📊 Average score bands
const AVERAGES: Achievement[] = [
  {
    id: "avg_70",
    icon: "📈",
    title: "Solid 70",
    desc: "Avg ≥ 70% over 10+ quizzes.",
    coins: 700,
  },
  {
    id: "avg_80",
    icon: "📈",
    title: "Strong 80",
    desc: "Avg ≥ 80% over 15+ quizzes.",
    coins: 1000,
  },
  {
    id: "avg_90",
    icon: "📈",
    title: "Elite 90",
    desc: "Avg ≥ 90% over 20+ quizzes.",
    coins: 1500,
  },
];

// 🥇 Single-run score feats (no speed IDs here – all wired)
const SCORE_FEATS: Achievement[] = [
  {
    id: "score_15",
    icon: "🥇",
    title: "15+",
    desc: "Scored 15+ on a quiz.",
    coins: 400,
  },
  {
    id: "score_18",
    icon: "🥇",
    title: "18+",
    desc: "Scored 18+ on a quiz.",
    coins: 600,
  },
  {
    id: "score_19",
    icon: "🥇",
    title: "Almost Perfect",
    desc: "Missed only one question.",
    coins: 800,
  },
  {
    id: "pb_score",
    icon: "🏆",
    title: "Score PB",
    desc: "New personal-best score.",
    coins: 500,
  },
];

// 🔁 Quiz-per-day streak
const QUIZ_STREAK: Achievement[] = [
  {
    id: "qstreak_2",
    icon: "📅",
    title: "2 Days Running",
    desc: "Quiz taken 2 days in a row.",
    coins: 300,
  },
  {
    id: "qstreak_3",
    icon: "📅",
    title: "3 Days Running",
    desc: "Quiz taken 3 days in a row.",
    coins: 350,
  },
  {
    id: "qstreak_5",
    icon: "📅",
    title: "5 Days Running",
    desc: "Quiz taken 5 days in a row.",
    coins: 450,
  },
  {
    id: "qstreak_7",
    icon: "📅",
    title: "7 Days Running",
    desc: "Quiz taken 7 days in a row.",
    coins: 550,
  },
  {
    id: "qstreak_10",
    icon: "📅",
    title: "10 Days Running",
    desc: "Quiz taken 10 days in a row.",
    coins: 700,
  },
  {
    id: "qstreak_14",
    icon: "📅",
    title: "14 Days Running",
    desc: "Quiz taken 14 days in a row.",
    coins: 850,
  },
  {
    id: "qstreak_21",
    icon: "📅",
    title: "21 Days Running",
    desc: "Quiz taken 21 days in a row.",
    coins: 1100,
  },
  {
    id: "qstreak_30",
    icon: "📅",
    title: "30 Days Running",
    desc: "Quiz taken 30 days in a row.",
    coins: 1400,
  },
];

// 💪 Grit + Return
const GRIT_RETURN: Achievement[] = [
  {
    id: "grit_10",
    icon: "💪",
    title: "Grit 10",
    desc: "Finished 10 quizzes without a perfect yet.",
    coins: 500,
  },
  {
    id: "grit_25",
    icon: "💪",
    title: "Grit 25",
    desc: "Finished 25 quizzes without a perfect yet.",
    coins: 900,
  },
  {
    id: "return_7",
    icon: "🔄",
    title: "Comeback Week",
    desc: "Returned to a topic after 7+ days.",
    coins: 500,
  },
  {
    id: "return_30",
    icon: "🔄",
    title: "Long Comeback",
    desc: "Returned to a topic after 30+ days.",
    coins: 900,
  },
];

// 💬 Ask screen usage
const ASK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "ask_1",
    icon: "💬",
    title: "First Question",
    desc: "Asked Nova your first question.",
    coins: 300,
  },
  {
    id: "ask_5",
    icon: "💬",
    title: "Curious Mind",
    desc: "Asked 5 questions.",
    coins: 350,
  },
  {
    id: "ask_10",
    icon: "💬",
    title: "Deep Dive",
    desc: "Asked 10 questions.",
    coins: 400,
  },
  {
    id: "ask_20",
    icon: "💬",
    title: "Twenty Qs",
    desc: "Asked 20 questions.",
    coins: 450,
  },
  {
    id: "ask_25",
    icon: "💬",
    title: "Chat Explorer",
    desc: "Asked 25 questions.",
    coins: 500,
  },
  {
    id: "ask_50",
    icon: "💬",
    title: "Ask 50",
    desc: "Asked 50 questions.",
    coins: 650,
  },
  {
    id: "ask_75",
    icon: "💬",
    title: "Ask 75",
    desc: "Asked 75 questions.",
    coins: 800,
  },
  {
    id: "ask_100",
    icon: "💬",
    title: "Ask 100",
    desc: "Asked 100 questions.",
    coins: 1000,
  },
  {
    id: "ask_150",
    icon: "💬",
    title: "Ask 150",
    desc: "Asked 150 questions.",
    coins: 1200,
  },
  {
    id: "ask_200",
    icon: "💬",
    title: "Ask 200",
    desc: "Asked 200 questions.",
    coins: 1500,
  },
  {
    id: "ask_250",
    icon: "💬",
    title: "Ask 250",
    desc: "Asked 250 questions.",
    coins: 1800,
  },
  {
    id: "ask_300",
    icon: "💬",
    title: "Ask 300",
    desc: "Asked 300 questions.",
    coins: 2100,
  },
  {
    id: "ask_400",
    icon: "💬",
    title: "Ask 400",
    desc: "Asked 400 questions.",
    coins: 2500,
  },
  {
    id: "ask_500",
    icon: "💬",
    title: "Ask 500",
    desc: "Asked 500 questions.",
    coins: 3000,
  },
  {
    id: "ask_750",
    icon: "💬",
    title: "Ask 750",
    desc: "Asked 750 questions.",
    coins: 4000,
  },
  {
    id: "ask_1000",
    icon: "💬",
    title: "Ask 1000",
    desc: "Asked 1000 questions.",
    coins: 5000,
  },
];

// 🗂 Flashcards saved to collections
const FLASHCARD_ACHIEVEMENTS: Achievement[] = [
  {
    id: "flashcards_saved_1",
    icon: "🗂",
    title: "First Save",
    desc: "Saved your first flashcard to Collections.",
    coins: 300,
  },
  {
    id: "flashcards_saved_5",
    icon: "🗂",
    title: "Starter Deck",
    desc: "Saved 5 flashcards to Collections.",
    coins: 350,
  },
  {
    id: "flashcards_saved_10",
    icon: "🗂",
    title: "Growing Collection",
    desc: "Saved 10 flashcards to Collections.",
    coins: 400,
  },
  {
    id: "flashcards_saved_25",
    icon: "🗂",
    title: "Card Curator",
    desc: "Saved 25 flashcards to Collections.",
    coins: 500,
  },
  {
    id: "flashcards_saved_50",
    icon: "🗂",
    title: "Card Librarian",
    desc: "Saved 50 flashcards to Collections.",
    coins: 700,
  },
  {
    id: "flashcards_saved_100",
    icon: "🗂",
    title: "Card Archivist",
    desc: "Saved 100 flashcards to Collections.",
    coins: 1000,
  },
  {
    id: "flashcards_saved_200",
    icon: "🗂",
    title: "Collector Supreme",
    desc: "Saved 200 flashcards to Collections.",
    coins: 1500,
  },
];

// 🧩 Brainteaser pairs
const BRAIN_ACHIEVEMENTS: Achievement[] = [
  {
    id: "brain_pair_1",
    icon: "🧠",
    title: "First Riddle",
    desc: "Completed your first brainteaser pair.",
    coins: 300,
  },
  {
    id: "brain_pair_3",
    icon: "🧠",
    title: "Brain Tickle",
    desc: "Completed 3 brainteaser pairs.",
    coins: 350,
  },
  {
    id: "brain_pair_5",
    icon: "🧠",
    title: "Brain Boost",
    desc: "Completed 5 brainteaser pairs.",
    coins: 450,
  },
  {
    id: "brain_pair_10",
    icon: "🧠",
    title: "Puzzle Fan",
    desc: "Completed 10 brainteaser pairs.",
    coins: 600,
  },
  {
    id: "brain_pair_20",
    icon: "🧠",
    title: "Puzzle Lover",
    desc: "Completed 20 brainteaser pairs.",
    coins: 900,
  },
  {
    id: "brain_pair_50",
    icon: "🧠",
    title: "Puzzle Master",
    desc: "Completed 50 brainteaser pairs.",
    coins: 1500,
  },
  {
    id: "brain_pair_100",
    icon: "🧠",
    title: "Puzzle Legend",
    desc: "Completed 100 brainteaser pairs.",
    coins: 2200,
  },
];

// 🌬 Relax / breathe minutes
const RELAX_ACHIEVEMENTS: Achievement[] = [
  {
    id: "relax_minutes_5",
    icon: "🌬",
    title: "First Pause",
    desc: "Relaxed for 5 minutes total.",
    coins: 250,
  },
  {
    id: "relax_minutes_10",
    icon: "🌬",
    title: "Soft Landing",
    desc: "Relaxed for 10 minutes total.",
    coins: 300,
  },
  {
    id: "relax_minutes_20",
    icon: "🌬",
    title: "Deep Breaths",
    desc: "Relaxed for 20 minutes total.",
    coins: 350,
  },
  {
    id: "relax_minutes_30",
    icon: "🌬",
    title: "Steady Heart",
    desc: "Relaxed for 30 minutes total.",
    coins: 450,
  },
  {
    id: "relax_minutes_60",
    icon: "🌬",
    title: "Calm Hour",
    desc: "Relaxed for 60 minutes total.",
    coins: 700,
  },
  {
    id: "relax_minutes_120",
    icon: "🌬",
    title: "Harbor Time",
    desc: "Relaxed for 120 minutes total.",
    coins: 1200,
  },
];

// MASTER LIST

export const ACHIEVEMENT_LIST: Achievement[] = [
  ...STREAKS,
  ...QUIZ_COUNTS,
  ...DISTINCT_TOPICS,
  ...PERFECTS,
  ...CORRECTS,
  ...AVERAGES,
  ...SCORE_FEATS,
  ...QUIZ_STREAK,
  ...GRIT_RETURN,
  ...ASK_ACHIEVEMENTS,
  ...FLASHCARD_ACHIEVEMENTS,
  ...BRAIN_ACHIEVEMENTS,
  ...RELAX_ACHIEVEMENTS,
];

// backward-compat alias, in case anything still imports ACHIEVEMENTS
export const ACHIEVEMENTS = ACHIEVEMENT_LIST;
