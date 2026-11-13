// app/constants/achievements.ts
export type Achievement = {
  id: string;
  icon: string;
  title: string;
  desc: string;
};

// 🔥 Streaks (daily check-ins)
const STREAKS: Achievement[] = [
  {
    id: "first_check",
    icon: "🌟",
    title: "First Check-In",
    desc: "Checked in for the first time.",
  },
  { id: "streak_1", icon: "🔥", title: "Day 1", desc: "One day streak." },
  {
    id: "streak_3",
    icon: "🔥🔥",
    title: "3 Day Streak",
    desc: "Checked in 3 days in a row.",
  },
  {
    id: "streak_5",
    icon: "🔥🔥🔥",
    title: "5 Day Streak",
    desc: "Five day streak.",
  },
  { id: "streak_7", icon: "🔥7", title: "One Week", desc: "Seven day streak." },
  {
    id: "streak_10",
    icon: "🔥10",
    title: "Tenacious",
    desc: "Ten day streak.",
  },
  {
    id: "streak_14",
    icon: "🔥14",
    title: "Two Weeks",
    desc: "Fourteen day streak.",
  },
  {
    id: "streak_21",
    icon: "🔥21",
    title: "Habit Formed",
    desc: "Twenty-one day streak.",
  },
  {
    id: "streak_30",
    icon: "🔥30",
    title: "One Month",
    desc: "Thirty day streak.",
  },
  {
    id: "streak_50",
    icon: "🔥50",
    title: "Fifty Flames",
    desc: "Fifty day streak.",
  },
  {
    id: "streak_75",
    icon: "🔥75",
    title: "On a Roll",
    desc: "Seventy-five day streak.",
  },
  {
    id: "streak_100",
    icon: "🔥100",
    title: "Century Streak",
    desc: "One hundred day streak.",
  },
  {
    id: "check_morning",
    icon: "🌅",
    title: "Early Bird",
    desc: "Checked in before 9am.",
  },
  {
    id: "check_night",
    icon: "🌙",
    title: "Night Owl",
    desc: "Checked in after 9pm.",
  },
];

// 🧠 Quiz count milestones
const QUIZ_COUNTS: Achievement[] = [
  {
    id: "quiz_1",
    icon: "🎯",
    title: "First Quiz",
    desc: "Completed your first quiz.",
  },
  { id: "quiz_5", icon: "🎯", title: "Quiz 5", desc: "Completed 5 quizzes." },
  {
    id: "quiz_10",
    icon: "🎯",
    title: "Quiz 10",
    desc: "Completed 10 quizzes.",
  },
  {
    id: "quiz_20",
    icon: "🎯",
    title: "Quiz 20",
    desc: "Completed 20 quizzes.",
  },
  {
    id: "quiz_30",
    icon: "🎯",
    title: "Quiz 30",
    desc: "Completed 30 quizzes.",
  },
  {
    id: "quiz_50",
    icon: "🎯",
    title: "Quiz 50",
    desc: "Completed 50 quizzes.",
  },
  {
    id: "quiz_75",
    icon: "🎯",
    title: "Quiz 75",
    desc: "Completed 75 quizzes.",
  },
  {
    id: "quiz_100",
    icon: "🎯",
    title: "Quiz 100",
    desc: "Completed 100 quizzes.",
  },
  {
    id: "quiz_150",
    icon: "🎯",
    title: "Quiz 150",
    desc: "Completed 150 quizzes.",
  },
  {
    id: "quiz_200",
    icon: "🎯",
    title: "Quiz 200",
    desc: "Completed 200 quizzes.",
  },
];

// 🗂️ Distinct topics attempted
const DISTINCT_TOPICS: Achievement[] = [
  {
    id: "topics_3",
    icon: "🗂️",
    title: "Explorer",
    desc: "Tried 3 different topics.",
  },
  {
    id: "topics_5",
    icon: "🗂️",
    title: "Curious",
    desc: "Tried 5 different topics.",
  },
  {
    id: "topics_10",
    icon: "🗂️",
    title: "Wide Learner",
    desc: "Tried 10 different topics.",
  },
  {
    id: "topics_15",
    icon: "🗂️",
    title: "Surveyor",
    desc: "Tried 15 different topics.",
  },
  {
    id: "topics_20",
    icon: "🗂️",
    title: "Generalist",
    desc: "Tried 20 different topics.",
  },
  {
    id: "topics_30",
    icon: "🗂️",
    title: "Polymath (lite)",
    desc: "Tried 30 topics.",
  },
  {
    id: "topics_40",
    icon: "🗂️",
    title: "Omni-Curious",
    desc: "Tried 40 topics.",
  },
  { id: "topics_50", icon: "🗂️", title: "Collector", desc: "Tried 50 topics." },
];

