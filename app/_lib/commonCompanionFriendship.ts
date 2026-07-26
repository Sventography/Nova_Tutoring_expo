// app/_lib/commonCompanionFriendship.ts
import { canonId } from "./canonId";

/**
 * This file is the single source of truth for friendship progression
 * belonging to Nova's regular cosmetic companions.
 *
 * Legendary companions are intentionally excluded. Their catalog roles are
 * "power" or "support", while every companion defined here is "cosmetic".
 */

export type CommonCompanionId =
  | "companion:nova_bunny"
  | "companion:balloons"
  | "companion:hearts"
  | "companion:sleepy_moon"
  | "companion:star_blow"
  | "companion:star_explode"
  | "companion:star_throw"
  | "companion:party_3d"
  | "companion:party_3d_2"
  | "companion:coins_rain"
  | "companion:reading_buddy";

export type FriendshipLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type FriendshipStageName =
  | "New Friend"
  | "Familiar"
  | "Playmate"
  | "Trusted"
  | "Best Friend"
  | "Bonded";

export type CompanionAnimationKey =
  | "gentle_bob"
  | "happy_bounce"
  | "big_hop"
  | "double_hop"
  | "ear_wiggle"
  | "paw_wave"
  | "float_up"
  | "balloon_sway"
  | "balloon_spin"
  | "heart_pulse"
  | "heart_twirl"
  | "heart_trail"
  | "sleepy_tilt"
  | "yawn"
  | "curl_up"
  | "star_breath"
  | "star_puff"
  | "star_gust"
  | "compress"
  | "shake"
  | "star_burst"
  | "star_arc"
  | "star_toss"
  | "target_toss"
  | "party_shimmy"
  | "party_spin"
  | "victory_dance"
  | "neon_dance"
  | "streamer_spin"
  | "light_show"
  | "coin_flip"
  | "coin_toss"
  | "coin_rain"
  | "book_nod"
  | "page_turn"
  | "reading_pose";

export type CompanionSpecialInteraction =
  | "double_tap"
  | "tap_sequence"
  | "hold_to_pet"
  | "activity_reaction";

export type CompanionActivityKey =
  | "ask"
  | "quiz"
  | "brainteasers"
  | "flashcards"
  | "collections"
  | "achievements"
  | "shop_purchase"
  | "coins_earned"
  | "relax"
  | "island_level_up"
  | "daily_login";

export type CompanionDialogueSet = {
  tap: string[];
  pet: string[];
  idle: string[];
  activity?: Partial<Record<CompanionActivityKey, string[]>>;
};

export type CompanionIslandKeepsake = {
  id: string;
  title: string;
  description: string;
  icon: string;
  preferredZone:
    | "grove"
    | "garden"
    | "library"
    | "waterfall"
    | "observatory"
    | "habitat"
    | "open_grass";
  requiresIslandUnlock?: string | null;
  fallbackZone?: CompanionIslandKeepsake["preferredZone"];
};

export type CompanionIslandResident = {
  id: string;
  title: string;
  description: string;
  preferredZone:
    | "grove"
    | "garden"
    | "library"
    | "waterfall"
    | "observatory"
    | "habitat"
    | "open_grass";
  requiresIslandUnlock?: string | null;
  fallbackZone?: CompanionIslandResident["preferredZone"];
  idleAnimation: CompanionAnimationKey;
  alternateAnimations: CompanionAnimationKey[];
  activityReaction?: Partial<
    Record<CompanionActivityKey, CompanionAnimationKey>
  >;
};

export type FriendshipLevelReward = {
  level: FriendshipLevel;
  stage: FriendshipStageName;
  requiredPoints: number;
  title: string;
  description: string;

  /**
   * Dialogue groups available once this level is reached.
   * Higher levels inherit all lower-level dialogue.
   */
  dialogue: Partial<CompanionDialogueSet>;

  /**
   * Animation keys available once this level is reached.
   * The live overlay maps these keys to actual React Native animations.
   */
  animations: CompanionAnimationKey[];

  /**
   * Unique icons/emoji emitted when the companion is tapped.
   * Petting always uses hearts instead.
   */
  tapBurstIcons: string[];

  /**
   * Optional interaction unlocked at this level.
   */
  specialInteraction?: {
    type: CompanionSpecialInteraction;
    title: string;
    description: string;
  };

  /**
   * Level 4 keepsake and Level 6 resident data.
   */
  islandKeepsake?: CompanionIslandKeepsake;
  islandResident?: CompanionIslandResident;
};

export type CommonCompanionFriendshipProfile = {
  id: CommonCompanionId;
  title: string;
  shortLabel: string;
  accent: string;
  friendshipEmoji: string;
  personality: string;
  levels: [
    FriendshipLevelReward,
    FriendshipLevelReward,
    FriendshipLevelReward,
    FriendshipLevelReward,
    FriendshipLevelReward,
    FriendshipLevelReward
  ];
};

export const FRIENDSHIP_LEVEL_THRESHOLDS: Record<
  FriendshipLevel,
  number
> = {
  1: 0,
  2: 8,
  3: 20,
  4: 40,
  5: 75,
  6: 120,
};

export const FRIENDSHIP_STAGE_NAMES: Record<
  FriendshipLevel,
  FriendshipStageName
> = {
  1: "New Friend",
  2: "Familiar",
  3: "Playmate",
  4: "Trusted",
  5: "Best Friend",
  6: "Bonded",
};

const level = (
  levelNumber: FriendshipLevel,
  config: Omit<
    FriendshipLevelReward,
    "level" | "stage" | "requiredPoints"
  >
): FriendshipLevelReward => ({
  level: levelNumber,
  stage: FRIENDSHIP_STAGE_NAMES[levelNumber],
  requiredPoints: FRIENDSHIP_LEVEL_THRESHOLDS[levelNumber],
  ...config,
});

export const COMMON_COMPANION_FRIENDSHIPS: Record<
  CommonCompanionId,
  CommonCompanionFriendshipProfile
