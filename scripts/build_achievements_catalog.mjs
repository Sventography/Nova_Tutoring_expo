import fs from "fs"; import path from "path";
const out = path.join(process.cwd(), "app", "_data", "achievements_catalog.json");
const indexPath = path.join(process.cwd(), "app", "_data", "flashcard_index.json");

function safeReadJSON(p, fallback){ try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; } }

const ach = [];
const add = (id, name, desc, points, rarity, rule, hidden=true) => ach.push({ id, name, desc, points, rarity, hidden, rule });

// helpers
const R = (n)=>n; // rarity passthrough
const P = (n)=>n; // point scaler

/* ==== Load topics (for per-topic achievements) ==== */
const INDEX = safeReadJSON(indexPath, []); // [{id,title,group,count}]
const TOPICS = Array.isArray(INDEX) ? INDEX : [];
const topicIdSafe = (id) => id.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();

/* ==== Global families (same as before but modest points) ==== */
const quizCounts   = [1,3,5,10,15,20,25,30,40,50,75,100,150,200,250,300,400,500,750,1000];
const perfects     = [1,2,3,5,10,15,20,25,30,40,50,75,100];
const scoresAt     = [12,14,15,16,17,18,19,20];
const speedSecs    = [300,240,210,180,150,120,90];
const collections  = [1,3,5,10,15,20,25,30,40,50,75,100,150,200,250,300,400,500,750,1000,2500,5000];
const relaxMin     = [5,10,15,20,30,45,60,90,120,180,240,300,600,900,1200];
const relaxSessions= [1,2,3,5,10,15,20,25,30,40,50,75,100,150,200];
const uniqQuizT    = [3,5,7,10,15,20,25,30,40,50,75,100,150];
const uniqFlashT   = [3,5,7,10,15,20,25,30,40,50,75,100,150];
const streakDays   = [2,3,5,7,10,14,21,30,45,60,90,120,180,365];
const coinsEarned  = [50,100,200,300,400,500,750,1000,1500,2000,2500,5000,10000,25000,50000];
const coinsSpent   = [10,25,50,75,100,150,200,300,400,500,750,1000,2500,5000,10000];

/* Seed / onboarding / profile */
add("onboard_first_quiz","First Steps","Finish your first quiz.",P(5),R("bronze"),{type:"quiz_finished"},true);
add("profile_username","Brand New You","Set a username.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasUsername",min:1}},true);
add("profile_avatar","Face to a Name","Set an avatar.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasAvatar",min:1}},true);
add("profile_bio","Tell Your Story","Write a bio.",P(5),R("bronze"),{type:"counter_at_least",where:{key:"hasBio",min:1}},true);

