import AsyncStorage from "@react-native-async-storage/async-storage";

const COINS = 500000;

const THEME_KEYS = [
  "theme:neon","theme:starry","theme:pink","theme:dark","theme:mint",
  "theme:glitter","theme:blackgold","theme:neonpurple","theme:silver",
  "theme_starry","theme:starry_night","starry_night","theme:star_theme",
  "theme:silver_frost","silver_frost",
  "theme:black_gold","black_gold","theme:neon_purple","neon_purple",
  "dark_theme","mint_theme","glitter_theme","neon_theme","pink_theme",
  "theme:emerald","theme:emerald-wave","theme:emeraldwave",
  "emerald_wave","emerald-wave","emeraldwave","theme_emerald",
  "theme:crimson","theme:crimson-dream","theme:crimsondream",
  "crimson_dream","crimson-dream","crimsondream","theme_crimson",
];

const CURSORS = ["cursor:glow","cursor:orb","cursor:star-trail"];

(async () => {
  try {
    await AsyncStorage.setItem("@nova/coins", String(COINS));
    const raw = (await AsyncStorage.getItem("@nova/purchases")) || "{}";
    const purchases = JSON.parse(raw || "{}") as Record<string, true>;
    THEME_KEYS.forEach(k => purchases[k] = true);
    CURSORS.forEach(k => purchases[k] = true);
    await AsyncStorage.setItem("@nova/purchases", JSON.stringify(purchases));
    await AsyncStorage.setItem("@nova/themeId", "theme:neon");
    await AsyncStorage.setItem("@nova/cursor", "cursor:orb");
    await AsyncStorage.setItem("@nova/dev_seeded", "1");
    console.log("✅ Dev seed applied: coins + all theme variants unlocked.");
  } catch (e) {
    console.log("seed_dev error:", e);
  }
})();
