import fs from "fs";
import path from "path";

const out = path.join(process.cwd(), "app", "_data", "achievements_catalog.json");

function safeReadJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

/* ================= ECONOMY MULTIPLIERS ================= */
const REGULAR_MULTIPLIER = 10;
const LEGENDARY_MULTIPLIER = 3;
/* ====================================================== */

const ach = [];
const add = (id, name, desc, points, rarity, rule, hidden = true) => {
  const isLegendary = rarity === "diamond";
  const finalPoints = isLegendary
    ? points * LEGENDARY_MULTIPLIER
    : points * REGULAR_MULTIPLIER;

  ach.push({
    id,
    name,
    desc,
    points: finalPoints,
    rarity,
    hidden,
    rule,
  });
};

// helpers
const R = (n) => n;
const P = (n) => n;

/* ==== Global families ==== */
const quizCounts   = [1,3,5,10,15,20,25,30,40,50,75,100,150,200,250,300,400,500,750,1000];
const perfects     = [1,2,3,5,10,15,20,25,30,40,50,75,100];
const scoresAt     = [12,14,15,16,17,18,19,20];
const speedSecs    = [300,240,210,180,150,120,90];
const collections  = [1,3,5,10,15,20,25,30,40,50,75,100,150,200,250,300,400,500,750,1000,2500,5000];
const relaxMin     = [5,10,15,20,30,45,60,90,120,180,240,300,600,900,1200];
const relaxSessions= [1,2,3,5,10,15,20,25,30,40,50,75,100,150,200];
const streakDays   = [2,3,5,7,10,14,21,30,45,60,90,120,180,365];
const coinsEarned  = [50,100,200,300,400,500,750,1000,1500,2000,2500,5000,10000,25000,50000];
const coinsSpent   = [10,25,50,75,100,150,200,300,400,500,750,1000,2500,5000,10000];

/* Seed / profile */
add("onboard_first_quiz","First Steps","Finish your first quiz.",P(5),R("bronze"),{type:"quiz_finished"},true);
add("profile_username","Brand New You","Set a username.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasUsername",min:1}},true);
add("profile_avatar","Face to a Name","Set an avatar.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasAvatar",min:1}},true);
add("profile_bio","Tell Your Story","Write a bio.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasBio",min:1}},true);

/* Quiz totals */
for (const n of quizCounts) {
  const r = n<=25 ? "bronze" : n<=100 ? "silver" : n<=300 ? "gold" : "diamond";
  const p = n<=25 ? 6 : n<=100 ? 8 : n<=300 ? 10 : 12;
  add(`quiz_total_${n}`, `Quiz Grinder ${n}`, `Finish ${n} quizzes.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalQuizzes", min:n } });
}

/* Perfect scores */
for (const n of perfects) {
  const r = n<=10 ? "silver" : n<=40 ? "gold" : "diamond";
  const p = n<=10 ? 15 : n<=40 ? 22 : 30;
  add(`perfect_${n}`, `Perfection x${n}`, `Earn ${n} perfect scores.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalPerfects", min:n } });
}

/* Score thresholds */
for (const s of scoresAt) {
  const r = s < 18 ? "silver" : "gold";
  const p = s < 18 ? 10 : s < 20 ? 14 : 20;
  add(`score_atleast_${s}`, `High Score ${s}/20`,
      `Score at least ${s}/20 on any quiz.`,
      P(p), R(r), { type:"quiz_score_at_least", where:{ min:s } });
}

/* Speed */
for (const sec of speedSecs) {
  const mm = Math.floor(sec/60), ss = String(sec%60).padStart(2,"0");
  const r = sec >= 240 ? "gold" : "silver";
  const p = sec >= 240 ? 22 : 12;
  add(`speed_${sec}`, "Speedrun",
      `Finish with ≥${mm}:${ss} remaining.`,
      P(p), R(r), { type:"quiz_time_remaining_at_least_sec", where:{ min:sec } });
}

/* Collections */
for (const n of collections) {
  const r = n<=50 ? "bronze" : n<=200 ? "silver" : n<=1000 ? "gold" : "diamond";
  const p = n<=50 ? 6 : n<=200 ? 9 : n<=1000 ? 12 : 16;
  add(`collections_${n}`, `Collector ${n}`,
      `Save ${n} flashcards.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalCollectionsAdded", min:n } });
}

/* Relax */
for (const m of relaxMin) {
  const r = m<=60 ? "bronze" : m<=240 ? "silver" : m<=600 ? "gold" : "diamond";
  const p = m<=60 ? 5 : m<=240 ? 8 : m<=600 ? 12 : 18;
  add(`relax_time_${m}m`, `Zenzen ${m}`,
      `Spend ${m} minutes relaxing.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalRelaxSeconds", min:m*60 } });
}

for (const n of relaxSessions) {
  const r = n<=10 ? "bronze" : n<=50 ? "silver" : n<=150 ? "gold" : "diamond";
  const p = n<=10 ? 5 : n<=50 ? 8 : n<=150 ? 12 : 16;
  add(`relax_sessions_${n}`, `Calm Habit ${n}`,
      `Complete ${n} relax sessions.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"relaxSessions", min:n } });
}

/* Streaks */
for (const d of streakDays) {
  const r = d<=14 ? "silver" : d<=60 ? "gold" : "diamond";
  const p = d<=14 ? 16 : d<=60 ? 22 : 35;
  add(`streak_${d}d`, `Streak ${d}`,
      `Be active ${d} days in a row.`,
      P(p), R(r), { type:"streak_days_at_least", where:{ min:d } });
}

/* Coins */
for (const n of coinsEarned) {
  const r = n<=500 ? "bronze" : n<=2000 ? "silver" : n<=10000 ? "gold" : "diamond";
  const p = n<=500 ? 6 : n<=2000 ? 10 : n<=10000 ? 14 : 20;
  add(`coins_earned_${n}`, `Earner ${n}`,
      `Earn ${n} coins total.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalCoinsEarned", min:n } });
}

for (const n of coinsSpent) {
  const r = n<=200 ? "bronze" : n<=750 ? "silver" : n<=5000 ? "gold" : "diamond";
  const p = n<=200 ? 6 : n<=750 ? 10 : n<=5000 ? 14 : 20;
  add(`coins_spent_${n}`, `Supporter ${n}`,
      `Spend ${n} coins total.`,
      P(p), R(r), { type:"counter_at_least", where:{ key:"totalCoinsSpent", min:n } });
}

/* Output */
const catalog = { version: 3, achievements: ach };
fs.writeFileSync(out, JSON.stringify(catalog, null, 2));
console.log(`✅ wrote ${ach.length} achievements → ${out}`);