/* Quiz totals */
for (const n of quizCounts) {
  const r = n<=25 ? "bronze" : n<=100 ? "silver" : n<=300 ? "gold" : "diamond";
  const p = n<=25 ? 6 : n<=100 ? 8 : n<=300 ? 10 : 12;
  add(`quiz_total_${n}`, `Quiz Grinder ${n}`, `Finish ${n} quizzes.`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalQuizzes", min:n } });
}

/* Perfect counts */
for (const n of perfects) {
  const r = n<=10 ? "silver" : n<=40 ? "gold" : "diamond";
  const p = n<=10 ? 15 : n<=40 ? 22 : 30;
  add(`perfect_${n}`, `Perfection x${n}`, `Earn ${n} perfect scores (20/20).`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalPerfects", min:n } });
}

/* Single-quiz thresholds */
for (const s of scoresAt) {
  const r = s<18 ? "silver" : s<20 ? "gold" : "gold";
  const p = s<18 ? 10 : s<20 ? 14 : 20;
  add(`score_atleast_${s}`, `High Score ${s}/20`, `Score at least ${s}/20 on any quiz.`, P(p), R(r), { type:"quiz_score_at_least", where:{ min:s } });
}

/* Speedruns (time remaining) */
for (const sec of speedSecs) {
  const mm = Math.floor(sec/60), ss = String(sec%60).padStart(2,"0");
  const label = sec>=300 ? "Time Lord" : sec>=240 ? "Fleet" : sec>=180 ? "Speedrunner" : "Blitz";
  const r = sec>=300 ? "gold" : sec>=180 ? "gold" : "silver";
  const p = sec>=300 ? 22 : sec>=180 ? 18 : 12;
  add(`speed_${sec}`, label, `Finish with ≥${mm}:${ss} remaining.`, P(p), R(r), { type:"quiz_time_remaining_at_least_sec", where:{ min:sec } });
}

/* Collections saved */
for (const n of collections) {
  const r = n<=50 ? "bronze" : n<=200 ? "silver" : n<=1000 ? "gold" : "diamond";
  const p = n<=50 ? 6 : n<=200 ? 9 : n<=1000 ? 12 : 16;
  add(`collections_${n}`, `Collector ${n}`, `Save ${n} flashcards to your collection.`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalCollectionsAdded", min:n } });
}

/* Relax time & sessions */
for (const m of relaxMin) {
  const r = m<=60 ? "bronze" : m<=240 ? "silver" : m<=600 ? "gold" : "diamond";
  const p = m<=60 ? 5 : m<=240 ? 8 : m<=600 ? 12 : 18;
  add(`relax_time_${m}m`, `Zenzen ${m}`, `Spend ${m} minutes in Relax.`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalRelaxSeconds", min:m*60 } });
}
for (const n of relaxSessions) {
  const r = n<=10 ? "bronze" : n<=50 ? "silver" : n<=150 ? "gold" : "diamond";
  const p = n<=10 ? 5 : n<=50 ? 8 : n<=150 ? 12 : 16;
  add(`relax_sessions_${n}`, `Calm Habit ${n}`, `Complete ${n} relax sessions.`, P(p), R(r), { type:"counter_at_least", where:{ key:"relaxSessions", min:n } });
}

/* Unique topics (global variety) */
for (const n of uniqQuizT) {
  const r = n<=15 ? "silver" : n<=50 ? "gold" : "diamond";
  const p = n<=15 ? 14 : n<=50 ? 20 : 28;
  add(`unique_quiz_topics_${n}`, `Wide Learner ${n}`, `Finish quizzes in ${n} different topics.`, P(p), R(r), { type:"counter_at_least", where:{ key:"uniqueQuizTopics", min:n } });
}
for (const n of uniqFlashT) {
  const r = n<=15 ? "silver" : n<=50 ? "gold" : "diamond";
  const p = n<=15 ? 12 : n<=50 ? 18 : 24;
  add(`unique_flash_topics_${n}`, `Curious Collector ${n}`, `Save cards from ${n} different topics.`, P(p), R(r), { type:"counter_at_least", where:{ key:"uniqueFlashTopics", min:n } });
}

/* Streaks */
for (const d of streakDays) {
  const r = d<=14 ? "silver" : d<=60 ? "gold" : "diamond";
  const p = d<=14 ? 16 : d<=60 ? 22 : 35;
  add(`streak_${d}d`, `Streak ${d}`, `Be active ${d} days in a row.`, P(p), R(r), { type:"streak_days_at_least", where:{ min:d } });
}

/* Coins earned / spent */
for (const n of coinsEarned) {
  const r = n<=500 ? "bronze" : n<=2000 ? "silver" : n<=10000 ? "gold" : "diamond";
  const p = n<=500 ? 6 : n<=2000 ? 10 : n<=10000 ? 14 : 20;
  add(`coins_earned_${n}`, `Earner ${n}`, `Earn ${n} coins total.`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalCoinsEarned", min:n } });
}
for (const n of coinsSpent) {
  const r = n<=200 ? "bronze" : n<=750 ? "silver" : n<=5000 ? "gold" : "diamond";
  const p = n<=200 ? 6 : n<=750 ? 10 : n<=5000 ? 14 : 20;
  add(`coins_spent_${n}`, `Supporter ${n}`, `Spend ${n} coins total.`, P(p), R(r), { type:"counter_at_least", where:{ key:"totalCoinsSpent", min:n } });
}

/* ===== PER-TOPIC FAMILIES ===== */
for (const t of TOPICS) {
  const id = topicIdSafe(t.id);
  const title = t.title || id;

  // T1: first quiz in this topic
  add(`t:${id}:quiz_1`, `First in ${title}`, `Finish a quiz in ${title}.`,
      P(4), R("bronze"),
      { type:"topic_counter_at_least", where:{ counter:"quizByTopic", topicId: t.id, min:1 } });

  // T2: best score at least 18/20 in this topic
  add(`t:${id}:best_18`, `Sharp in ${title}`, `Reach ≥18/20 in ${title}.`,
      P(6), R("silver"),
      { type:"topic_best_score_at_least", where:{ topicId: t.id, min: 18 } });

  // T3: perfects in this topic (1 and 3)
  add(`t:${id}:perfect_1`, `Perfect in ${title}`, `Get a perfect score in ${title}.`,
      P(8), R("gold"),
      { type:"topic_counter_at_least", where:{ counter:"topicPerfects", topicId: t.id, min: 1 } });

  add(`t:${id}:perfect_3`, `Master of ${title}`, `Get 3 perfect scores in ${title}.`,
      P(12), R("diamond"),
      { type:"topic_counter_at_least", where:{ counter:"topicPerfects", topicId: t.id, min: 3 } });

  // T4: save 10 cards from this topic
  add(`t:${id}:collect_10`, `Curator of ${title}`, `Save 10 cards from ${title}.`,
      P(5), R("silver"),
      { type:"topic_counter_at_least", where:{ counter:"collectionsByTopic", topicId: t.id, min: 10 } });
}

/* output */
const catalog = { version: 2, achievements: ach };
fs.writeFileSync(out, JSON.stringify(catalog, null, 2));
console.log(`✅ wrote ${ach.length} achievements from ${TOPICS.length} topics → ${out}`);
