import json
import os

def make_achievement(id, title, desc, reward, tier):
    return {
        "id": id,
        "title": title,
        "desc": desc,
        "reward": reward,
        "tier": tier
    }

achievements = []

# --- Quiz milestones ---
for n in [10, 20, 50, 100, 250, 500, 1000]:
    tier = "bronze" if n < 50 else "silver" if n < 250 else "gold" if n < 500 else "diamond"
    achievements.append(make_achievement(f"quiz_{n}", f"Quiz {n}", f"Answer {n} quiz questions", n // 2, tier))

# --- Ask tab milestones ---
for n in [10, 20, 50, 100, 250, 500, 1000]:
    tier = "bronze" if n < 50 else "silver" if n < 250 else "gold" if n < 500 else "diamond"
    achievements.append(make_achievement(f"ask_{n}", f"Asked {n}", f"Ask {n} questions", n // 2, tier))

# --- Voice milestones ---
for n in [1, 10, 25, 50, 100, 250, 500]:
    tier = "bronze" if n < 25 else "silver" if n < 100 else "gold" if n < 250 else "diamond"
    achievements.append(make_achievement(f"voice_{n}", f"Voice {n}", f"Ask {n} voice questions", n * 3, tier))

# --- Certificates ---
for n in [1, 5, 10, 20, 50, 100]:
    tier = "bronze" if n < 10 else "silver" if n < 20 else "gold" if n < 50 else "diamond"
    achievements.append(make_achievement(f"cert_{n}", f"Certificate {n}", f"Earn {n} certificates", n * 50, tier))

# --- Collections ---
for n in [1, 10, 50, 100, 250, 500]:
    tier = "bronze" if n < 50 else "silver" if n < 250 else "gold" if n < 500 else "diamond"
    achievements.append(make_achievement(f"collect_{n}", f"Collector {n}", f"Save {n} flashcards", n * 2, tier))

# --- Shop purchases ---
for n in [1, 5, 10, 20, 50, 100]:
    tier = "bronze" if n < 10 else "silver" if n < 20 else "gold" if n < 50 else "diamond"
    achievements.append(make_achievement(f"shop_{n}", f"Shopper {n}", f"Buy {n} items", n * 10, tier))

# --- Daily streaks ---
for n in [1, 3, 7, 14, 30, 100, 365]:
    tier = "bronze" if n < 14 else "silver" if n < 100 else "gold" if n < 365 else "diamond"
    achievements.append(make_achievement(f"streak_{n}", f"Streak {n}", f"Maintain a {n}-day streak", n * 5, tier))

# --- Hidden / fun extras ---
achievements.append(make_achievement("night_owl", "Night Owl", "Use the app at 3 AM", 50, "silver"))
achievements.append(make_achievement("big_spender", "Big Spender", "Spend 10,000 coins", 200, "gold"))
achievements.append(make_achievement("super_collector", "Super Collector", "Own every plushie", 500, "diamond"))

# --- Pad out to ~1000 ---
for i in range(1, 850 + 1):
    tier = "bronze" if i % 4 == 0 else "silver" if i % 4 == 1 else "gold" if i % 4 == 2 else "diamond"
    achievements.append(make_achievement(f"extra_{i}", f"Extra Challenge {i}", f"Complete bonus challenge #{i}", 5, tier))

# Ensure output folder exists
os.makedirs("app/_data", exist_ok=True)

# Write file
with open("app/_data/achievements.json", "w") as f:
    json.dump(achievements, f, indent=2)

print(f"✅ Generated {len(achievements)} achievements in app/_data/achievements.json")
