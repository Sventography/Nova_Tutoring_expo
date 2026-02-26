// app/_lib/companionsCatalog.ts
import { ImageSourcePropType } from "react-native";
import { canonId } from "./canonId";

/**
 * Companion roles describe how many can be equipped together.
 * - "power"   → primary multipliers (only 1 active at a time)
 * - "support" → helpers like streak shields / timers (only 1 active)
 * - "cosmetic"→ visual-only buddies
 */
export type CompanionRole = "power" | "support" | "cosmetic";

/**
 * Ability types for companions.
 * These describe *what* the companion is meant to do.
 * Different parts of the app (quiz, streaks, achievements, etc.)
 * will hook into these types.
 */
export type CompanionAbilityType =
  | "achievement_reward_bonus" // Mecha Owl
  | "quiz_time_bonus" // Chrono Fox
  | "streak_milestone_bonus" // Celestra
  | "streak_shield" // Axolotl Oracle
  | "quiz_certificate_bonus" // Astral Nova (certs)
  | "brainteaser_bonus" // Astral Nova (brainteasers)
  | "global_coin_multiplier"; // Aetherwyrm

export type CompanionAbility = {
  type: CompanionAbilityType;

  /**
   * Flat bonus coins (e.g. +500 coins per certificate).
   * Used by Astral Nova for quiz certificates.
   */
  bonusCoinsFlat?: number;

  /**
   * Percent bonus (e.g. 0.10 = +10%).
   * Used by Mecha Owl, Celestra, Aetherwyrm, etc.
   */
  bonusPercent?: number;

  /**
   * Extra minutes for timers (e.g. +2 min for quiz).
   * Used by Chrono Fox.
   */
  extraMinutes?: number;

  /**
   * Cooldown in days for shield-like effects.
   * Used by Axolotl Oracle (once every 7 days).
   */
  cooldownDays?: number;

  /**
   * Optional short note for tooltips / UI later.
   */
  note?: string;
};

export type CompanionItem = {
  /** Full ID used everywhere, e.g. "companion:nova_bunny" */
  id: string;
  /** Canonical ID (normalized via canonId) */
  canonId: string;
  /** Full display title in cards / shop */
  title: string;
  /** Short label for strips / tight UI; falls back to title */
  shortLabel?: string;
  /** Optional description shown in cards */
  desc?: string;
  /** Static image for the companion */
  image: ImageSourcePropType;
  /** Category is always "companions" for now */
  category: "companions";
  /**
   * Coin price to unlock (per item).
   * For legendaries this will be 0 because they are cash-only.
   */
  coinPrice: number;
  /**
   * Optional USD price for cash-only microtransactions.
   * Used by legendary companions ($12.99).
   */
  priceUSD?: number;
  /** Optional ability; present for legendary companions */
  ability?: CompanionAbility;
  /** Role used for equip rules (power/support/cosmetic) */
  role: CompanionRole;
};