> = {
  "companion:nova_bunny": {
    id: "companion:nova_bunny",
    title: "Nova Bunny",
    shortLabel: "Bunny",
    accent: "#67e8f9",
    friendshipEmoji: "🐰",
    personality:
      "Curious, bouncy, affectionate, and always ready for one more question.",
    levels: [
      level(1, {
        title: "First Hop",
        description:
          "Nova Bunny learns a basic hop and starts greeting you.",
        dialogue: {
          tap: [
            "Boing! What are we learning next?",
            "I found a study spark! ✨",
            "One more question? I’m ready!",
          ],
          pet: [
            "Ears officially scritched. 💜",
            "That was the perfect little pat!",
          ],
          idle: [
            "I’m keeping your study spot warm.",
            "Tiny hop break?",
          ],
        },
        animations: ["gentle_bob", "happy_bounce"],
        tapBurstIcons: ["✨", "⭐", "🐾"],
      }),
      level(2, {
        title: "Wiggly Ears",
        description:
          "Unlocks ear wiggles, paw prints, and new playful phrases.",
        dialogue: {
          tap: [
            "Did you see that ear wiggle?",
            "Paw-print progress detected!",
          ],
          pet: [
            "Okay… you may pet me again.",
            "My ears approve of you.",
          ],
          idle: [
            "Practicing my serious study face.",
            "My ears heard a good idea nearby.",
          ],
        },
        animations: ["ear_wiggle"],
        tapBurstIcons: ["🐾", "🐾", "✨", "🥕"],
      }),
      level(3, {
        title: "Double-Hop Hello",
        description:
          "Double-tap Nova Bunny for a special double hop and paw wave.",
        dialogue: {
          tap: [
            "Double-hop unlocked!",
            "Two hops means twice the encouragement.",
          ],
        },
        animations: ["double_hop", "paw_wave"],
        tapBurstIcons: ["🐾", "⭐", "🐾", "⭐"],
        specialInteraction: {
          type: "double_tap",
          title: "Double-Hop",
          description:
            "Double-tap to make Nova Bunny hop twice and wave.",
        },
      }),
      level(4, {
        title: "Trusted Burrow",
        description:
          "Unlocks a tiny flower-ringed burrow entrance on Nova Island.",
        dialogue: {
          idle: [
            "I’m planning the coziest little island burrow.",
            "Do you think the island needs more flowers?",
          ],
        },
        animations: ["big_hop"],
        tapBurstIcons: ["🌼", "🐾", "🌸"],
        islandKeepsake: {
          id: "bunny_burrow",
          title: "Bunny Burrow",
          description:
            "A tiny grass burrow surrounded by flowers and paw prints.",
          icon: "paw-outline",
          preferredZone: "grove",
          requiresIslandUnlock: "study_grove",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Study Sidekick",
        description:
          "Nova Bunny gains special reactions to quizzes and Ask Nova.",
        dialogue: {
          activity: {
            quiz: [
              "You finished the quiz! Victory hop!",
              "That score deserves two paws up!",
            ],
            ask: [
              "Good question! My ears perked right up.",
              "I love when we learn something new together.",
            ],
          },
          idle: [
            "Best-friend study patrol reporting in.",
            "I saved you a spot beside me.",
          ],
        },
        animations: ["paw_wave", "double_hop"],
        tapBurstIcons: ["🐾", "💫", "⭐", "🥕"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Study Sidekick",
          description:
            "Reacts when you finish quizzes or ask Nova a real question.",
        },
      }),
      level(6, {
        title: "Bonded Bunny",
        description:
          "Nova Bunny becomes a permanent resident of your island.",
        dialogue: {
          tap: [
            "Home is wherever your island is.",
            "Bonded buddies forever. 🐰💜",
          ],
          pet: [
            "That feels like home.",
            "Best friends get unlimited ear scratches.",
          ],
        },
        animations: ["big_hop", "ear_wiggle", "paw_wave"],
        tapBurstIcons: ["🐰", "🐾", "🌟", "🌼"],
        islandResident: {
          id: "resident_nova_bunny",
          title: "Nova Bunny Resident",
          description:
            "Hops through the grass and rests beside its flower-ringed burrow.",
          preferredZone: "grove",
          requiresIslandUnlock: "study_grove",
          fallbackZone: "open_grass",
          idleAnimation: "gentle_bob",
          alternateAnimations: [
            "happy_bounce",
            "ear_wiggle",
            "paw_wave",
          ],
          activityReaction: {
            quiz: "double_hop",
            ask: "paw_wave",
            island_level_up: "big_hop",
          },
        },
      }),
    ],
  },

  "companion:balloons": {
    id: "companion:balloons",
    title: "Celebration Balloons",
    shortLabel: "Balloons",
    accent: "#38bdf8",
    friendshipEmoji: "🎈",
    personality:
      "Optimistic, floaty, excitable, and always ready to lift the mood.",
    levels: [
      level(1, {
        title: "First Float",
        description:
          "The balloons sway gently and release a few colorful balloons.",
        dialogue: {
          tap: [
            "Up, up, and onward! 🎈",
            "Your progress is lifting us!",
          ],
          pet: [
            "Gentle! I’m full of celebration.",
            "Aww… friendship is lighter than air.",
          ],
          idle: [
            "I’m just floating through the syllabus.",
            "Waiting for the next celebration…",
          ],
        },
        animations: ["gentle_bob", "balloon_sway"],
        tapBurstIcons: ["🎈", "🎈", "✨"],
      }),
      level(2, {
        title: "Color Parade",
        description:
          "Unlocks a fuller balloon burst and a slow celebratory spin.",
        dialogue: {
          tap: [
            "Balloon parade incoming!",
            "Goals look smaller from up here.",
          ],
          idle: [
            "Choosing the perfect celebration colors.",
            "The sky has room for one more win.",
          ],
        },
        animations: ["balloon_spin"],
        tapBurstIcons: ["🎈", "🎈", "🎈", "🎉"],
      }),
      level(3, {
        title: "Lift-Off",
        description:
          "Double-tap to send the balloon cluster floating upward before it returns.",
        dialogue: {
          tap: [
            "Lift-off!",
            "We reached a new altitude!",
          ],
        },
        animations: ["float_up"],
        tapBurstIcons: ["🎈", "☁️", "✨"],
        specialInteraction: {
          type: "double_tap",
          title: "Lift-Off",
          description:
            "Double-tap to make the balloons rise and drift back down.",
        },
      }),
      level(4, {
        title: "Celebration Arch",
        description:
          "Unlocks a colorful balloon arch on Nova Island.",
        dialogue: {
          idle: [
            "I’m measuring the island for a balloon arch.",
            "Every island needs an entrance worth celebrating.",
          ],
        },
        animations: ["balloon_sway", "balloon_spin"],
        tapBurstIcons: ["🎈", "🎊", "🎈", "✨"],
        islandKeepsake: {
          id: "balloon_arch",
          title: "Celebration Arch",
          description:
            "A bright balloon arch marking a cheerful island path.",
          icon: "balloon-outline",
          preferredZone: "open_grass",
          fallbackZone: "grove",
        },
      }),
      level(5, {
        title: "Goal Lifter",
        description:
          "Celebrates achievements and island level-ups with larger balloon releases.",
        dialogue: {
          activity: {
            achievements: [
              "Achievement unlocked—release the balloons!",
              "That deserves the whole sky!",
            ],
            island_level_up: [
              "The island leveled up! Higher and higher!",
              "New level, new altitude!",
            ],
          },
        },
        animations: ["float_up", "balloon_spin"],
        tapBurstIcons: ["🎈", "🎉", "🎊", "✨"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Goal Lifter",
          description:
            "Reacts to achievements and Nova Island level-ups.",
        },
      }),
      level(6, {
        title: "Bonded Balloons",
        description:
          "The balloon cluster becomes a permanent island resident.",
        dialogue: {
          tap: [
            "Our friendship keeps me floating.",
            "I’ll always save a balloon for your next win.",
          ],
        },
        animations: ["balloon_sway", "float_up", "balloon_spin"],
        tapBurstIcons: ["🎈", "🌈", "🎊", "✨"],
        islandResident: {
          id: "resident_balloons",
          title: "Celebration Balloons Resident",
          description:
            "Floats beside the island path and rises whenever the island celebrates.",
          preferredZone: "open_grass",
          fallbackZone: "grove",
          idleAnimation: "balloon_sway",
          alternateAnimations: ["float_up", "balloon_spin"],
          activityReaction: {
            achievements: "float_up",
            island_level_up: "balloon_spin",
          },
        },
      }),
    ],
  },

  "companion:hearts": {
    id: "companion:hearts",
    title: "Heart Drift",
    shortLabel: "Hearts",
    accent: "#f472b6",
    friendshipEmoji: "💜",
    personality:
      "Gentle, reassuring, affectionate, and quietly encouraging.",
    levels: [
      level(1, {
        title: "Kind Spark",
        description:
          "Heart Drift pulses softly and sends a little encouragement.",
        dialogue: {
          tap: [
            "A little encouragement delivery! 💜",
            "You’re doing better than you think.",
          ],
          pet: [
            "That one goes straight to my heart.",
            "Friendship received. Sending it back!",
          ],
          idle: [
            "Just a reminder: you’ve got this.",
            "No pressure. One step at a time.",
          ],
        },
        animations: ["gentle_bob", "heart_pulse"],
        tapBurstIcons: ["💜", "🩷", "✨"],
      }),
      level(2, {
        title: "Heart Twirl",
        description:
          "Unlocks a gentle spin and a larger mix of colorful hearts.",
        dialogue: {
          tap: [
            "Heart twirl!",
            "Kindness looks good on you.",
          ],
          idle: [
            "I saved a little kindness for you.",
            "You don’t have to be perfect to make progress.",
          ],
        },
        animations: ["heart_twirl"],
        tapBurstIcons: ["💜", "🩷", "💙", "❤️"],
      }),
      level(3, {
        title: "Kindness Trail",
        description:
          "Double-tap to draw a curved trail of hearts across the screen.",
        dialogue: {
          tap: [
            "Follow the kindness trail!",
            "A little love for the road ahead.",
          ],
        },
        animations: ["heart_trail"],
        tapBurstIcons: ["💜", "🩵", "🩷", "✨"],
        specialInteraction: {
          type: "double_tap",
          title: "Kindness Trail",
          description:
            "Double-tap to release a curved trail of colorful hearts.",
        },
      }),
      level(4, {
        title: "Friendship Bench",
        description:
          "Unlocks a flower-covered friendship bench on Nova Island.",
        dialogue: {
          idle: [
            "I found the perfect place for a quiet bench.",
            "Everyone deserves somewhere gentle to rest.",
          ],
        },
        animations: ["heart_pulse", "heart_twirl"],
        tapBurstIcons: ["🌸", "💜", "🌷"],
        islandKeepsake: {
          id: "friendship_bench",
          title: "Friendship Bench",
          description:
            "A peaceful island bench surrounded by heart-shaped flowers.",
          icon: "heart-outline",
          preferredZone: "garden",
          requiresIslandUnlock: "starlight_garden",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Comfort Keeper",
        description:
          "Offers special encouragement after hard quizzes and during Relax sessions.",
        dialogue: {
          activity: {
            quiz: [
              "Whatever the score, I’m proud you finished.",
              "Effort counts. Let’s keep going gently.",
            ],
            relax: [
              "Breathe slowly. I’ll stay right here.",
              "Rest is part of learning too.",
            ],
          },
        },
        animations: ["heart_pulse", "heart_trail"],
        tapBurstIcons: ["💜", "🌸", "🩷", "✨"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Comfort Keeper",
          description:
            "Reacts supportively after quizzes and during Relax activities.",
        },
      }),
      level(6, {
        title: "Bonded Hearts",
        description:
          "Heart Drift becomes a permanent island resident near the garden.",
        dialogue: {
          tap: [
            "Our island has a heart now.",
            "Bonded by every little step we took together.",
          ],
        },
        animations: ["heart_pulse", "heart_twirl", "heart_trail"],
        tapBurstIcons: ["💜", "🩷", "🌸", "✨"],
        islandResident: {
          id: "resident_hearts",
          title: "Heart Drift Resident",
          description:
            "Floats around the garden and leaves gentle heart trails behind.",
          preferredZone: "garden",
          requiresIslandUnlock: "starlight_garden",
          fallbackZone: "open_grass",
          idleAnimation: "heart_pulse",
          alternateAnimations: ["heart_twirl", "heart_trail"],
          activityReaction: {
            relax: "heart_pulse",
            island_level_up: "heart_trail",
          },
        },
      }),
    ],
  },

  "companion:sleepy_moon": {
    id: "companion:sleepy_moon",
    title: "Sleepy Moon",
    shortLabel: "Sleepy Moon",
    accent: "#a78bfa",
    friendshipEmoji: "🌙",
    personality:
      "Cozy, drowsy, calm, and happiest during quiet late-night study sessions.",
    levels: [
      level(1, {
        title: "Tiny Yawn",
        description:
          "Sleepy Moon tilts, yawns, and releases a few sleepy stars.",
        dialogue: {
          tap: [
            "I’m awake… mostly. 🌙",
            "One tiny lesson before nap time?",
          ],
          pet: [
            "Mmm… cozy.",
            "That was very moon-approved.",
          ],
          idle: [
            "Studying quietly beside you…",
            "Wake me when there’s a hard question.",
          ],
        },
        animations: ["gentle_bob", "sleepy_tilt"],
        tapBurstIcons: ["🌙", "⭐", "Zzz"],
      }),
      level(2, {
        title: "Moon Yawn",
        description:
          "Unlocks a full yawn and a cloud of tiny moons and Zzz symbols.",
        dialogue: {
          tap: [
            "Yaaawn… still here!",
            "The stars say you can do it.",
          ],
          idle: [
            "A small break is allowed, you know.",
            "The night is quiet enough to think.",
          ],
        },
        animations: ["yawn"],
        tapBurstIcons: ["Zzz", "🌙", "✨", "☁️"],
      }),
      level(3, {
        title: "Cozy Curl",
        description:
          "Double-tap to make Sleepy Moon curl up briefly before waking.",
        dialogue: {
          tap: [
            "Just a microscopic nap.",
            "Wake-up sequence complete.",
          ],
        },
        animations: ["curl_up"],
        tapBurstIcons: ["🌙", "Zzz", "⭐"],
        specialInteraction: {
          type: "double_tap",
          title: "Cozy Curl",
          description:
            "Double-tap to let Sleepy Moon curl up for a tiny nap.",
        },
      }),
      level(4, {
        title: "Moonlit Hammock",
        description:
          "Unlocks a moonlit hammock and pillow on Nova Island.",
        dialogue: {
          idle: [
            "I found the perfect island nap spot.",
            "The hammock needs exactly three pillows.",
          ],
        },
        animations: ["sleepy_tilt", "curl_up"],
        tapBurstIcons: ["🌙", "☁️", "🛏️"],
        islandKeepsake: {
          id: "moonlit_hammock",
          title: "Moonlit Hammock",
          description:
            "A cozy hammock with a crescent pillow and tiny star blanket.",
          icon: "moon-outline",
          preferredZone: "grove",
          requiresIslandUnlock: "study_grove",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Rest Guardian",
        description:
          "Reacts to Relax sessions and late-night study activity.",
        dialogue: {
          activity: {
            relax: [
              "Excellent choice. Rest mode activated.",
              "I’ll keep watch while you breathe.",
            ],
            daily_login: [
              "You came back. The moon noticed.",
              "Another day, another gentle beginning.",
            ],
          },
        },
        animations: ["yawn", "sleepy_tilt"],
        tapBurstIcons: ["🌙", "Zzz", "💫", "☁️"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Rest Guardian",
          description:
            "Reacts to Relax sessions and your first visit of the day.",
        },
      }),
      level(6, {
        title: "Bonded Moon",
        description:
          "Sleepy Moon becomes a permanent resident of Nova Island.",
        dialogue: {
          tap: [
            "This island is my favorite dream.",
            "Best friends are allowed in the nap zone.",
          ],
        },
        animations: ["sleepy_tilt", "yawn", "curl_up"],
        tapBurstIcons: ["🌙", "⭐", "Zzz", "☁️"],
        islandResident: {
          id: "resident_sleepy_moon",
          title: "Sleepy Moon Resident",
          description:
            "Sleeps in its hammock and occasionally wakes to watch the stars.",
          preferredZone: "grove",
          requiresIslandUnlock: "study_grove",
          fallbackZone: "open_grass",
          idleAnimation: "curl_up",
          alternateAnimations: ["sleepy_tilt", "yawn"],
          activityReaction: {
            relax: "curl_up",
            daily_login: "sleepy_tilt",
          },
        },
      }),
    ],
  },

  "companion:star_blow": {
    id: "companion:star_blow",
    title: "Star Blow",
    shortLabel: "Star Blow",
    accent: "#f9a8d4",
    friendshipEmoji: "✨",
    personality:
      "Whimsical, breathy, sparkly, and obsessed with blowing wishes into the sky.",
    levels: [
      level(1, {
        title: "Tiny Puff",
        description:
          "Star Blow releases a small puff of glittering stars.",
        dialogue: {
          tap: [
            "Pfffft—stars everywhere! ✨",
            "I blew you a study wish.",
          ],
          pet: [
            "Careful, I’m ticklish!",
            "You shook loose another star.",
          ],
          idle: [
            "Practicing my star-puff technique.",
            "Quietly charging a sparkle…",
          ],
        },
        animations: ["gentle_bob", "star_breath"],
        tapBurstIcons: ["✨", "✦", "⋆"],
      }),
      level(2, {
        title: "Sparkle Puff",
        description:
          "Unlocks a stronger puff with more varied stars and glitter.",
        dialogue: {
          tap: [
            "Bigger breath, bigger sparkle!",
            "Catch that wish before it floats away.",
          ],
          idle: [
            "There is glitter in the homework now.",
            "I’m saving one especially bright star.",
          ],
        },
        animations: ["star_puff"],
        tapBurstIcons: ["✨", "✦", "⭐", "⋆", "💫"],
      }),
      level(3, {
        title: "Star Gust",
        description:
          "Double-tap to blow a wide gust of stars across the screen.",
        dialogue: {
          tap: [
            "Star gust incoming!",
            "Make a wish—quick!",
          ],
        },
        animations: ["star_gust"],
        tapBurstIcons: ["✦", "⋆", "⭐", "✨", "💫"],
        specialInteraction: {
          type: "double_tap",
          title: "Star Gust",
          description:
            "Double-tap to blow a wide stream of stars across the screen.",
        },
      }),
      level(4, {
        title: "Star Wind Chime",
        description:
          "Unlocks a sparkling wind chime on Nova Island.",
        dialogue: {
          idle: [
            "The island breeze needs something sparkly.",
            "I can already hear the star chime.",
          ],
        },
        animations: ["star_breath", "star_puff"],
        tapBurstIcons: ["🔔", "✨", "⭐"],
        islandKeepsake: {
          id: "star_wind_chime",
          title: "Star Wind Chime",
          description:
            "A silver wind chime with tiny glowing stars.",
          icon: "sparkles-outline",
          preferredZone: "observatory",
          requiresIslandUnlock: "sky_observatory",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Wish Maker",
        description:
          "Creates special star gusts after achievements and island level-ups.",
        dialogue: {
          activity: {
            achievements: [
              "Achievement wish granted!",
              "That win deserves the brightest star.",
            ],
            island_level_up: [
              "A new island level—blow the stars!",
              "The whole sky noticed that level-up.",
            ],
          },
        },
        animations: ["star_puff", "star_gust"],
        tapBurstIcons: ["🌟", "✨", "💫", "✦"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Wish Maker",
          description:
            "Reacts to achievements and Nova Island level-ups.",
        },
      }),
      level(6, {
        title: "Bonded Star Blower",
        description:
          "Star Blow becomes a permanent resident on the island edge.",
        dialogue: {
          tap: [
            "I’ll keep filling our sky with wishes.",
            "This island has the perfect breeze.",
          ],
        },
        animations: ["star_breath", "star_puff", "star_gust"],
        tapBurstIcons: ["🌟", "✦", "✨", "💫"],
        islandResident: {
          id: "resident_star_blow",
          title: "Star Blow Resident",
          description:
            "Sits near the island edge and blows glowing stars into the sky.",
          preferredZone: "observatory",
          requiresIslandUnlock: "sky_observatory",
          fallbackZone: "open_grass",
          idleAnimation: "star_breath",
          alternateAnimations: ["star_puff", "star_gust"],
          activityReaction: {
            achievements: "star_puff",
            island_level_up: "star_gust",
          },
        },
      }),
    ],
  },

  "companion:star_explode": {
    id: "companion:star_explode",
    title: "Star Burst",
    shortLabel: "Star Burst",
    accent: "#fbbf24",
    friendshipEmoji: "💥",
    personality:
      "Dramatic, energetic, excitable, and constantly trying not to explode.",
    levels: [
      level(1, {
        title: "Tiny Pop",
        description:
          "Star Burst compresses and releases a small harmless pop.",
        dialogue: {
          tap: [
            "KABOOM! Study energy! 💥",
            "A perfectly educational explosion.",
          ],
          pet: [
            "Soft pats prevent spontaneous combustion.",
            "Friendship blast contained!",
          ],
          idle: [
            "Trying very hard not to explode.",
            "Current status: dramatically stable.",
          ],
        },
        animations: ["gentle_bob", "compress"],
        tapBurstIcons: ["⭐", "💥", "✨"],
      }),
      level(2, {
        title: "Shaky Spark",
        description:
          "Unlocks an excited shake and a larger star burst.",
        dialogue: {
          tap: [
            "Shaky spark activated!",
            "Big spark for a big brain!",
          ],
          idle: [
            "Waiting for the next big idea…",
            "Pressure levels: adorably high.",
          ],
        },
        animations: ["shake", "star_burst"],
        tapBurstIcons: ["💥", "🌟", "⭐", "✨"],
      }),
      level(3, {
        title: "Controlled Explosion",
        description:
          "Double-tap to charge and release a larger controlled star explosion.",
        dialogue: {
          tap: [
            "Controlled explosion successful!",
            "Maximum drama, zero damage.",
          ],
        },
        animations: ["compress", "shake", "star_burst"],
        tapBurstIcons: ["💥", "🌟", "✦", "⭐"],
        specialInteraction: {
          type: "double_tap",
          title: "Controlled Explosion",
          description:
            "Double-tap to charge and release a larger harmless star burst.",
        },
      }),
      level(4, {
        title: "Crystal Cluster",
        description:
          "Unlocks a glowing burst-shaped crystal cluster on Nova Island.",
        dialogue: {
          idle: [
            "The island could use a dramatic crystal.",
            "I promise the crystal only looks explosive.",
          ],
        },
        animations: ["compress", "star_burst"],
        tapBurstIcons: ["💎", "💥", "✨"],
        islandKeepsake: {
          id: "burst_crystal_cluster",
          title: "Burst Crystal Cluster",
          description:
            "A glowing star-shaped crystal formation pulsing with safe energy.",
          icon: "diamond-outline",
          preferredZone: "waterfall",
          requiresIslandUnlock: "learning_falls",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Victory Burst",
        description:
          "Celebrates quiz completions and achievements with special explosions.",
        dialogue: {
          activity: {
            quiz: [
              "Quiz complete—VICTORY BURST!",
              "You finished it! Detonation of pride!",
            ],
            achievements: [
              "Achievement detected. Commencing sparkle blast!",
              "That badge deserves maximum drama.",
            ],
          },
        },
        animations: ["shake", "star_burst"],
        tapBurstIcons: ["💥", "🏆", "🌟", "✨"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Victory Burst",
          description:
            "Reacts dramatically to quizzes and achievements.",
        },
      }),
      level(6, {
        title: "Bonded Star Burst",
        description:
          "Star Burst becomes a permanent island resident near its crystals.",
        dialogue: {
          tap: [
            "Our friendship is explosively stable.",
            "I found my forever blast zone.",
          ],
        },
        animations: ["compress", "shake", "star_burst"],
        tapBurstIcons: ["💥", "💎", "🌟", "✨"],
        islandResident: {
          id: "resident_star_explode",
          title: "Star Burst Resident",
          description:
            "Guards its crystal cluster and occasionally lights the island with a harmless burst.",
          preferredZone: "waterfall",
          requiresIslandUnlock: "learning_falls",
          fallbackZone: "open_grass",
          idleAnimation: "compress",
          alternateAnimations: ["shake", "star_burst"],
          activityReaction: {
            quiz: "star_burst",
            achievements: "star_burst",
            island_level_up: "shake",
          },
        },
      }),
    ],
  },

  "companion:star_throw": {
    id: "companion:star_throw",
    title: "Star Toss",
    shortLabel: "Star Toss",
    accent: "#60a5fa",
    friendshipEmoji: "⭐",
    personality:
      "Sporty, focused, playful, and always practicing the next trick shot.",
    levels: [
      level(1, {
        title: "First Toss",
        description:
          "Star Toss throws a single star in a short arc.",
        dialogue: {
          tap: [
            "Catch! ⭐",
            "Fastball of knowledge!",
          ],
          pet: [
            "Nice catch—and nice pat.",
            "My throwing arm feels appreciated.",
          ],
          idle: [
            "Aiming at the next goal.",
            "Practicing trick shots quietly.",
          ],
        },
        animations: ["gentle_bob", "star_arc"],
        tapBurstIcons: ["⭐", "💫"],
      }),
      level(2, {
        title: "Trick Throw",
        description:
          "Unlocks curved star throws and a wider mix of projectiles.",
        dialogue: {
          tap: [
            "Curve star!",
            "I tossed you a lucky one.",
          ],
          idle: [
            "Calculating the perfect arc.",
            "Ready when you are, coach.",
          ],
        },
        animations: ["star_toss"],
        tapBurstIcons: ["⭐", "🌟", "💫", "🎯"],
      }),
      level(3, {
        title: "Target Toss",
        description:
          "Double-tap to throw stars toward a temporary target.",
        dialogue: {
          tap: [
            "Bullseye!",
            "Target practice complete.",
          ],
        },
        animations: ["target_toss"],
        tapBurstIcons: ["⭐", "🎯", "🌟"],
        specialInteraction: {
          type: "double_tap",
          title: "Target Toss",
          description:
            "Double-tap to create a tiny target and throw a star toward it.",
        },
      }),
      level(4, {
        title: "Star Target",
        description:
          "Unlocks a glowing star-toss target on Nova Island.",
        dialogue: {
          idle: [
            "The island needs a proper practice target.",
            "I’m designing the championship toss course.",
          ],
        },
        animations: ["star_arc", "star_toss"],
        tapBurstIcons: ["🎯", "⭐", "✨"],
        islandKeepsake: {
          id: "star_toss_target",
          title: "Star Toss Target",
          description:
            "A glowing target ring for practicing safe star throws.",
          icon: "radio-button-on-outline",
          preferredZone: "open_grass",
          fallbackZone: "grove",
        },
      }),
      level(5, {
        title: "Goal Striker",
        description:
          "Performs trick throws after quizzes and brainteasers.",
        dialogue: {
          activity: {
            quiz: [
              "Quiz goal hit—bullseye!",
              "That finish landed perfectly.",
            ],
            brainteasers: [
              "Riddle solved. Direct hit!",
              "Sharp thinking, sharp aim.",
            ],
          },
        },
        animations: ["star_toss", "target_toss"],
        tapBurstIcons: ["🎯", "⭐", "💫", "🏆"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Goal Striker",
          description:
            "Reacts to completed quizzes and solved brainteasers.",
        },
      }),
      level(6, {
        title: "Bonded Star Tosser",
        description:
          "Star Toss becomes a permanent island resident at its practice range.",
        dialogue: {
          tap: [
            "Best teammates forever.",
            "Our island practice range is officially open.",
          ],
        },
        animations: ["star_arc", "star_toss", "target_toss"],
        tapBurstIcons: ["🎯", "🌟", "⭐", "💫"],
        islandResident: {
          id: "resident_star_throw",
          title: "Star Toss Resident",
          description:
            "Practices glowing trick shots at its island target.",
          preferredZone: "open_grass",
          fallbackZone: "grove",
          idleAnimation: "star_arc",
          alternateAnimations: ["star_toss", "target_toss"],
          activityReaction: {
            quiz: "target_toss",
            brainteasers: "star_toss",
          },
        },
      }),
    ],
  },

  "companion:party_3d": {
    id: "companion:party_3d",
    title: "Party Nova",
    shortLabel: "Party",
    accent: "#fb7185",
    friendshipEmoji: "🎉",
    personality:
      "Cheerful, rhythmic, confetti-powered, and ready to celebrate every win.",
    levels: [
      level(1, {
        title: "Tiny Celebration",
        description:
          "Party Nova shimmies and releases a small confetti burst.",
        dialogue: {
          tap: [
            "That deserves confetti! 🎉",
            "Party mode: educational edition!",
          ],
          pet: [
            "Best party guest ever.",
            "You just unlocked the friendship dance!",
          ],
          idle: [
            "Saving the confetti for your next win.",
            "The party is respectfully on standby.",
          ],
        },
        animations: ["gentle_bob", "party_shimmy"],
        tapBurstIcons: ["🎉", "🎊", "✨"],
      }),
      level(2, {
        title: "Party Spin",
        description:
          "Unlocks a full spin and a denser confetti burst.",
        dialogue: {
          tap: [
            "Spin the celebration!",
            "Tiny dance break!",
          ],
          idle: [
            "Quietly rehearsing a victory dance.",
            "Confetti count looks excellent.",
          ],
        },
        animations: ["party_spin"],
        tapBurstIcons: ["🎉", "🎊", "🥳", "✨"],
      }),
      level(3, {
        title: "Victory Dance",
        description:
          "Double-tap to perform a longer victory dance.",
        dialogue: {
          tap: [
            "Victory dance unlocked!",
            "This move is called Academic Excellence.",
          ],
        },
        animations: ["victory_dance"],
        tapBurstIcons: ["🎉", "🎊", "🥳", "💫"],
        specialInteraction: {
          type: "double_tap",
          title: "Victory Dance",
          description:
            "Double-tap to perform a longer confetti-powered dance.",
        },
      }),
      level(4, {
        title: "Celebration Platform",
        description:
          "Unlocks a tiny decorated stage on Nova Island.",
        dialogue: {
          idle: [
            "The island needs a proper dance floor.",
            "I’m planning the grand opening performance.",
          ],
        },
        animations: ["party_shimmy", "party_spin"],
        tapBurstIcons: ["🎉", "🎊", "🎪"],
        islandKeepsake: {
          id: "party_platform",
          title: "Celebration Platform",
          description:
            "A tiny stage with flags, confetti cannons, and glowing trim.",
          icon: "musical-notes-outline",
          preferredZone: "open_grass",
          fallbackZone: "grove",
        },
      }),
      level(5, {
        title: "Achievement Dancer",
        description:
          "Performs special dances for achievements and island level-ups.",
        dialogue: {
          activity: {
            achievements: [
              "Achievement unlocked—hit the music!",
              "Badge acquired! Dance floor, now!",
            ],
            island_level_up: [
              "Island level-up party!",
              "New level, new dance!",
            ],
          },
        },
        animations: ["victory_dance", "party_spin"],
        tapBurstIcons: ["🏆", "🎉", "🎊", "🥳"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Achievement Dancer",
          description:
            "Reacts to achievements and Nova Island level-ups.",
        },
      }),
      level(6, {
        title: "Bonded Party Nova",
        description:
          "Party Nova becomes a permanent resident of the celebration platform.",
        dialogue: {
          tap: [
            "The island party never ends now.",
            "Best friends get front-row seats!",
          ],
        },
        animations: ["party_shimmy", "party_spin", "victory_dance"],
        tapBurstIcons: ["🎉", "🎊", "🥳", "🏆"],
        islandResident: {
          id: "resident_party_3d",
          title: "Party Nova Resident",
          description:
            "Performs little victory dances on its island celebration platform.",
          preferredZone: "open_grass",
          fallbackZone: "grove",
          idleAnimation: "party_shimmy",
          alternateAnimations: ["party_spin", "victory_dance"],
          activityReaction: {
            achievements: "victory_dance",
            island_level_up: "party_spin",
          },
        },
      }),
    ],
  },

  "companion:party_3d_2": {
    id: "companion:party_3d_2",
    title: "Party Nova 2",
    shortLabel: "Party 2",
    accent: "#c084fc",
    friendshipEmoji: "🎊",
    personality:
      "A neon encore performer with streamers, light effects, and bigger theatrical energy.",
    levels: [
      level(1, {
        title: "Neon Hello",
        description:
          "Party Nova 2 performs a neon shimmy and releases streamers.",
        dialogue: {
          tap: [
            "Encore party mode! 🎊",
            "Round two of celebration!",
          ],
          pet: [
            "VIP friendship confirmed.",
            "That pat deserves an encore.",
          ],
          idle: [
            "Preparing the sequel celebration.",
            "Streamers are fully stocked.",
          ],
        },
        animations: ["gentle_bob", "neon_dance"],
        tapBurstIcons: ["🎊", "🟣", "🔷", "✨"],
      }),
      level(2, {
        title: "Streamer Spin",
        description:
          "Unlocks a distinct streamer spin and neon geometric burst.",
        dialogue: {
          tap: [
            "Streamer spin!",
            "Extra hype has arrived!",
          ],
          idle: [
            "Testing the neon lights quietly.",
            "Every encore needs better effects.",
          ],
        },
        animations: ["streamer_spin"],
        tapBurstIcons: ["🎊", "🔷", "🔶", "🟣"],
      }),
      level(3, {
        title: "Mini Light Show",
        description:
          "Double-tap to trigger a short neon light show.",
        dialogue: {
          tap: [
            "Lights up!",
            "Welcome to the tiny encore show.",
          ],
        },
        animations: ["light_show"],
        tapBurstIcons: ["🔷", "🔶", "🟣", "✨"],
        specialInteraction: {
          type: "double_tap",
          title: "Mini Light Show",
          description:
            "Double-tap to trigger neon shapes, streamers, and a short light show.",
        },
      }),
      level(4, {
        title: "Neon Party Lantern",
        description:
          "Unlocks a glowing party lantern on Nova Island.",
        dialogue: {
          idle: [
            "The island needs a dramatic neon lantern.",
            "I have selected seventeen possible light patterns.",
          ],
        },
        animations: ["neon_dance", "streamer_spin"],
        tapBurstIcons: ["🏮", "🟣", "🔷"],
        islandKeepsake: {
          id: "neon_party_lantern",
          title: "Neon Party Lantern",
          description:
            "A glowing lantern that cycles through colorful geometric patterns.",
          icon: "flashlight-outline",
          preferredZone: "observatory",
          requiresIslandUnlock: "sky_observatory",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Encore Performer",
        description:
          "Triggers neon light shows after achievements and purchases.",
        dialogue: {
          activity: {
            achievements: [
              "Achievement encore—lights!",
              "That badge deserves the deluxe show.",
            ],
            shop_purchase: [
              "New unlock! Cue the neon reveal!",
              "Purchase complete—encore effects online!",
            ],
          },
        },
        animations: ["light_show", "streamer_spin"],
        tapBurstIcons: ["🏆", "🔷", "🔶", "🎊"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Encore Performer",
          description:
            "Reacts to achievements and completed Shop purchases.",
        },
      }),
      level(6, {
        title: "Bonded Party Nova 2",
        description:
          "Party Nova 2 becomes a permanent neon island performer.",
        dialogue: {
          tap: [
            "The encore has a permanent home now.",
            "Bonded VIP status: lifetime access.",
          ],
        },
        animations: ["neon_dance", "streamer_spin", "light_show"],
        tapBurstIcons: ["🎊", "🔷", "🔶", "🟣"],
        islandResident: {
          id: "resident_party_3d_2",
          title: "Party Nova 2 Resident",
          description:
            "Performs neon dances beside its lantern and projects tiny light patterns.",
          preferredZone: "observatory",
          requiresIslandUnlock: "sky_observatory",
          fallbackZone: "open_grass",
          idleAnimation: "neon_dance",
          alternateAnimations: ["streamer_spin", "light_show"],
          activityReaction: {
            achievements: "light_show",
            shop_purchase: "streamer_spin",
          },
        },
      }),
    ],
  },

  "companion:coins_rain": {
    id: "companion:coins_rain",
    title: "Coin Shower",
    shortLabel: "Coins",
    accent: "#facc15",
    friendshipEmoji: "🪙",
    personality:
      "Shiny, playful, optimistic, and convinced every little victory has value.",
    levels: [
      level(1, {
        title: "Lucky Coin",
        description:
          "Coin Shower flips a few coins and celebrates small progress.",
        dialogue: {
          tap: [
            "Shiny progress! 🪙",
            "Cha-ching—but make it learning.",
          ],
          pet: [
            "Friendship is the real treasure.",
            "That pat was worth more than gold.",
          ],
          idle: [
            "Counting your little victories.",
            "Progress adds up, even slowly.",
          ],
        },
        animations: ["gentle_bob", "coin_flip"],
        tapBurstIcons: ["🪙", "✨", "🪙"],
      }),
      level(2, {
        title: "Coin Toss",
        description:
          "Unlocks higher coin tosses and a brighter shower.",
        dialogue: {
          tap: [
            "Heads: you’re doing great. Tails: also great.",
            "Lucky toss!",
          ],
          idle: [
            "Polishing the motivation coins.",
            "Every effort goes in the treasure pile.",
          ],
        },
        animations: ["coin_toss"],
        tapBurstIcons: ["🪙", "💰", "✨", "🪙"],
      }),
      level(3, {
        title: "Lucky Shower",
        description:
          "Double-tap to launch coins upward and rain them back down.",
        dialogue: {
          tap: [
            "Lucky shower!",
            "Make it rain… responsibly!",
          ],
        },
        animations: ["coin_rain"],
        tapBurstIcons: ["🪙", "💰", "✨", "🪙"],
        specialInteraction: {
          type: "double_tap",
          title: "Lucky Shower",
          description:
            "Double-tap to toss coins up and let them rain back down.",
        },
      }),
      level(4, {
        title: "Wishing Well",
        description:
          "Unlocks a tiny wishing well on Nova Island.",
        dialogue: {
          idle: [
            "I found the perfect place for an island wishing well.",
            "The well accepts hopes, dreams, and shiny coins.",
          ],
        },
        animations: ["coin_flip", "coin_toss"],
        tapBurstIcons: ["🪙", "⛲", "✨"],
        islandKeepsake: {
          id: "coin_wishing_well",
          title: "Coin Wishing Well",
          description:
            "A tiny stone well with glowing water and a pile of lucky coins.",
          icon: "water-outline",
          preferredZone: "waterfall",
          requiresIslandUnlock: "learning_falls",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Reward Counter",
        description:
          "Celebrates earned coins and completed Shop purchases.",
        dialogue: {
          activity: {
            coins_earned: [
              "Coins earned! I counted every one.",
              "Your effort just became something shiny!",
            ],
            shop_purchase: [
              "New treasure unlocked!",
              "Excellent choice—officially added to the collection.",
            ],
          },
        },
        animations: ["coin_toss", "coin_rain"],
        tapBurstIcons: ["🪙", "💰", "🎁", "✨"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Reward Counter",
          description:
            "Reacts when you earn coins or complete a Shop purchase.",
        },
      }),
      level(6, {
        title: "Bonded Coin Keeper",
        description:
          "Coin Shower becomes a permanent resident beside its wishing well.",
        dialogue: {
          tap: [
            "Our friendship is the island’s best treasure.",
            "I saved the shiniest coin for our well.",
          ],
        },
        animations: ["coin_flip", "coin_toss", "coin_rain"],
        tapBurstIcons: ["🪙", "⛲", "💰", "✨"],
        islandResident: {
          id: "resident_coins_rain",
          title: "Coin Shower Resident",
          description:
            "Lives beside the wishing well and occasionally tosses in a glowing coin.",
          preferredZone: "waterfall",
          requiresIslandUnlock: "learning_falls",
          fallbackZone: "open_grass",
          idleAnimation: "coin_flip",
          alternateAnimations: ["coin_toss", "coin_rain"],
          activityReaction: {
            coins_earned: "coin_rain",
            shop_purchase: "coin_toss",
          },
        },
      }),
    ],
  },

  "companion:reading_buddy": {
    id: "companion:reading_buddy",
    title: "Reading Buddy",
    shortLabel: "Reader",
    accent: "#34d399",
    friendshipEmoji: "📚",
    personality:
      "Calm, thoughtful, bookish, and happiest while quietly studying beside you.",
    levels: [
      level(1, {
        title: "Study Hello",
        description:
          "Reading Buddy nods, opens its book, and starts talking about studying.",
        dialogue: {
          tap: [
            "One more page? 📚",
            "I bookmarked our study spot.",
          ],
          pet: [
            "A quiet little thank-you.",
            "Best study partner behavior detected.",
          ],
          idle: [
            "Reading beside you counts as company.",
            "I’ll hold our place.",
          ],
        },
        animations: ["gentle_bob", "book_nod"],
        tapBurstIcons: ["📖", "📘", "✨"],
      }),
      level(2, {
        title: "Page Flutter",
        description:
          "Unlocks page-turn animations and a burst of tiny books and pages.",
        dialogue: {
          tap: [
            "Page turn!",
            "Tell me what chapter we’re on.",
          ],
          idle: [
            "No rush. Good learning takes time.",
            "I found a very interesting paragraph.",
          ],
        },
        animations: ["page_turn"],
        tapBurstIcons: ["📖", "📄", "📚", "✨"],
      }),
      level(3, {
        title: "Reading Moment",
        description:
          "Double-tap to make Reading Buddy sit, open its book, and share a study thought.",
        dialogue: {
          tap: [
            "Tiny study thought: understanding beats memorizing.",
            "A good question is worth more than a rushed answer.",
            "Small pages still finish big books.",
          ],
        },
        animations: ["reading_pose", "page_turn"],
        tapBurstIcons: ["📖", "💡", "📄"],
        specialInteraction: {
          type: "double_tap",
          title: "Reading Moment",
          description:
            "Double-tap to open the book and receive a short study thought.",
        },
      }),
      level(4, {
        title: "Cozy Reading Spot",
        description:
          "Unlocks a book pile, blanket, and reading lamp on Nova Island.",
        dialogue: {
          idle: [
            "I’m arranging the island reading nook.",
            "The blanket goes under the tree—eventually.",
          ],
        },
        animations: ["reading_pose", "page_turn"],
        tapBurstIcons: ["📚", "🛋️", "💡"],
        islandKeepsake: {
          id: "reading_nook",
          title: "Cozy Reading Spot",
          description:
            "A blanket, stack of books, and tiny lamp waiting beneath the island sky.",
          icon: "library-outline",
          preferredZone: "library",
          requiresIslandUnlock: "nova_library",
          fallbackZone: "open_grass",
        },
      }),
      level(5, {
        title: "Study Librarian",
        description:
          "Reacts when you use Flashcards, Collections, or finish Ask Nova lessons.",
        dialogue: {
          activity: {
            flashcards: [
              "Flashcards ready. I’ll keep the difficult ones open.",
              "Another card learned—excellent.",
            ],
            collections: [
              "Your collection is becoming a real library.",
              "I found the perfect shelf for that.",
            ],
            ask: [
              "That question belongs in the good-question section.",
              "New lesson bookmarked.",
            ],
          },
        },
        animations: ["book_nod", "page_turn", "reading_pose"],
        tapBurstIcons: ["📚", "📖", "💡", "✨"],
        specialInteraction: {
          type: "activity_reaction",
          title: "Study Librarian",
          description:
            "Reacts to Flashcards, Collections, and Ask Nova lessons.",
        },
      }),
      level(6, {
        title: "Bonded Reading Buddy",
        description:
          "Reading Buddy becomes a permanent island resident, reading on the grass or beneath an unlocked tree.",
        dialogue: {
          tap: [
            "We built a whole reading world together.",
            "I’ll always save your place.",
          ],
          pet: [
            "Best friends make the best reading partners.",
            "Quiet company is still company.",
          ],
        },
        animations: ["book_nod", "page_turn", "reading_pose"],
        tapBurstIcons: ["📚", "📖", "💡", "✨"],
        islandResident: {
          id: "resident_reading_buddy",
          title: "Reading Buddy Resident",
          description:
            "Sits on the grass reading a book. When the Study Grove tree is available, it settles beneath the tree.",
          preferredZone: "library",
          requiresIslandUnlock: "nova_library",
          fallbackZone: "grove",
          idleAnimation: "reading_pose",
          alternateAnimations: ["page_turn", "book_nod"],
          activityReaction: {
            flashcards: "page_turn",
            collections: "book_nod",
            ask: "reading_pose",
          },
        },
      }),
    ],
  },
};

export const COMMON_COMPANION_IDS = Object.keys(
  COMMON_COMPANION_FRIENDSHIPS
) as CommonCompanionId[];

export function isFriendshipLevel(
  value: number
): value is FriendshipLevel {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 6
  );
}

export function getFriendshipLevelFromPoints(
  points: number
): FriendshipLevel {
  const safePoints = Math.max(
    0,
    Math.floor(Number(points) || 0)
  );

  if (safePoints >= FRIENDSHIP_LEVEL_THRESHOLDS[6]) {
    return 6;
  }
  if (safePoints >= FRIENDSHIP_LEVEL_THRESHOLDS[5]) {
    return 5;
  }
  if (safePoints >= FRIENDSHIP_LEVEL_THRESHOLDS[4]) {
    return 4;
  }
  if (safePoints >= FRIENDSHIP_LEVEL_THRESHOLDS[3]) {
    return 3;
  }
  if (safePoints >= FRIENDSHIP_LEVEL_THRESHOLDS[2]) {
    return 2;
  }

  return 1;
}

export function getFriendshipPointsForNextLevel(
  levelNumber: FriendshipLevel
): number | null {
  if (levelNumber >= 6) return null;

  const nextLevel = (levelNumber + 1) as FriendshipLevel;
  return FRIENDSHIP_LEVEL_THRESHOLDS[nextLevel];
}

export function getFriendshipProgress(
  points: number
): {
  level: FriendshipLevel;
  stage: FriendshipStageName;
  currentLevelStart: number;
  nextLevelAt: number | null;
  pointsIntoLevel: number;
  pointsNeededForLevel: number | null;
  progress: number;
} {
  const safePoints = Math.max(
    0,
    Math.floor(Number(points) || 0)
  );
  const currentLevel =
    getFriendshipLevelFromPoints(safePoints);
  const currentStart =
    FRIENDSHIP_LEVEL_THRESHOLDS[currentLevel];
  const nextLevelAt =
    getFriendshipPointsForNextLevel(currentLevel);

  if (nextLevelAt === null) {
    return {
      level: currentLevel,
      stage: FRIENDSHIP_STAGE_NAMES[currentLevel],
      currentLevelStart: currentStart,
      nextLevelAt: null,
      pointsIntoLevel: safePoints - currentStart,
      pointsNeededForLevel: null,
      progress: 1,
    };
  }

  const span = nextLevelAt - currentStart;
  const pointsIntoLevel = safePoints - currentStart;

  return {
    level: currentLevel,
    stage: FRIENDSHIP_STAGE_NAMES[currentLevel],
    currentLevelStart: currentStart,
    nextLevelAt,
    pointsIntoLevel,
    pointsNeededForLevel: span,
    progress: Math.max(
      0,
      Math.min(1, pointsIntoLevel / span)
    ),
  };
}

export function normalizeCommonCompanionId(
  rawId: string | null | undefined
): CommonCompanionId | null {
  if (!rawId) return null;

  const normalized = canonId(rawId);

  return COMMON_COMPANION_IDS.find(
    (id) => canonId(id) === normalized
  ) ?? null;
}

export function getCommonCompanionFriendshipProfile(
  rawId: string | null | undefined
): CommonCompanionFriendshipProfile | null {
  const id = normalizeCommonCompanionId(rawId);

  return id
    ? COMMON_COMPANION_FRIENDSHIPS[id]
    : null;
}

export function getFriendshipRewardForLevel(
  rawId: string | null | undefined,
  levelNumber: FriendshipLevel
): FriendshipLevelReward | null {
  const profile =
    getCommonCompanionFriendshipProfile(rawId);

  return profile?.levels[levelNumber - 1] ?? null;
}

export function getUnlockedFriendshipRewards(
  rawId: string | null | undefined,
  points: number
): FriendshipLevelReward[] {
  const profile =
    getCommonCompanionFriendshipProfile(rawId);

  if (!profile) return [];

  const currentLevel =
    getFriendshipLevelFromPoints(points);

  return profile.levels.filter(
    (reward) => reward.level <= currentLevel
  );
}

export function getUnlockedDialogue(
  rawId: string | null | undefined,
  points: number,
  type: "tap" | "pet" | "idle",
  activity?: CompanionActivityKey
): string[] {
  const rewards = getUnlockedFriendshipRewards(
    rawId,
    points
  );
  const lines: string[] = [];

  for (const reward of rewards) {
    if (activity) {
      lines.push(
        ...(reward.dialogue.activity?.[activity] ?? [])
      );
    } else {
      lines.push(...(reward.dialogue[type] ?? []));
    }
  }

  return lines;
}

export function getUnlockedAnimations(
  rawId: string | null | undefined,
  points: number
): CompanionAnimationKey[] {
  const rewards = getUnlockedFriendshipRewards(
    rawId,
    points
  );

  return Array.from(
    new Set(
      rewards.flatMap((reward) => reward.animations)
    )
  );
}

export function getTapBurstIcons(
  rawId: string | null | undefined,
  points: number
): string[] {
  const rewards = getUnlockedFriendshipRewards(
    rawId,
    points
  );

  const latestReward =
    rewards[rewards.length - 1];

  return latestReward?.tapBurstIcons ?? ["✨"];
}

export function getIslandKeepsakeForCompanion(
  rawId: string | null | undefined,
  points: number
): CompanionIslandKeepsake | null {
  const rewards = getUnlockedFriendshipRewards(
    rawId,
    points
  );

  return (
    rewards.find(
      (reward) => reward.islandKeepsake
    )?.islandKeepsake ?? null
  );
}

export function getIslandResidentForCompanion(
  rawId: string | null | undefined,
  points: number
): CompanionIslandResident | null {
  const rewards = getUnlockedFriendshipRewards(
    rawId,
    points
  );

  return (
    rewards.find(
      (reward) => reward.islandResident
    )?.islandResident ?? null
  );
}