// 💯 Perfects + Mastery
const PERFECTS: Achievement[] = [
  {
    id: "perfect_1",
    icon: "💯",
    title: "First Perfect",
    desc: "Scored 100% on a quiz.",
  },
  {
    id: "perfect_3",
    icon: "💯",
    title: "Triple Perfect",
    desc: "Three 100% quizzes.",
  },
  {
    id: "perfect_5",
    icon: "💯",
    title: "Five Perfects",
    desc: "Five 100% quizzes.",
  },
  {
    id: "perfect_10",
    icon: "💯",
    title: "Deca Perfect",
    desc: "Ten 100% quizzes.",
  },
  {
    id: "perfect_20",
    icon: "💯",
    title: "Perfect Streaker",
    desc: "Twenty 100% quizzes.",
  },
  {
    id: "master_3",
    icon: "🏅",
    title: "Master 3",
    desc: "Perfect 20/20 in 3 different topics.",
  },
  {
    id: "master_5",
    icon: "🏅",
    title: "Master 5",
    desc: "Perfect 20/20 in 5 different topics.",
  },
  {
    id: "master_10",
    icon: "🏅",
    title: "Master 10",
    desc: "Perfect 20/20 in 10 different topics.",
  },
  {
    id: "master_20",
    icon: "🏅",
    title: "Master 20",
    desc: "Perfect 20/20 in 20 different topics.",
  },
];

// ✅ Correct answers cumulative
const CORRECTS: Achievement[] = [
  {
    id: "correct_50",
    icon: "✅",
    title: "50 Correct",
    desc: "Got 50 answers correct.",
  },
  {
    id: "correct_100",
    icon: "✅",
    title: "100 Correct",
    desc: "Got 100 answers correct.",
  },
  {
    id: "correct_250",
    icon: "✅",
    title: "250 Correct",
    desc: "Got 250 answers correct.",
  },
  {
    id: "correct_500",
    icon: "✅",
    title: "500 Correct",
    desc: "Got 500 answers correct.",
  },
  {
    id: "correct_750",
    icon: "✅",
    title: "750 Correct",
    desc: "Got 750 answers correct.",
  },
  {
    id: "correct_1000",
    icon: "✅",
    title: "1000 Correct",
    desc: "Got 1000 answers correct.",
  },
  {
    id: "correct_1500",
    icon: "✅",
    title: "1500 Correct",
    desc: "Got 1500 answers correct.",
  },
  {
    id: "correct_2000",
    icon: "✅",
    title: "2000 Correct",
    desc: "Got 2000 answers correct.",
  },
];

// 📊 Averages
const AVERAGES: Achievement[] = [
  {
    id: "avg_70",
    icon: "📈",
    title: "Solid 70",
    desc: "Avg ≥ 70% over 10+ quizzes.",
  },
  {
    id: "avg_80",
    icon: "📈",
    title: "Strong 80",
    desc: "Avg ≥ 80% over 15+ quizzes.",
  },
  {
    id: "avg_90",
    icon: "📈",
    title: "Elite 90",
    desc: "Avg ≥ 90% over 20+ quizzes.",
  },
];

