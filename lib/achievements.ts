import { getJSON, setJSON } from "./storage";

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  hidden?: boolean;
  earnedAt?: string | null;
  progress?: { current: number; target?: number };
};

type EarnedMap = Record<string, Achievement>;

const KEY_ACH_STORE = "ACHIEVEMENTS_STORE";
const KEY_ACH_DEFS = "ACHIEVEMENTS_DEFS";

const DEFAULT_DEFS: Achievement[] = [
  { id: "first_question", title: "First Question", description: "Ask your first question.", points: 25 },
  { id: "ask_25", title: "Curious Cat", description: "Ask 25 questions.", points: 50, progress: { current: 0, target: 25 } },
  { id: "ask_50", title: "Inquisitor", description: "Ask 50 questions.", points: 100, progress: { current: 0, target: 50 } },
  { id: "ask_100", title: "Relentless Seeker", description: "Ask 100 questions.", points: 250, progress: { current: 0, target: 100 } },
  { id: "voice_first", title: "First Voice Input", description: "Use voice input once.", points: 25, progress: { current: 0, target: 1 } },
  { id: "voice_25", title: "Talkative", description: "Use voice input 25 times.", points: 75, progress: { current: 0, target: 25 } },
  { id: "quiz_perfect_20", title: "Perfect Score", description: "Score 20/20 on a quiz.", points: 150 },
  { id: "quiz_streak_3", title: "On a Roll", description: "3 quiz completions in a row.", points: 75, progress: { current: 0, target: 3 } },
  { id: "daily_checkin_1", title: "First Check-In", description: "Do your first daily check-in.", points: 10, progress: { current: 0, target: 1 } },
  { id: "daily_checkin_7", title: "Seven-Day Spark", description: "7-day check-in streak.", points: 70, progress: { current: 0, target: 7 } },
  { id: "first_time_buyer", title: "First Time Buyer", description: "Make your first in-app purchase.", points: 100 },
  { id: "collector", title: "Collector", description: "Save 50 flashcards to your collection.", points: 100, progress: { current: 0, target: 50 } },
  { id: "master_collector", title: "Master Collector", description: "Save 200 flashcards to your collection.", points: 300, progress: { current: 0, target: 200 } },
  { id: "early_supporter", title: "Early Supporter", description: "Support us in the first month of launch.", points: 500, hidden: true },
  { id: "bug_hunter", title: "Bug Hunter", description: "Report a valid bug or issue.", points: 150, hidden: true },
  { id: "community_helper", title: "Community Helper", description: "Help another user with their question.", points: 200, hidden: true },
  { id: "social_butterfly", title: "Social Butterfly", description: "Share the app on social media.", points: 50, hidden: true },
  { id: "event_attendee", title: "Event Attendee", description: "Attend an official app event or webinar.", points: 100, hidden: true },
  { id: "feature_suggester", title: "Feature Suggester", description: "Suggest a feature we implement.", points: 150, hidden: true },
  { id: "long_time_user", title: "Long Time User", description: "Use the app for 6 months.", points: 300, hidden: true },
  { id: "legendary_user", title: "Legendary User", description: "Use the app for 1 year.", points: 1000, hidden: true },
  { id: "bug_squasher", title: "Bug Squasher", description: "Find and report 5 bugs.", points: 400, hidden: true, progress: { current: 0, target: 5 } },
  { id: "social_influencer", title: "Social Influencer", description: "Get 1000 likes/shares on a post about us.", points: 500, hidden: true, progress: { current: 0, target: 1000 } },
  { id: "premium_member", title: "Premium Member", description: "Subscribe to a premium plan.", points: 200, hidden: true },
  { id: "lifetime_supporter", title: "Lifetime Supporter", description: "Purchase a lifetime subscription.", points: 1000, hidden: true },
  { id: "charity_donor", title: "Charity Donor", description: "Donate to our partnered charity.", points: 300, hidden: true },
  { id: "flashcard_fanatic", title: "Flashcard Fanatic", description: "Review 100 flashcards in a day.", points: 150, hidden: true, progress: { current: 0, target: 100 } },
  { id: "quiz_master", title: "Quiz Master", description: "Complete 50 quizzes.", points: 250, hidden: true, progress: { current: 0, target: 50 } },
  { id: "night_owl", title: "Night Owl", description: "Use the app between 2 AM and 4 AM.", points: 100, hidden: true },
  { id: "early_bird", title: "Early Bird", description: "Use the app between 5 AM and 7 AM.", points: 100, hidden: true },
  { id: "feedback_giver", title: "Feedback Giver", description: "Provide feedback through our survey.", points: 100, hidden: true },
  { id: "customization_king", title: "Customization King", description: "Customize your profile with avatar and bio.", points: 150, hidden: true },
  { id: "social_sharer", title: "Social Sharer", description: "Share 10 different achievements on social media.", points: 200, hidden: true, progress: { current: 0, target: 10 } },
  { id: "content_creator", title: "Content Creator", description: "Create and share content about the app (blog, video, etc.).", points: 300, hidden: true },
  { id: "customer_champion", title: "Customer Champion", description: "Help improve customer support with your feedback.", points: 300, hidden: true },
  { id: "trendsetter", title: "Trendsetter", description: "Be among the first 1000 users to sign up.", points: 500, hidden: true },
];
async function loadDefs(): Promise<Achievement[]> {
  const defs = await getJSON<Achievement[]>(KEY_ACH_DEFS);
  return defs && defs.length ? defs : DEFAULT_DEFS;
}