export const COMPANIONS: CompanionItem[] = [
  // =======================
  // ⭐ Legendary companions
  // =======================
  {
    id: "companion:mecha_owl",
    canonId: canonId("companion:mecha_owl"),
    title: "Mecha Owl",
    shortLabel: "Mecha Owl",
    desc: "Legendary companion that grants +10% to achievement rewards.",
    image: require("../assets/companions/mecha_owl.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "power",
    ability: {
      type: "achievement_reward_bonus",
      bonusPercent: 0.1,
      note: "+10% coins on achievement payouts",
    },
  },
  {
    id: "companion:chrono_fox",
    canonId: canonId("companion:chrono_fox"),
    title: "Chrono Fox",
    shortLabel: "Chrono Fox",
    desc: "Legendary companion that adds +2 minutes to all quiz timers.",
    image: require("../assets/companions/chrono_fox.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "support",
    ability: {
      type: "quiz_time_bonus",
      extraMinutes: 2,
      note: "+2 minutes on quiz timers",
    },
  },
  {
    id: "companion:celestra",
    canonId: canonId("companion:celestra"),
    title: "Celestra",
    shortLabel: "Celestra",
    desc: "Legendary companion that grants +25% coins from streak milestones.",
    image: require("../assets/companions/celestra.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "power",
    ability: {
      type: "streak_milestone_bonus",
      bonusPercent: 0.25,
      note: "+25% coins on streak milestone rewards",
    },
  },
  {
    id: "companion:axolotl_oracle",
    canonId: canonId("companion:axolotl_oracle"),
    title: "Axolotl Oracle",
    shortLabel: "Axolotl Oracle",
    desc: "Legendary companion that prevents daily streak loss once every 7 days.",
    image: require("../assets/companions/axolotl_oracle.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "support",
    ability: {
      type: "streak_shield",
      cooldownDays: 7,
      note: "Prevents one streak loss every 7 days (auto-activates if you miss a day)",
    },
  },
  {
    id: "companion:astral_nova",
    canonId: canonId("companion:astral_nova"),
    title: "Astral Nova",
    shortLabel: "Astral Nova",
    desc: "Legendary companion that grants +500 coins for certificates and boosts brainteaser rewards.",
    image: require("../assets/companions/astral_nova.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "power",
    ability: {
      type: "quiz_certificate_bonus",
      bonusCoinsFlat: 500,
      note: "+500 bonus coins whenever a certificate is earned (plus extra brainteaser rewards)",
    },
  },
  {
    id: "companion:aetherwyrm",
    canonId: canonId("companion:aetherwyrm"),
    title: "Aetherwyrm",
    shortLabel: "Aetherwyrm",
    desc: "A LEGENDARY companion that boosts coin rewards from all sources by +20%.",
    image: require("../assets/companions/aetherwyrm.png"),
    category: "companions",
    coinPrice: 0, // cash-only
    priceUSD: 12.99,
    role: "power",
    ability: {
      type: "global_coin_multiplier",
      bonusPercent: 0.2,
      note: "+20% coins from all reward sources",
    },
  },

  // =======================
  // 🌱 Common companions
  // =======================
  {
    id: "companion:nova_bunny",
    canonId: canonId("companion:nova_bunny"),
    title: "Nova Bunny",
    shortLabel: "Bunny",
    desc: "A bouncy little Nova bunny that hops alongside your studies.",
    image: require("../assets/companions/nova_bunny_coin.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:balloons",
    canonId: canonId("companion:balloons"),
    title: "Celebration Balloons",
    shortLabel: "Balloons",
    desc: "Confetti balloons that float around when you crush your goals.",
    image: require("../assets/companions/balloons.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:hearts",
    canonId: canonId("companion:hearts"),
    title: "Heart Drift",
    shortLabel: "Hearts",
    desc: "Soft hearts drifting by to remind you you’re loved.",
    image: require("../assets/companions/hearts.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:sleepy_moon",
    canonId: canonId("companion:sleepy_moon"),
    title: "Sleepy Moon",
    shortLabel: "Sleepy Moon",
    desc: "A cozy little moon that watches over late-night sessions.",
    image: require("../assets/companions/sleepy_moon.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:star_blow",
    canonId: canonId("companion:star_blow"),
    title: "Star Blow",
    shortLabel: "Star Blow",
    desc: "Stars that puff out like glitter whenever you tap them.",
    image: require("../assets/companions/star_blow.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:star_explode",
    canonId: canonId("companion:star_explode"),
    title: "Star Burst",
    shortLabel: "Star Burst",
    desc: "A bursting star companion that pops with energy.",
    image: require("../assets/companions/star_explode.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:star_throw",
    canonId: canonId("companion:star_throw"),
    title: "Star Toss",
    shortLabel: "Star Toss",
    desc: "Tossed stars that streak by when you poke them.",
    image: require("../assets/companions/star_throw.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:party_3d",
    canonId: canonId("companion:party_3d"),
    title: "Party Nova",
    shortLabel: "Party",
    desc: "3D party vibes swirling around your screen.",
    image: require("../assets/companions/3d_party.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:party_3d_2",
    canonId: canonId("companion:party_3d_2"),
    title: "Party Nova 2",
    shortLabel: "Party 2",
    desc: "Another party variant for extra hype.",
    image: require("../assets/companions/3d_party2.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:coins_rain",
    canonId: canonId("companion:coins_rain"),
    title: "Coin Shower",
    shortLabel: "Coins",
    desc: "A shiny coin rain that shows up when you tap.",
    image: require("../assets/companions/coins.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
  {
    id: "companion:reading_buddy",
    canonId: canonId("companion:reading_buddy"),
    title: "Reading Buddy",
    shortLabel: "Reader",
    desc: "A calm little reading companion cheering on your study flow.",
    image: require("../assets/companions/read.png"),
    category: "companions",
    coinPrice: 1000,
    role: "cosmetic",
  },
];