// ⚡ Speed / Score single-run feats
const SPEED_SCORE: Achievement[] = [
  {
    id: "speed_120",
    icon: "⚡",
    title: "< 120s",
    desc: "Finished a quiz under 120 seconds.",
  },
  {
    id: "speed_90",
    icon: "⚡",
    title: "< 90s",
    desc: "Finished a quiz under 90 seconds.",
  },
  {
    id: "speed_60",
    icon: "⚡",
    title: "< 60s",
    desc: "Finished a quiz under 60 seconds.",
  },
  {
    id: "speed_45",
    icon: "⚡",
    title: "< 45s",
    desc: "Finished a quiz under 45 seconds.",
  },
  {
    id: "speed_30",
    icon: "⚡",
    title: "< 30s",
    desc: "Finished a quiz under 30 seconds.",
  },
  { id: "score_15", icon: "🥇", title: "15+", desc: "Scored 15+ on a quiz." },
  { id: "score_18", icon: "🥇", title: "18+", desc: "Scored 18+ on a quiz." },
  {
    id: "score_19",
    icon: "🥇",
    title: "Almost Perfect",
    desc: "Missed only one question.",
  },
  {
    id: "pb_speed",
    icon: "🚀",
    title: "Speed PB",
    desc: "New personal-best speed.",
  },
  {
    id: "pb_score",
    icon: "🏆",
    title: "Score PB",
    desc: "New personal-best score.",
  },
];

// 🔁 Quiz-per-day streak
const QUIZ_STREAK: Achievement[] = [
  {
    id: "qstreak_2",
    icon: "📅",
    title: "2 Days Running",
    desc: "Quiz taken 2 days in a row.",
  },
  {
    id: "qstreak_3",
    icon: "📅",
    title: "3 Days Running",
    desc: "Quiz taken 3 days in a row.",
  },
  {
    id: "qstreak_5",
    icon: "📅",
    title: "5 Days Running",
    desc: "Quiz taken 5 days in a row.",
  },
  {
    id: "qstreak_7",
    icon: "📅",
    title: "7 Days Running",
    desc: "Quiz taken 7 days in a row.",
  },
  {
    id: "qstreak_10",
    icon: "📅",
    title: "10 Days Running",
    desc: "Quiz taken 10 days in a row.",
  },
  {
    id: "qstreak_14",
    icon: "📅",
    title: "14 Days Running",
    desc: "Quiz taken 14 days in a row.",
  },
  {
    id: "qstreak_21",
    icon: "📅",
    title: "21 Days Running",
    desc: "Quiz taken 21 days in a row.",
  },
  {
    id: "qstreak_30",
    icon: "📅",
    title: "30 Days Running",
    desc: "Quiz taken 30 days in a row.",
  },
];

// 💪 Grit + Return
const GRIT_RETURN: Achievement[] = [
  {
    id: "grit_10",
    icon: "💪",
    title: "Grit 10",
    desc: "Finished 10 quizzes without a perfect yet.",
  },
  {
    id: "grit_25",
    icon: "💪",
    title: "Grit 25",
    desc: "Finished 25 quizzes without a perfect yet.",
  },
  {
    id: "return_7",
    icon: "🔄",
    title: "Comeback Week",
    desc: "Returned to a topic after 7+ days.",
  },
  {
    id: "return_30",
    icon: "🔄",
    title: "Long Comeback",
    desc: "Returned to a topic after 30+ days.",
  },
];

// 🧪 Mixed / Collections
export const MIXED_ACHIEVEMENTS: Achievement[] = [
  {
    id: "mix_1",
    icon: "🧪",
    title: "First Mix",
    desc: "Completed your first mixed-topic quiz.",
  },
  {
    id: "mix_5",
    icon: "🧪🧪",
    title: "Mix Apprentice",
    desc: "Completed 5 mixed-topic quizzes.",
  },
  {
    id: "mix_10",
    icon: "🧪✨",
    title: "Mix Master",
    desc: "Completed 10 mixed-topic quizzes.",
  },
  {
    id: "mix_perf",
    icon: "🌈",
    title: "Perfect Mix",
    desc: "Perfect score on a mixed-topic quiz.",
  },
  {
    id: "mix_speed",
    icon: "🚀",
    title: "Speedy Mix",
    desc: "Mixed-topic quiz under 90 seconds.",
  },
  {
    id: "plist_3",
    icon: "🎛️",
    title: "Playlist Pro",
    desc: "Perfect scores on 3 different collections.",
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  ...STREAKS,
  ...QUIZ_COUNTS,
  ...DISTINCT_TOPICS,
  ...PERFECTS,
  ...CORRECTS,
  ...AVERAGES,
  ...SPEED_SCORE,
  ...QUIZ_STREAK,
  ...GRIT_RETURN,
  ...MIXED_ACHIEVEMENTS,
];