async function saveDefs(defs: Achievement[]) {
  await setJSON(KEY_ACH_DEFS, defs);
}

async function loadStore(): Promise<EarnedMap> {
  const st = await getJSON<EarnedMap>(KEY_ACH_STORE);
  return st || {};
}

async function saveStore(st: EarnedMap) {
  await setJSON(KEY_ACH_STORE, st);
}

export async function listDefinitions(): Promise<Achievement[]> {
  return loadDefs();
}

export async function setDefinitions(defs: Achievement[]) {
  await saveDefs(defs);
}

export async function listEarned(): Promise<Achievement[]> {
  const st = await loadStore();
  return Object.values(st).sort((a, b) => (a.earnedAt || "").localeCompare(b.earnedAt || ""));
}

export async function isEarned(id: string): Promise<boolean> {
  const st = await loadStore();
  return !!st[id]?.earnedAt;
}

export async function earn(id: string): Promise<Achievement | null> {
  const defs = await loadDefs();
  const def = defs.find(d => d.id === id);
  if (!def) return null;
  const st = await loadStore();
  if (st[id]?.earnedAt) return st[id]; // already earned
  const now = new Date().toISOString();
  const earned: Achievement = { ...def, earnedAt: now };
  st[id] = earned;
  await saveStore(st);
  return earned;
}

export async function getProgress(id: string): Promise<{ current: number; target?: number } | null> {
  const st = await loadStore();
  return st[id]?.progress || null;
}

export async function setProgress(id: string, current: number, target?: number): Promise<Achievement | null> {
  const defs = await loadDefs();
  const def = defs.find(d => d.id === id);
  if (!def) return null;
  const st = await loadStore();
  const base: Achievement = st[id] || { ...def, earnedAt: null, progress: def.progress ? { ...def.progress } : undefined };
  base.progress = { current, target: target ?? base.progress?.target };
  st[id] = base;
  await saveStore(st);
  // auto-earn if target reached
  if (base.progress?.target && base.progress.current >= base.progress.target) {
    return earn(id);
  }
  return st[id];
}

/** Convenience: increment progress and auto-award when reaching target */
export async function incProgress(id: string, delta = 1): Promise<Achievement | null> {
  const st = await loadStore();
  const defs = await loadDefs();
  const def = defs.find(d => d.id === id);
  if (!def) return null;
  const curr = st[id]?.progress?.current ?? def.progress?.current ?? 0;
  const target = st[id]?.progress?.target ?? def.progress?.target;
  return setProgress(id, curr + delta, target);
}

/** Domain helpers you can call from hooks or components */
export async function recordAskedQuestion(totalSoFar?: number) {
  await earn("first_question");
  if (typeof totalSoFar === "number") {
    await setProgress("ask_25", Math.min(totalSoFar, 25), 25);
    await setProgress("ask_50", Math.min(totalSoFar, 50), 50);
    await setProgress("ask_100", Math.min(totalSoFar, 100), 100);
  } else {
    await incProgress("ask_25", 1);
    await incProgress("ask_50", 1);
    await incProgress("ask_100", 1);
  }
}

export async function recordVoiceUse(totalSoFar?: number) {
  if (typeof totalSoFar === "number") {
    await setProgress("voice_first", Math.min(totalSoFar, 1), 1);
    await setProgress("voice_25", Math.min(totalSoFar, 25), 25);
  } else {
    await incProgress("voice_first", 1);
    await incProgress("voice_25", 1);
  }
}

export async function recordQuizResult(score: number, max: number) {
  if (max === 20 && score === 20) await earn("quiz_perfect_20");
}

export async function recordQuizStreak(streakCount: number) {
  await setProgress("quiz_streak_3", Math.min(streakCount, 3), 3);
}

export async function recordDailyCheckin(streakCount: number) {
  await setProgress("daily_checkin_1", Math.min(streakCount, 1), 1);
  await setProgress("daily_checkin_7", Math.min(streakCount, 7), 7);
}

export async function totalEarnedPoints(): Promise<number> {
  const earned = await listEarned();
  return earned.reduce((sum, a) => sum + (a.points || 0), 0);
}

/** Danger: wipes all earned/progress (keeps definitions) */
export async function resetAll(): Promise<void> {
  await saveStore({});
}
