const fs = require("fs");

function makeAchievement(id, title, desc, reward, tier) {
  return { id, title, desc, reward, tier };
}

const achievements = [];

// --- Quiz milestones ---
[10, 20, 50, 100, 250, 500, 1000].forEach(n => {
  achievements.push(
    makeAchievement(
      `quiz_${n}`,
      `Quiz ${n}`,
      `Answer ${n} quiz questions`,
      Math.floor(n / 2),
      n < 50 ? "bronze" : n < 250 ? "silver" : n < 500 ? "gold" : "diamond"
    )
  );
});

// --- Ask tab milestones ---
[10, 20, 50, 100, 250, 500, 1000].forEach(n => {
  achievements.push(
    makeAchievement(
      `ask_${n}`,
      `Asked ${n}`,
      `Ask ${n} questions`,
      Math.floor(n / 2),
      n < 50 ? "bronze" : n < 250 ? "silver" : n < 500 ? "gold" : "diamond"
    )
  );
});

// --- Voice milestones ---
[1, 10, 25, 50, 100, 250, 500].forEach(n => {
  achievements.push(
    makeAchievement(
      `voice_${n}`,
      `Voice ${n}`,
      `Ask ${n} voice questions`,
      Math.floor(n * 3),
      n < 25 ? "bronze" : n < 100 ? "silver" : n < 250 ? "gold" : "diamond"
    )
  );
});

// --- Certificates ---
[1, 5, 10, 20, 50, 100].forEach(n => {
  achievements.push(
    makeAchievement(
      `cert_${n}`,
      `Certificate ${n}`,
      `Earn ${n} certificates`,
      n * 50,
      n < 10 ? "bronze" : n < 20 ? "silver" : n < 50 ? "gold" : "diamond"
    )
  );
});

// --- Collections ---
[1, 10, 50, 100, 250, 500].forEach(n => {
  achievements.push(
    makeAchievement(
      `collect_${n}`,
      `Collector ${n}`,
      `Save ${n} flashcards`,
      n * 2,
      n < 50 ? "bronze" : n < 250 ? "silver" : n < 500 ? "gold" : "diamond"
    )
  );
});

// --- Shop purchases ---
[1, 5, 10, 20, 50, 100].forEach(n => {
  achievements.push(
    makeAchievement(
      `shop_${n}`,
      `Shopper ${n}`,
      `Buy ${n} items`,
      n * 10,
      n < 10 ? "bronze" : n < 20 ? "silver" : n < 50 ? "gold" : "diamond"
    )
  );
});

// --- Daily streaks ---
[1, 3, 7, 14, 30, 100, 365].forEach(n => {
  achievements.push(
    makeAchievement(
      `streak_${n}`,
      `Streak ${n}`,
      `Maintain a ${n}-day streak`,
      n * 5,
      n < 14 ? "bronze" : n < 100 ? "silver" : n < 365 ? "gold" : "diamond"
    )
  );
});

// --- Hidden / fun extras ---
achievements.push(
  makeAchievement("night_owl", "Night Owl", "Use the app at 3 AM", 50, "silver")
);
achievements.push(
  makeAchievement("big_spender", "Big Spender", "Spend 10,000 coins", 200, "gold")
);
achievements.push(
  makeAchievement("super_collector", "Super Collector", "Own every plushie", 500, "diamond")
);

// --- Pad out to ~1000 ---
for (let i = 1; i <= 850; i++) {
  achievements.push(
    makeAchievement(
      `extra_${i}`,
      `Extra Challenge ${i}`,
      `Complete bonus challenge #${i}`,
      5,
      i % 4 === 0 ? "bronze" : i % 4 === 1 ? "silver" : i % 4 === 2 ? "gold" : "diamond"
    )
  );
}

// Write to file
fs.writeFileSync("app/_data/achievements.json", JSON.stringify(achievements, null, 2));
console.log(`✅ Generated ${achievements.length} achievements in app/_data/achievements.json`);
