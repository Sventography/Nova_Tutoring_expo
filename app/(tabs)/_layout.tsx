// app/(tabs)/_layout.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  Animated,
  Easing,
  PanResponder,
  Modal,
  ScrollView,
  DeviceEventEmitter,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import CursorOverlay from "../overlays/CursorOverlay";
import TouchCursorOverlay from "../overlays/TouchCursorOverlay";
import ScrollableTabBar from "../components/ScrollableTabBar";
import HeaderBar from "../components/HeaderBar";
import StarTrailOverlay from "../components/StarTrailOverlay";
import ToastHost from "../components/ToastHost";
import AchievementsAutoTracker from "../context/AchievementsAutoTracker";
import AchievementsCoinsBridge from "../context/AchievementsCoinsBridge";
import FxOverlay from "../components/FxOverlay";
import GlobalTextDefaults from "../components/GlobalTextDefaults";
import { useUser } from "../context/UserContext";
import { useCompanion } from "../context/CompanionContext";
import { COMPANIONS } from "../_lib/companionsCatalog";
import { AchieveEmitter } from "../context/AchievementsContext"; // 🌟 listen for celebrate events
import {
  getCommonCompanionFriendshipProfile,
  getFriendshipProgress,
  getFriendshipRewardForLevel,
  getTapBurstIcons,
  getUnlockedAnimations,
  getUnlockedDialogue,
  type CommonCompanionFriendshipProfile,
  type CompanionActivityKey,
  type CompanionAnimationKey,
  type FriendshipLevelReward,
} from "../_lib/commonCompanionFriendship";
import type {
  CompanionDailyStatus,
  CompanionInteractionResult,
} from "../context/CompanionContext";


type Pt = { x: number; y: number };

// use a namespaced key so it doesn't collide with anything else
const CURSOR_EQUIPPED_KEY = "@nova/cursor.equipped.v1";

/* ------------------------- Companion FX types/map ------------------------- */

type CompanionEffectType =
  | "hearts"
  | "stars"
  | "stardust"
  | "sparkles"
  | "orbs"
  | "balloons"
  | "moons"
  | "books"
  | "fire"
  | "party_confetti"
  | "party_streamers"
  | "shield"
  | "legend_fire"
  | "legend_lightning"
  | "legend_bubbles"
  | "legend_sparkles"
  | "legend_spiral"
  | null;

/**
 * Build a stable, per-companion effect map so each one
 * gets a distinct animated effect and we don't spam stars.
 * This mirrors the shop tab logic so everything stays in sync.
 */
function buildCompanionEffectMap(): Record<string, CompanionEffectType> {
  const map: Record<string, CompanionEffectType> = {};

  const EFFECT_SEQUENCE: CompanionEffectType[] = [
    "hearts",
    "balloons",
    "moons",
    "stardust",
    "sparkles",
    "orbs",
    "stars",
  ];

  let seqIdx = 0;
  let firstPartyAssigned = false;

  (COMPANIONS as any[]).forEach((comp) => {
    const rawId = (comp?.id ?? "") as string;
    const rawCanon = (comp as any)?.canonId as string | undefined;
    const id = rawId.toLowerCase();
    const text = `${comp?.title ?? ""} ${comp?.desc ?? ""}`.toLowerCase();
    let type: CompanionEffectType = null;

    // 🔱 Legendary explicit matches
    if (id.includes("chrono") || text.includes("chrono fox")) {
      type = "legend_fire"; // Chrono Fox – fire FX
    } else if (id.includes("mecha") || text.includes("mecha owl")) {
      type = "legend_lightning"; // Mecha Owl – lightning FX
    } else if (
      id.includes("axolotl") ||
      text.includes("axolotl") ||
      text.includes("oracle")
    ) {
      type = "shield"; // Axolotl Oracle – shield rings
    } else if (id.includes("celestra") || text.includes("celestra")) {
      type = "legend_bubbles"; // Celestra – bubble aura
    } else if (
      id.includes("astral") ||
      text.includes("astral nova") ||
      text.includes("astral")
    ) {
      type = "legend_sparkles"; // Astral Nova – spark diamonds
    } else if (
      id.includes("aetherwyrm") ||
      text.includes("aetherwyrm") ||
      text.includes("wyrm")
    ) {
      type = "legend_spiral"; // Aetherwyrm – spiral rings
    }

    // 🌙📚✨ Thematic matches for common companions (only if not set above)
    if (!type) {
      const isParty = text.includes("party");

      // 🥳 Party companions
      if (isParty) {
        if (!firstPartyAssigned) {
          type = "party_confetti";
          firstPartyAssigned = true;
        } else {
          type = "party_streamers";
        }
      } else if (text.includes("balloon")) {
        type = "balloons";
      } else if (text.includes("moon") || text.includes("luna")) {
        type = "moons";
      } else if (text.includes("stardust") || text.includes("star dust")) {
        type = "stardust";
      } else if (text.includes("heart") || text.includes("love")) {
        type = "hearts";
      } else if (
        text.includes("sparkle") ||
        text.includes("sparkly") ||
        text.includes("glitter")
      ) {
        type = "sparkles";
      } else if (
        text.includes("orb") ||
        text.includes("nova") ||
        text.includes("star")
      ) {
        type = "stars";
      } else if (
        text.includes("book") ||
        text.includes("study") ||
        text.includes("reading") ||
        text.includes("reader")
      ) {
        type = "books";
      } else if (
        text.includes("flame") ||
        text.includes("fire") ||
        text.includes("ember")
      ) {
        type = "fire";
      }
    }

    // Fallback sequence so everything gets *something*
    if (!type) {
      type = EFFECT_SEQUENCE[seqIdx % EFFECT_SEQUENCE.length];
      seqIdx += 1;
    }

    // ✅ Key by BOTH id and canonId so legend FX work everywhere
    if (rawId) {
      map[rawId] = type;
    }
    if (rawCanon) {
      map[rawCanon] = type;
    }
  });

  return map;
}

const COMPANION_EFFECT_MAP = buildCompanionEffectMap();

function getCompanionEffect(id: string | null | undefined): CompanionEffectType {
  if (!id) return "stars";
  const key = String(id);
  return COMPANION_EFFECT_MAP[key] ?? "stars";
}

type LegendaryPresentation = {
  key:
    | "mecha_owl"
    | "chrono_fox"
    | "celestra"
    | "axolotl_oracle"
    | "astral_nova"
    | "aetherwyrm";
  title: string;
  accent: string;
  accentSoft: string;
  secondary: string;
  background: string;
  emblem: string;
  abilityLabel: string;
  arrivalLine: string;
  activationLine: string;
  tapLines: string[];
  powerAnimation: CompanionAnimationKey;
};

function companionToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getLegendaryPresentation(
  companion: any
): LegendaryPresentation | null {
  if (!companion) return null;

  const token = [
    companion?.id,
    companion?.canonId,
    companion?.title,
    companion?.meta?.iapProductId,
  ]
    .map(companionToken)
    .filter(Boolean)
    .join("|");

  if (
    token.includes("mechaowl") ||
    companion?.ability?.type ===
      "achievement_reward_bonus"
  ) {
    return {
      key: "mecha_owl",
      title: "Mecha Owl",
      accent: "#67E8F9",
      accentSoft: "rgba(34,211,238,0.24)",
      secondary: "#FDE047",
      background: "rgba(3,18,32,0.96)",
      emblem: "⌁",
      abilityLabel: "+10% achievement coins",
      arrivalLine:
        "Systems online. Achievement rewards are now amplified.",
      activationLine:
        "Reward matrix amplified · +10%",
      tapLines: [
        "Scanning the horizon for your next victory.",
        "Power cells stable. Focus levels rising.",
        "Every achievement is worth more with me online.",
      ],
      powerAnimation: "light_show",
    };
  }

  if (
    token.includes("chronofox") ||
    companion?.ability?.type ===
      "quiz_time_bonus"
  ) {
    return {
      key: "chrono_fox",
      title: "Chrono Fox",
      accent: "#F59E0B",
      accentSoft: "rgba(245,158,11,0.24)",
      secondary: "#FDE68A",
      background: "rgba(31,16,3,0.96)",
      emblem: "◷",
      abilityLabel: "+2 minutes on quizzes",
      arrivalLine:
        "The timeline bends. Your quizzes now have more time.",
      activationLine:
        "Timeline extended · +2 minutes",
      tapLines: [
        "A second can become an eternity in the right paws.",
        "Time is not running out. It is listening.",
        "The next moment belongs to you.",
      ],
      powerAnimation: "star_arc",
    };
  }

  if (
    token.includes("celestra") ||
    companion?.ability?.type ===
      "streak_milestone_bonus"
  ) {
    return {
      key: "celestra",
      title: "Celestra",
      accent: "#7DD3FC",
      accentSoft: "rgba(56,189,248,0.23)",
      secondary: "#C4B5FD",
      background: "rgba(4,15,38,0.96)",
      emblem: "✧",
      abilityLabel: "+25% streak milestone coins",
      arrivalLine:
        "Starlight gathers around your daily momentum.",
      activationLine:
        "Streak energy amplified · +25%",
      tapLines: [
        "Your consistency shines brighter than any star.",
        "Another day, another light in the constellation.",
        "I can feel your momentum becoming celestial.",
      ],
      powerAnimation: "float_up",
    };
  }

  if (
    token.includes("axolotloracle") ||
    token.includes("axolotl") ||
    companion?.ability?.type ===
      "streak_shield"
  ) {
    return {
      key: "axolotl_oracle",
      title: "Axolotl Oracle",
      accent: "#60A5FA",
      accentSoft: "rgba(96,165,250,0.24)",
      secondary: "#F0ABFC",
      background: "rgba(7,15,38,0.96)",
      emblem: "◉",
      abilityLabel: "Streak shield · once per 7 days",
      arrivalLine:
        "The Oracle awakens. Your streak is under protection.",
      activationLine:
        "Oracle shield awakened",
      tapLines: [
        "The currents whisper that you are exactly where you need to be.",
        "A shield is strongest when protecting something precious.",
        "Even missed days cannot erase how far you have come.",
      ],
      powerAnimation: "heart_pulse",
    };
  }

  if (
    token.includes("astralnova") ||
    companion?.ability?.type ===
      "quiz_certificate_bonus"
  ) {
    return {
      key: "astral_nova",
      title: "Astral Nova",
      accent: "#E879F9",
      accentSoft: "rgba(232,121,249,0.24)",
      secondary: "#FDE047",
      background: "rgba(27,7,39,0.96)",
      emblem: "✦",
      abilityLabel: "+500 coins per certificate",
      arrivalLine:
        "A new constellation has chosen to study beside you.",
      activationLine:
        "Certificate constellation awakened · +500",
      tapLines: [
        "Your work is becoming part of the stars.",
        "Every lesson leaves a new light in the sky.",
        "Let us make the next achievement unforgettable.",
      ],
      powerAnimation: "light_show",
    };
  }

  if (
    token.includes("aetherwyrm") ||
    token.includes("wyrm") ||
    companion?.ability?.type ===
      "global_coin_multiplier"
  ) {
    return {
      key: "aetherwyrm",
      title: "Aetherwyrm",
      accent: "#A78BFA",
      accentSoft: "rgba(139,92,246,0.27)",
      secondary: "#22D3EE",
      background: "rgba(17,7,41,0.97)",
      emblem: "◇",
      abilityLabel: "+20% coins from all rewards",
      arrivalLine:
        "Aether energy floods every reward path.",
      activationLine:
        "Aether surge · all coin rewards +20%",
      tapLines: [
        "Power is not taken. It is awakened.",
        "The aether remembers every step of your journey.",
        "Your rewards now carry the strength of a wyrm.",
      ],
      powerAnimation: "party_spin",
    };
  }

  return null;
}

function LegendaryAura({
  presentation,
  activationKey,
}: {
  presentation: LegendaryPresentation;
  activationKey: number;
}) {
  const pulse = useRef(
    new Animated.Value(0)
  ).current;
  const orbit = useRef(
    new Animated.Value(0)
  ).current;
  const flash = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 7600,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    pulseLoop.start();
    orbitLoop.start();

    return () => {
      pulseLoop.stop();
      orbitLoop.stop();
    };
  }, [orbit, pulse]);

  useEffect(() => {
    flash.setValue(0);

    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 820,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [activationKey, flash]);

  const outerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.12],
  });

  const innerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.06, 0.96],
  });

  const glowOpacity = Animated.add(
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.46],
    }),
    flash.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.46],
    })
  );

  const orbitRotation = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const reverseRotation = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const emblemOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.48, 0.9],
  });

  return (
    <View
      pointerEvents="none"
      style={S.legendaryAuraRoot}
    >
      <Animated.View
        style={[
          S.legendaryAuraGlow,
          {
            backgroundColor:
              presentation.accentSoft,
            opacity: glowOpacity,
            transform: [
              { scale: outerScale },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          S.legendaryOrbitRing,
          {
            borderColor:
              presentation.accent,
            transform: [
              { rotate: orbitRotation },
              { scale: outerScale },
            ],
          },
        ]}
      >
        <View
          style={[
            S.legendaryOrbitDot,
            S.legendaryOrbitDotTop,
            {
              backgroundColor:
                presentation.secondary,
              shadowColor:
                presentation.secondary,
            },
          ]}
        />
        <View
          style={[
            S.legendaryOrbitDot,
            S.legendaryOrbitDotBottom,
            {
              backgroundColor:
                presentation.accent,
              shadowColor:
                presentation.accent,
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          S.legendaryInnerRing,
          {
            borderColor:
              presentation.secondary,
            opacity: emblemOpacity,
            transform: [
              { rotate: reverseRotation },
              { scale: innerScale },
            ],
          },
        ]}
      />

      <Animated.Text
        style={[
          S.legendaryAuraEmblem,
          {
            color: presentation.secondary,
            opacity: emblemOpacity,
          },
        ]}
      >
        {presentation.emblem}
      </Animated.Text>
    </View>
  );
}

/* --------- Visual overlay for companion click effects (hearts/stars/etc) -- */

function CompanionEffectOverlay({
  type,
  effectKey,
}: {
  type: CompanionEffectType;
  effectKey: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!type) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [type, effectKey, anim]);

  if (!type) return null;

  // 🛡 Axolotl Oracle-style aura: expanding rings that spill out
  if (type === "shield") {
    const rings = [0, 1, 2];
    return (
      <>
        {rings.map((idx) => {
          const baseSize = 110 + idx * 26;
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.35],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0.8 - idx * 0.2, 0],
          });

          return (
            <Animated.View
              key={`shield-${idx}-${effectKey}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: baseSize,
                height: baseSize,
                marginLeft: -baseSize / 2,
                marginTop: -baseSize / 2,
                borderRadius: baseSize / 2,
                borderWidth: 2,
                borderColor: `rgba(96,165,250,${0.7 - idx * 0.2})`,
                opacity,
                transform: [{ scale }],
              }}
            />
          );
        })}
      </>
    );
  }

  // 🌋 Legendary special FX (non-emoji)
  if (
    type === "legend_fire" ||
    type === "legend_lightning" ||
    type === "legend_bubbles" ||
    type === "legend_sparkles" ||
    type === "legend_spiral"
  ) {
    // 🔥 Chrono Fox — layered flames + embers
    if (type === "legend_fire") {
      const tongues = [0, 1, 2, 3, 4, 5, 6];
      const embers = [0, 1, 2, 3];

      return (
        <>
          {tongues.map((idx) => {
            const baseHeight = 50 + idx * 4;
            const baseWidth = 12 + (idx % 3) * 2;
            const offsetX = (idx - tongues.length / 2) * 6;

            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [8, -baseHeight - 16],
            });

            const scaleY = anim.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.4, 1.2, 0.9, 0.5],
            });

            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 0.8, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`lf-tongue-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: "50%",
                  width: baseWidth,
                  height: baseHeight,
                  marginLeft: -baseWidth / 2 + offsetX,
                  borderRadius: baseWidth,
                  opacity,
                  transform: [{ translateY }, { scaleY }],
                  backgroundColor: "rgba(239,68,68,0.9)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 2,
                    right: 2,
                    top: baseHeight * 0.25,
                    borderRadius: baseWidth,
                    backgroundColor: "rgba(252,211,77,0.95)",
                  }}
                />
              </Animated.View>
            );
          })}

          {embers.map((idx) => {
            const size = 6 + (idx % 2) * 2;
            const baseRadius = 40 + idx * 8;
            const angle = (idx / embers.length) * Math.PI * 2;

            const translateX = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * baseRadius],
            });
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -Math.sin(angle) * baseRadius - 30],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 1, 0],
            });

            return (
              <Animated.View
                key={`lf-ember-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 40,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  borderRadius: size / 2,
                  backgroundColor: "rgba(252,211,77,0.95)",
                  opacity,
                  transform: [{ translateX }, { translateY }],
                }}
              />
            );
          })}
        </>
      );
    }

    // ⚡ Mecha Owl — jagged lightning with glow
    if (type === "legend_lightning") {
      const bolts = [0, 1];

      const glowOpacity = anim.interpolate({
        inputRange: [0, 0.3, 0.6, 1],
        outputRange: [0, 0.7, 0.2, 0],
      });

      return (
        <>
          <Animated.View
            style={{
              position: "absolute",
              left: "50%",
              bottom: 10,
              width: 120,
              height: 120,
              marginLeft: -60,
              borderRadius: 60,
              backgroundColor: "rgba(250,250,210,0.35)",
              opacity: glowOpacity,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.1],
                  }),
                },
              ],
            }}
          />

          {bolts.map((idx) => {
            const baseX = idx === 0 ? -8 : 10;
            const baseHeight = 90;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-10, -100],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.25, 0.6, 1],
              outputRange: [0, 1, 0.8, 0],
            });

            return (
              <Animated.View
                key={`ll-bolt-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 10,
                  marginLeft: baseX,
                  opacity,
                  transform: [{ translateY }],
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 6,
                    height: baseHeight * 0.35,
                    borderRadius: 4,
                    backgroundColor: "rgba(250,250,210,1)",
                    transform: [{ rotate: idx === 0 ? "-18deg" : "10deg" }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: -6,
                    top: baseHeight * 0.3,
                    width: 7,
                    height: baseHeight * 0.32,
                    borderRadius: 4,
                    backgroundColor: "rgba(253,224,71,0.95)",
                    transform: [{ rotate: idx === 0 ? "28deg" : "-22deg" }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: -2,
                    top: baseHeight * 0.55,
                    width: 5,
                    height: baseHeight * 0.28,
                    borderRadius: 4,
                    backgroundColor: "rgba(234,179,8,0.95)",
                    transform: [{ rotate: idx === 0 ? "-26deg" : "18deg" }],
                  }}
                />
              </Animated.View>
            );
          })}
        </>
      );
    }

    // 🫧 Celestra bubbles
    if (type === "legend_bubbles") {
      const bubbles = [0, 1, 2, 3, 4, 5];
      return (
        <>
          {bubbles.map((idx) => {
            const size = 12 + (idx % 3) * 6;
            const offsetX = (idx - 2.5) * 10;
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, -110 - idx * 6],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.9, 0],
            });

            return (
              <Animated.View
                key={`lb-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: "50%",
                  width: size,
                  height: size,
                  marginLeft: offsetX - size / 2,
                  borderRadius: size / 2,
                  borderWidth: 1,
                  borderColor: "rgba(191,219,254,0.9)",
                  backgroundColor: "rgba(59,130,246,0.20)",
                  opacity,
                  transform: [{ translateY }],
                }}
              />
            );
          })}
        </>
      );
    }

    // ✨ Astral Nova sparkles
    if (type === "legend_sparkles") {
      const sparks = [0, 1, 2, 3, 4, 5];
      return (
        <>
          {sparks.map((idx) => {
            const size = 14 + (idx % 2) * 4;
            const radius = 32 + idx * 4;
            const angle = (idx / sparks.length) * Math.PI * 2;

            const translateX = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * radius],
            });
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -Math.sin(angle) * radius],
            });
            const scale = anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.4, 1.1, 0.4],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 1, 0],
            });

            return (
              <Animated.View
                key={`ls-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  opacity,
                  backgroundColor: "rgba(251,191,36,0.95)",
                  transform: [
                    { translateX },
                    { translateY },
                    { rotate: "45deg" },
                    { scale },
                  ],
                  borderRadius: 4,
                }}
              />
            );
          })}
        </>
      );
    }

    // 🐉 Aetherwyrm spiral aura
    if (type === "legend_spiral") {
      const rings = [0, 1, 2, 3];
      return (
        <>
          {rings.map((idx) => {
            const baseSize = 80 + idx * 16;
            const rotation = anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${40 + idx * 10}deg`],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.85 - idx * 0.15, 0],
            });

            return (
              <Animated.View
                key={`lspr-${idx}-${effectKey}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: baseSize,
                  height: baseSize,
                  marginLeft: -baseSize / 2,
                  marginTop: -baseSize / 2,
                  borderRadius: baseSize / 2,
                  borderWidth: 2,
                  borderColor: `rgba(129,140,248,${0.9 - idx * 0.18})`,
                  opacity,
                  transform: [{ rotate: rotation }],
                }}
              />
            );
          })}
        </>
      );
    }
  }

  // 💜 Default: emoji-based burst FX (common companions)
  const icons =
    type === "party_confetti"
      ? ["🎉", "🎊", "🎉", "🎊", "🎉", "🎊"]
      : type === "party_streamers"
      ? ["🎊", "🎉", "🎊", "🎉", "🎊", "🎉"]
      : type === "hearts"
      ? ["💜", "🩷", "❤️", "💙", "💜", "🩵"]
      : type === "stardust"
      ? ["✨", "✧", "⋆", "✦", "✨", "⋆"]
      : type === "sparkles"
      ? ["✨", "💫", "✨", "💫", "✨", "💫"]
      : type === "balloons"
      ? ["🎈", "🎈", "🎉", "🎈", "🎈", "🎉"]
      : type === "moons"
      ? ["🌙", "🌘", "🌖", "🌙", "⭐", "🌙"]
      : type === "orbs"
      ? ["💫", "🟣", "🔮", "💫", "🔮", "🟣"]
      : type === "books"
      ? ["📚", "📖", "📘", "📙", "📗", "📕"]
      : type === "fire"
      ? ["🔥", "🔥", "🔥", "✨", "🔥", "🔥"]
      : ["⭐", "🌟", "⭐", "✦", "✧", "⭐"];

  return (
    <>
      {icons.map((icon, index) => {
        const offsetX = (index - icons.length / 2) * 14;

        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -110 - index * 10],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 1, 0],
        });
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offsetX],
        });

        const fontSize = type === "books" ? 22 : type === "fire" ? 28 : 26;

        return (
          <Animated.Text
            key={`${type}-${index}-${effectKey}`}
            style={{
              position: "absolute",
              bottom: 4,
              fontSize,
              transform: [{ translateY }, { translateX }],
              opacity,
            }}
          >
            {icon}
          </Animated.Text>
        );
      })}
    </>
  );
}

const COMPANION_ACTIVITY_EVENT =
  "companion:activity";
const SHOP_PURCHASE_COMPLETED_EVENT =
  "shop:purchase_completed";

function randomLine(lines: string[]): string {
  if (!lines.length) return "";

  return lines[
    Math.floor(Math.random() * lines.length)
  ];
}

function latestUnlockedReward(
  profile: CommonCompanionFriendshipProfile,
  level: number
): FriendshipLevelReward {
  const safeIndex = Math.max(
    0,
    Math.min(profile.levels.length - 1, level - 1)
  );

  return profile.levels[safeIndex];
}

function unlockedDoubleTapReward(
  profile: CommonCompanionFriendshipProfile,
  level: number
): FriendshipLevelReward | null {
  return (
    [...profile.levels]
      .reverse()
      .find(
        (reward) =>
          reward.level <= level &&
          reward.specialInteraction?.type ===
            "double_tap"
      ) ?? null
  );
}

function activityLabel(
  activity: CompanionActivityKey
): string {
  const labels: Record<
    CompanionActivityKey,
    string
  > = {
    ask: "Ask Nova",
    quiz: "Quiz",
    brainteasers: "Brainteaser",
    flashcards: "Flashcards",
    collections: "Collections",
    achievements: "Achievement",
    shop_purchase: "Shop unlock",
    coins_earned: "Coin reward",
    relax: "Relax",
    island_level_up: "Island level-up",
    daily_login: "Daily login",
  };

  return labels[activity];
}

function CompanionIconBurst({
  icons,
  burstKey,
  animation,
}: {
  icons: string[];
  burstKey: number;
  animation: CompanionAnimationKey;
}) {
  const anim = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    anim.setValue(0);

    Animated.timing(anim, {
      toValue: 1,
      duration:
        animation === "light_show"
          ? 1650
          : 1150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [anim, animation, burstKey]);

  const visibleIcons =
    icons.length > 0
      ? icons.slice(0, 8)
      : ["✨"];

  return (
    <>
      {visibleIcons.map((icon, index) => {
        const centered =
          index - (visibleIcons.length - 1) / 2;
        const radialAngle =
          (index / visibleIcons.length) *
            Math.PI *
            2 -
          Math.PI / 2;

        let endX =
          Math.cos(radialAngle) *
          (42 + (index % 3) * 10);
        let endY =
          Math.sin(radialAngle) *
          (58 + (index % 2) * 14);

        if (
          animation === "star_gust" ||
          animation === "heart_trail"
        ) {
          endX = -52 - index * 12;
          endY = centered * 11;
        } else if (
          animation === "star_arc" ||
          animation === "star_toss" ||
          animation === "target_toss"
        ) {
          endX = -60 - index * 8;
          endY = -18 + Math.abs(centered) * 10;
        } else if (
          animation === "float_up" ||
          animation === "balloon_sway" ||
          animation === "balloon_spin"
        ) {
          endX = centered * 17;
          endY = -92 - (index % 3) * 18;
        } else if (
          animation === "coin_rain"
        ) {
          endX = centered * 16;
          endY = 34 + (index % 2) * 16;
        } else if (
          animation === "page_turn" ||
          animation === "reading_pose"
        ) {
          endX = centered * 24;
          endY = -50 - (index % 2) * 18;
        }

        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, endX],
        });

        const translateY =
          animation === "coin_rain"
            ? anim.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0, -70, endY],
              })
            : animation === "star_arc" ||
              animation === "star_toss" ||
              animation === "target_toss"
            ? anim.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0, -65, endY],
              })
            : anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, endY],
              });

        const opacity = anim.interpolate({
          inputRange: [0, 0.16, 0.78, 1],
          outputRange: [0, 1, 0.92, 0],
        });

        const scale = anim.interpolate({
          inputRange: [0, 0.32, 1],
          outputRange: [0.45, 1.12, 0.72],
        });

        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [
            "0deg",
            `${centered * 75}deg`,
          ],
        });

        return (
          <Animated.Text
            key={`${burstKey}-${index}-${icon}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              marginLeft: -12,
              marginTop: -12,
              fontSize:
                icon.length > 2 ? 15 : 23,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { rotate },
                { scale },
              ],
            }}
          >
            {icon}
          </Animated.Text>
        );
      })}
    </>
  );
}

function FriendshipProgressModal({
  visible,
  onClose,
  profile,
  points,
  dailyStatus,
  image,
}: {
  visible: boolean;
  onClose: () => void;
  profile: CommonCompanionFriendshipProfile;
  points: number;
  dailyStatus: CompanionDailyStatus;
  image: any;
}) {
  const progress =
    getFriendshipProgress(points);
  const nextReward =
    progress.level < 6
      ? getFriendshipRewardForLevel(
          profile.id,
          (progress.level + 1) as any
        )
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={S.friendshipModalBackdrop}
        onPress={onClose}
      >
        <Pressable
          style={[
            S.friendshipModalCard,
            {
              borderColor: profile.accent,
            },
          ]}
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <View style={S.friendshipModalHeader}>
            <View
              style={[
                S.friendshipPortrait,
                {
                  borderColor: profile.accent,
                },
              ]}
            >
              <Image
                source={image}
                style={S.friendshipPortraitImage}
                resizeMode="contain"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  S.friendshipModalEyebrow,
                  { color: profile.accent },
                ]}
              >
                {profile.friendshipEmoji}{" "}
                {progress.stage}
              </Text>
              <Text
                style={
                  S.friendshipModalTitle
                }
              >
                {profile.title}
              </Text>
              <Text
                style={
                  S.friendshipModalPersonality
                }
              >
                {profile.personality}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
            >
              <Ionicons
                name="close"
                color="#e2e8f0"
                size={23}
              />
            </Pressable>
          </View>

          <View style={S.friendshipProgressCard}>
            <View
              style={
                S.friendshipProgressTop
              }
            >
              <Text
                style={
                  S.friendshipProgressLabel
                }
              >
                Friendship Level{" "}
                {progress.level}
              </Text>
              <Text
                style={[
                  S.friendshipProgressValue,
                  { color: profile.accent },
                ]}
              >
                {progress.level >= 6
                  ? `${points} · MAX`
                  : `${points} / ${progress.nextLevelAt}`}
              </Text>
            </View>

            <View
              style={
                S.friendshipProgressTrack
              }
            >
              <View
                style={[
                  S.friendshipProgressFill,
                  {
                    width: `${
                      Math.max(
                        0.025,
                        progress.progress
                      ) * 100
                    }%`,
                    backgroundColor:
                      profile.accent,
                  },
                ]}
              />
            </View>

            <Text
              style={
                S.friendshipDailyText
              }
            >
              Today: {dailyStatus.tapsRemaining}{" "}
              tap XP,{" "}
              {dailyStatus.petsRemaining} pets,
              and{" "}
              {
                dailyStatus.activitiesRemaining
              }{" "}
              learning reactions remaining
            </Text>
          </View>

          {nextReward ? (
            <View
              style={[
                S.friendshipNextCard,
                {
                  borderColor:
                    `${profile.accent}88`,
                },
              ]}
            >
              <Text
                style={[
                  S.friendshipNextEyebrow,
                  { color: profile.accent },
                ]}
              >
                NEXT UNLOCK · LEVEL{" "}
                {nextReward.level}
              </Text>
              <Text
                style={
                  S.friendshipNextTitle
                }
              >
                {nextReward.title}
              </Text>
              <Text
                style={
                  S.friendshipNextDescription
                }
              >
                {nextReward.description}
              </Text>
            </View>
          ) : (
            <View
              style={[
                S.friendshipNextCard,
                {
                  borderColor:
                    `${profile.accent}88`,
                },
              ]}
            >
              <Text
                style={[
                  S.friendshipNextEyebrow,
                  { color: profile.accent },
                ]}
              >
                BONDED
              </Text>
              <Text
                style={
                  S.friendshipNextTitle
                }
              >
                Island resident unlocked
              </Text>
              <Text
                style={
                  S.friendshipNextDescription
                }
              >
                This companion now has a
                permanent home on Nova Island.
              </Text>
            </View>
          )}

          <ScrollView
            style={{ maxHeight: 330 }}
            showsVerticalScrollIndicator={false}
          >
            {profile.levels.map((reward) => {
              const unlocked =
                reward.level <=
                progress.level;

              return (
                <View
                  key={reward.level}
                  style={[
                    S.friendshipRewardRow,
                    {
                      borderColor: unlocked
                        ? `${profile.accent}66`
                        : "rgba(71,85,105,0.55)",
                      backgroundColor: unlocked
                        ? `${profile.accent}12`
                        : "rgba(15,23,42,0.58)",
                    },
                  ]}
                >
                  <View
                    style={[
                      S.friendshipRewardLevel,
                      {
                        borderColor: unlocked
                          ? profile.accent
                          : "#64748b",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        S.friendshipRewardLevelText,
                        {
                          color: unlocked
                            ? profile.accent
                            : "#94a3b8",
                        },
                      ]}
                    >
                      {reward.level}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        S.friendshipRewardTitle,
                        {
                          color: unlocked
                            ? "#f8fafc"
                            : "#94a3b8",
                        },
                      ]}
                    >
                      {reward.stage} ·{" "}
                      {reward.title}
                    </Text>
                    <Text
                      style={
                        S.friendshipRewardDescription
                      }
                    >
                      {reward.description}
                    </Text>

                    {reward.islandKeepsake ? (
                      <Text
                        style={[
                          S.friendshipRewardBonus,
                          {
                            color:
                              profile.accent,
                          },
                        ]}
                      >
                        Island keepsake:{" "}
                        {
                          reward
                            .islandKeepsake
                            .title
                        }
                      </Text>
                    ) : null}

                    {reward.islandResident ? (
                      <Text
                        style={[
                          S.friendshipRewardBonus,
                          {
                            color:
                              profile.accent,
                          },
                        ]}
                      >
                        Permanent island
                        resident
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name={
                      unlocked
                        ? "checkmark-circle"
                        : "lock-closed"
                    }
                    color={
                      unlocked
                        ? profile.accent
                        : "#64748b"
                    }
                    size={19}
                  />
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Live draggable companion.
 *
 * Friendship progression is enabled only when a profile exists in
 * commonCompanionFriendship.ts. Legendary companions therefore keep their
 * previous interaction cycle and are not included in this system.
 */
function FloatingCompanionOverlay() {
  const pathname = usePathname();
  const {
    activeCompanion,
    friendshipPoints,
    getFriendshipPoints,
    getFriendshipDailyStatus,
    recordCompanionInteraction,
    recordCompanionActivity,
  } = useCompanion();

  const bob = useRef(
    new Animated.Value(0)
  ).current;
  const pan = useRef(
    new Animated.ValueXY({ x: 0, y: 0 })
  ).current;
  const scale = useRef(
    new Animated.Value(1)
  ).current;
  const hop = useRef(
    new Animated.Value(0)
  ).current;
  const shake = useRef(
    new Animated.Value(0)
  ).current;
  const driftX = useRef(
    new Animated.Value(0)
  ).current;
  const rotate = useRef(
    new Animated.Value(0)
  ).current;
  const tilt = useRef(
    new Animated.Value(0)
  ).current;
  const legendaryEntrance = useRef(
    new Animated.Value(1)
  ).current;

  const [legendEffect, setLegendEffect] =
    useState<CompanionEffectType>("stars");
  const [legendEffectKey, setLegendEffectKey] =
    useState(0);
  const [burstIcons, setBurstIcons] =
    useState<string[]>([]);
  const [burstAnimation, setBurstAnimation] =
    useState<CompanionAnimationKey>(
      "happy_bounce"
    );
  const [burstKey, setBurstKey] =
    useState(0);
  const [speech, setSpeech] =
    useState<string | null>(null);
  const [speechKind, setSpeechKind] =
    useState<
      "tap" | "pet" | "idle" | "activity"
    >("tap");
  const [friendshipOpen, setFriendshipOpen] =
    useState(false);

  const activeId =
    (activeCompanion as any)?.canonId ||
    (activeCompanion as any)?.id ||
    "";
  const profile =
    getCommonCompanionFriendshipProfile(
      activeId
    );
  const isCommon =
    !!profile &&
    activeCompanion?.role === "cosmetic";
  const legendaryPresentation = useMemo(
    () =>
      getLegendaryPresentation(
        activeCompanion
      ),
    [
      activeCompanion?.id,
      activeCompanion?.canonId,
      activeCompanion?.ability?.type,
    ]
  );
  const isLegendary =
    !!legendaryPresentation &&
    !isCommon;
  const points = isCommon
    ? getFriendshipPoints(activeId)
    : 0;
  const friendshipProgress =
    getFriendshipProgress(points);
  const dailyStatus = isCommon
    ? getFriendshipDailyStatus(activeId)
    : {
        date: "",
        tapsUsed: 0,
        petsUsed: 0,
        activitiesUsed: 0,
        tapsRemaining: 0,
        petsRemaining: 0,
        activitiesRemaining: 0,
      };

  const activeRef =
    useRef<any>(activeCompanion);
  const profileRef =
    useRef<CommonCompanionFriendshipProfile | null>(
      profile
    );
  const pointsRef = useRef(points);
  const recordInteractionRef =
    useRef(recordCompanionInteraction);
  const recordActivityRef =
    useRef(recordCompanionActivity);
  const speechVisibleRef = useRef(false);
  const draggingRef = useRef(false);
  const tapCandidateRef = useRef(false);
  const longPressTriggeredRef =
    useRef(false);
  const offsetRef = useRef({
    x: 0,
    y: 0,
  });
  const clickModeRef = useRef(0);
  const lastTapAtRef = useRef(0);

  const speechTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
  const longPressTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
  const singleTapTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
  const activityHandlerRef =
    useRef<
      (
        activity: CompanionActivityKey,
        award: boolean
      ) => void
    >(() => {});
  const legendaryPresentationRef =
    useRef<LegendaryPresentation | null>(
      legendaryPresentation
    );
  const legendaryPowerHandlerRef =
    useRef<
      (
        activity: CompanionActivityKey
      ) => void
    >(() => {});

  activeRef.current = activeCompanion;
  profileRef.current = profile;
  pointsRef.current = points;
  recordInteractionRef.current =
    recordCompanionInteraction;
  recordActivityRef.current =
    recordCompanionActivity;
  legendaryPresentationRef.current =
    legendaryPresentation;

  const rotation = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-360deg", "360deg"],
  });

  const tiltRotation = tilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-16deg", "16deg"],
  });

  const clearSpeechTimer = () => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  };

  const showSpeech = (
    message: string,
    kind:
      | "tap"
      | "pet"
      | "idle"
      | "activity",
    duration = 3000
  ) => {
    if (!message) return;

    clearSpeechTimer();
    speechVisibleRef.current = true;
    setSpeechKind(kind);
    setSpeech(message);

    speechTimerRef.current = setTimeout(
      () => {
        speechVisibleRef.current = false;
        setSpeech(null);
        speechTimerRef.current = null;
      },
      duration
    );
  };

  const triggerBurst = (
    icons: string[],
    animation: CompanionAnimationKey
  ) => {
    setBurstIcons(icons);
    setBurstAnimation(animation);
    setBurstKey((key) => key + 1);
  };

  const resetTransforms = () => {
    scale.stopAnimation();
    hop.stopAnimation();
    shake.stopAnimation();
    driftX.stopAnimation();
    rotate.stopAnimation();
    tilt.stopAnimation();

    scale.setValue(1);
    hop.setValue(0);
    shake.setValue(0);
    driftX.setValue(0);
    rotate.setValue(0);
    tilt.setValue(0);
  };

  const performAnimation = (
    animation: CompanionAnimationKey
  ) => {
    resetTransforms();

    const timing = (
      value: Animated.Value,
      toValue: number,
      duration: number
    ) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      });

    const hopSequence = (
      height: number,
      repeats = 1
    ) =>
      Animated.sequence(
        Array.from(
          { length: repeats },
          () => [
            timing(hop, -height, 125),
            Animated.spring(hop, {
              toValue: 0,
              friction: 4,
              useNativeDriver: false,
            }),
          ]
        ).flat()
      );

    const wiggle = (
      amount = 7,
      repeats = 2
    ) =>
      Animated.sequence(
        Array.from(
          { length: repeats },
          () => [
            timing(shake, amount, 70),
            timing(shake, -amount, 70),
          ]
        )
          .flat()
          .concat([timing(shake, 0, 70)])
      );

    const pulse = (
      low = 0.9,
      high = 1.16
    ) =>
      Animated.sequence([
        timing(scale, low, 110),
        timing(scale, high, 150),
        timing(scale, 1, 180),
      ]);

    const spin = (duration = 420) =>
      Animated.sequence([
        timing(rotate, 1, duration),
        timing(rotate, 0, 0),
      ]);

    const tiltSequence = (
      amount = 0.75
    ) =>
      Animated.sequence([
        timing(tilt, amount, 150),
        timing(tilt, -amount, 150),
        timing(tilt, 0, 130),
      ]);

    switch (animation) {
      case "gentle_bob":
        pulse(0.97, 1.04).start();
        break;
      case "happy_bounce":
        hopSequence(15).start();
        break;
      case "big_hop":
        hopSequence(29).start();
        break;
      case "double_hop":
        hopSequence(20, 2).start();
        break;
      case "ear_wiggle":
      case "page_turn":
        wiggle(5, 3).start();
        break;
      case "paw_wave":
      case "book_nod":
        tiltSequence(0.7).start();
        break;
      case "float_up":
        Animated.sequence([
          timing(hop, -34, 330),
          timing(hop, 0, 430),
        ]).start();
        break;
      case "balloon_sway":
        Animated.parallel([
          tiltSequence(0.85),
          Animated.sequence([
            timing(hop, -12, 280),
            timing(hop, 0, 320),
          ]),
        ]).start();
        break;
      case "balloon_spin":
      case "party_spin":
      case "streamer_spin":
      case "coin_flip":
        spin(
          animation === "coin_flip"
            ? 320
            : 460
        ).start();
        break;
      case "heart_pulse":
      case "star_breath":
        pulse(0.9, 1.18).start();
        break;
      case "heart_twirl":
        Animated.parallel([
          pulse(0.92, 1.13),
          spin(480),
        ]).start();
        break;
      case "heart_trail":
      case "star_gust":
        Animated.parallel([
          timing(driftX, -20, 360),
          pulse(0.94, 1.1),
        ]).start(() =>
          driftX.setValue(0)
        );
        break;
      case "sleepy_tilt":
        Animated.sequence([
          timing(tilt, 0.8, 260),
          Animated.delay(220),
          timing(tilt, 0, 260),
        ]).start();
        break;
      case "yawn":
        Animated.sequence([
          timing(scale, 0.84, 240),
          timing(scale, 1.12, 260),
          timing(scale, 1, 220),
        ]).start();
        break;
      case "curl_up":
        Animated.parallel([
          Animated.sequence([
            timing(scale, 0.72, 260),
            Animated.delay(330),
            timing(scale, 1, 280),
          ]),
          Animated.sequence([
            timing(tilt, 0.85, 260),
            Animated.delay(330),
            timing(tilt, 0, 280),
          ]),
        ]).start();
        break;
      case "star_puff":
        pulse(0.78, 1.24).start();
        break;
      case "compress":
        pulse(0.67, 1.2).start();
        break;
      case "shake":
        wiggle(9, 4).start();
        break;
      case "star_burst":
        Animated.parallel([
          pulse(0.64, 1.28),
          wiggle(8, 3),
        ]).start();
        break;
      case "star_arc":
        Animated.parallel([
          timing(driftX, -25, 400),
          hopSequence(14),
        ]).start(() =>
          driftX.setValue(0)
        );
        break;
      case "star_toss":
      case "target_toss":
        Animated.parallel([
          spin(350),
          timing(
            driftX,
            animation === "target_toss"
              ? -34
              : -24,
            360
          ),
          hopSequence(
            animation === "target_toss"
              ? 20
              : 13
          ),
        ]).start(() =>
          driftX.setValue(0)
        );
        break;
      case "party_shimmy":
        wiggle(10, 4).start();
        break;
      case "victory_dance":
        Animated.parallel([
          hopSequence(18, 2),
          wiggle(7, 4),
          pulse(0.92, 1.12),
        ]).start();
        break;
      case "neon_dance":
        Animated.parallel([
          wiggle(8, 3),
          pulse(0.88, 1.16),
        ]).start();
        break;
      case "light_show":
        Animated.parallel([
          spin(700),
          pulse(0.82, 1.24),
          wiggle(5, 4),
        ]).start();
        break;
      case "coin_toss":
        hopSequence(23).start();
        break;
      case "coin_rain":
        Animated.parallel([
          hopSequence(18),
          spin(420),
        ]).start();
        break;
      case "reading_pose":
        Animated.sequence([
          timing(scale, 0.9, 220),
          timing(tilt, 0.35, 180),
          Animated.delay(420),
          timing(tilt, 0, 180),
          timing(scale, 1, 200),
        ]).start();
        break;
      default:
        pulse().start();
        break;
    }
  };

  const friendshipResultText = (
    result: CompanionInteractionResult
  ): string => {
    if (result.maxed) {
      return "Bonded friendship is already at maximum. 💜";
    }

    if (result.dailyCapReached) {
      return "Friendship XP is full for today—our reactions still work, and we can earn more tomorrow.";
    }

    if (result.leveledUp) {
      const reward =
        profileRef.current?.levels[
          result.level - 1
        ];

      return `Friendship Level ${result.level}: ${
        reward?.title || "New reward"
      } unlocked!`;
    }

    return result.awardedPoints > 0
      ? `Friendship +${result.awardedPoints}`
      : "";
  };

  const handleSingleTap = async () => {
    const currentProfile =
      profileRef.current;
    const companion = activeRef.current;

    if (!currentProfile || !companion) {
      const legendary =
        legendaryPresentationRef.current;

      clickModeRef.current =
        (clickModeRef.current + 1) % 5;

      const mode = clickModeRef.current;

      if (legendary) {
        const legendaryAnimations:
          CompanionAnimationKey[] = [
            legendary.powerAnimation,
            "big_hop",
            "victory_dance",
            "light_show",
            "party_spin",
          ];

        performAnimation(
          legendaryAnimations[
            mode %
              legendaryAnimations.length
          ]
        );

        showSpeech(
          legendary.tapLines[
            mode %
              legendary.tapLines.length
          ],
          "tap",
          2900
        );

        try {
          if (Platform.OS !== "web") {
            void Haptics.impactAsync(
              Haptics
                .ImpactFeedbackStyle
                .Medium
            );
          }
        } catch {}
      } else if (mode === 0) {
        performAnimation("happy_bounce");
      } else if (mode === 1) {
        performAnimation("big_hop");
      } else if (mode === 2) {
        performAnimation("party_spin");
      } else if (mode === 3) {
        performAnimation("party_shimmy");
      } else {
        performAnimation("heart_twirl");
      }

      setLegendEffectKey(
        (key) => key + 1
      );
      return;
    }

    const result =
      await recordInteractionRef.current(
        currentProfile.id,
        "tap"
      );
    const effectivePoints =
      result.points;
    const currentReward =
      latestUnlockedReward(
        currentProfile,
        result.level
      );
    const animations =
      getUnlockedAnimations(
        currentProfile.id,
        effectivePoints
      ).filter(
        (animation) =>
          animation !== "gentle_bob"
      );
    const animation =
      randomLine(animations as string[]) as
        | CompanionAnimationKey
        | "";

    const chosenAnimation =
      animation ||
      currentReward.animations[0] ||
      "happy_bounce";
    const lines = getUnlockedDialogue(
      currentProfile.id,
      effectivePoints,
      "tap"
    );
    const companionLine =
      randomLine(lines);
    const resultLine =
      friendshipResultText(result);

    performAnimation(chosenAnimation);
    triggerBurst(
      getTapBurstIcons(
        currentProfile.id,
        effectivePoints
      ),
      chosenAnimation
    );

    showSpeech(
      [companionLine, resultLine]
        .filter(Boolean)
        .join("\n"),
      "tap",
      result.leveledUp ? 3900 : 3000
    );
  };

  const handleDoubleTap = async () => {
    const currentProfile =
      profileRef.current;

    if (!currentProfile) {
      await handleSingleTap();
      return;
    }

    const currentPoints =
      pointsRef.current;
    const currentLevel =
      getFriendshipProgress(
        currentPoints
      ).level;
    const specialReward =
      unlockedDoubleTapReward(
        currentProfile,
        currentLevel
      );

    if (!specialReward) {
      await handleSingleTap();
      return;
    }

    const result =
      await recordInteractionRef.current(
        currentProfile.id,
        "tap"
      );
    const animation =
      specialReward.animations[
        specialReward.animations.length - 1
      ] || "happy_bounce";
    const lines =
      specialReward.dialogue.tap ?? [];
    const resultLine =
      friendshipResultText(result);

    performAnimation(animation);
    triggerBurst(
      specialReward.tapBurstIcons,
      animation
    );

    showSpeech(
      [
        randomLine(lines),
        specialReward.specialInteraction
          ?.title,
        resultLine,
      ]
        .filter(Boolean)
        .join("\n"),
      "tap",
      result.leveledUp ? 4100 : 3300
    );
  };

  const handlePet = async () => {
    const currentProfile =
      profileRef.current;

    if (!currentProfile) return;

    try {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success
        );
      }
    } catch {}

    const result =
      await recordInteractionRef.current(
        currentProfile.id,
        "pet"
      );
    const lines = getUnlockedDialogue(
      currentProfile.id,
      result.points,
      "pet"
    );
    const resultLine =
      friendshipResultText(result);

    performAnimation("heart_pulse");
    triggerBurst(
      ["💜", "🩷", "💙", "❤️", "💜"],
      "heart_trail"
    );

    showSpeech(
      [randomLine(lines), resultLine]
        .filter(Boolean)
        .join("\n"),
      "pet",
      result.leveledUp ? 4100 : 3300
    );
  };

  const reactToActivity = async (
    activity: CompanionActivityKey,
    award: boolean
  ) => {
    const currentProfile =
      profileRef.current;

    if (!currentProfile) return;

    const beforePoints =
      pointsRef.current;
    const result = award
      ? await recordActivityRef.current(
          currentProfile.id,
          activity
        )
      : {
          points: beforePoints,
          level:
            getFriendshipProgress(
              beforePoints
            ).level,
          leveledUp: false,
          awardedPoints: 0,
          dailyCapReached: false,
          maxed:
            beforePoints >= 120,
          nextLevelAt:
            getFriendshipProgress(
              beforePoints
            ).nextLevelAt,
        };

    const lines = getUnlockedDialogue(
      currentProfile.id,
      result.points,
      "idle",
      activity
    );

    if (!lines.length) {
      if (
        award &&
        result.awardedPoints > 0
      ) {
        showSpeech(
          `${activityLabel(
            activity
          )} together · Friendship +${
            result.awardedPoints
          }`,
          "activity",
          2400
        );
      }

      return;
    }

    const reward =
      latestUnlockedReward(
        currentProfile,
        result.level
      );
    const animation =
      reward.animations[
        reward.animations.length - 1
      ] || "happy_bounce";
    const resultLine =
      friendshipResultText(result);

    performAnimation(animation);
    triggerBurst(
      reward.tapBurstIcons,
      animation
    );

    showSpeech(
      [randomLine(lines), resultLine]
        .filter(Boolean)
        .join("\n"),
      "activity",
      result.leveledUp ? 4200 : 3200
    );
  };

  const triggerLegendaryPower = (
    activity: CompanionActivityKey
  ) => {
    const companion =
      activeRef.current;
    const presentation =
      legendaryPresentationRef.current;

    if (!companion || !presentation) {
      return;
    }

    const abilityType =
      companion?.ability?.type;

    const shouldActivate =
      abilityType ===
        "global_coin_multiplier" ||
      (abilityType ===
        "achievement_reward_bonus" &&
        activity === "achievements") ||
      (abilityType ===
        "quiz_time_bonus" &&
        activity === "quiz") ||
      (abilityType ===
        "streak_milestone_bonus" &&
        activity === "daily_login") ||
      (abilityType ===
        "streak_shield" &&
        activity === "daily_login") ||
      (abilityType ===
        "quiz_certificate_bonus" &&
        activity === "quiz");

    if (!shouldActivate) return;

    performAnimation(
      presentation.powerAnimation
    );
    setLegendEffectKey(
      (key) => key + 1
    );
    showSpeech(
      presentation.activationLine,
      "activity",
      3300
    );

    try {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success
        );
      }
    } catch {}
  };

  legendaryPowerHandlerRef.current =
    triggerLegendaryPower;

  activityHandlerRef.current = (
    activity,
    award
  ) => {
    void reactToActivity(
      activity,
      award
    );
  };

  const queueTap = () => {
    const currentProfile =
      profileRef.current;

    if (!currentProfile) {
      void handleSingleTap();
      return;
    }

    const now = Date.now();
    const currentLevel =
      getFriendshipProgress(
        pointsRef.current
      ).level;
    const hasDoubleTap =
      !!unlockedDoubleTapReward(
        currentProfile,
        currentLevel
      );

    if (
      hasDoubleTap &&
      now - lastTapAtRef.current <= 310
    ) {
      lastTapAtRef.current = 0;

      if (singleTapTimerRef.current) {
        clearTimeout(
          singleTapTimerRef.current
        );
        singleTapTimerRef.current = null;
      }

      void handleDoubleTap();
      return;
    }

    lastTapAtRef.current = now;

    if (!hasDoubleTap) {
      void handleSingleTap();
      return;
    }

    singleTapTimerRef.current =
      setTimeout(() => {
        singleTapTimerRef.current = null;
        void handleSingleTap();
      }, 315);
  };

  useEffect(() => {
    bob.stopAnimation();
    bob.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: isLegendary
            ? -10
            : -6,
          duration: isLegendary
            ? 1450
            : 900,
          easing: Easing.inOut(
            Easing.sin
          ),
          useNativeDriver: false,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: isLegendary
            ? 1450
            : 900,
          easing: Easing.inOut(
            Easing.sin
          ),
          useNativeDriver: false,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [bob, isLegendary]);

  useEffect(() => {
    if (!activeCompanion) {
      setSpeech(null);
      setFriendshipOpen(false);
      legendaryEntrance.setValue(1);
      return;
    }

    const effect =
      getCompanionEffect(activeId);
    setLegendEffect(effect);
    setLegendEffectKey(
      (key) => key + 1
    );
    setSpeech(null);
    setFriendshipOpen(false);
    speechVisibleRef.current = false;

    if (legendaryPresentation) {
      legendaryEntrance.setValue(0);

      Animated.spring(
        legendaryEntrance,
        {
          toValue: 1,
          friction: 5,
          tension: 72,
          useNativeDriver: false,
        }
      ).start();

      const timer = setTimeout(() => {
        performAnimation(
          legendaryPresentation
            .powerAnimation
        );
        setLegendEffectKey(
          (key) => key + 1
        );
        showSpeech(
          legendaryPresentation
            .arrivalLine,
          "idle",
          4100
        );

        try {
          if (Platform.OS !== "web") {
            void Haptics.notificationAsync(
              Haptics
                .NotificationFeedbackType
                .Success
            );
          }
        } catch {}
      }, 360);

      return () => clearTimeout(timer);
    }

    legendaryEntrance.setValue(1);

    if (profile) {
      const timer = setTimeout(() => {
        showSpeech(
          `Friendship Level ${
            getFriendshipProgress(
              getFriendshipPoints(
                profile.id
              )
            ).level
          }. Tap me, hold to pet me, or tap my friendship badge.`,
          "idle",
          3900
        );
      }, 850);

      return () => clearTimeout(timer);
    }
  }, [
    activeCompanion,
    activeId,
    getFriendshipPoints,
    legendaryEntrance,
    legendaryPresentation,
    profile,
  ]);

  useEffect(() => {
    if (!profile) return;

    let cancelled = false;
    let timer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const schedule = () => {
      timer = setTimeout(() => {
        if (
          !cancelled &&
          !draggingRef.current &&
          !speechVisibleRef.current
        ) {
          const idleLines =
            getUnlockedDialogue(
              profile.id,
              pointsRef.current,
              "idle"
            );
          const animations =
            getUnlockedAnimations(
              profile.id,
              pointsRef.current
            ).filter(
              (animation) =>
                animation !== "gentle_bob"
            );
          const animation =
            (randomLine(
              animations as string[]
            ) as CompanionAnimationKey) ||
            "gentle_bob";

          showSpeech(
            randomLine(idleLines),
            "idle",
            2600
          );
          performAnimation(animation);
        }

        if (!cancelled) schedule();
      }, 43000 + Math.floor(Math.random() * 27000));
    };

    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [profile, friendshipPoints]);

  useEffect(() => {
    const activitySub =
      DeviceEventEmitter.addListener(
        COMPANION_ACTIVITY_EVENT,
        (payload: {
          activity?: CompanionActivityKey;
        }) => {
          if (payload?.activity) {
            activityHandlerRef.current(
              payload.activity,
              true
            );
            legendaryPowerHandlerRef.current(
              payload.activity
            );
          }
        }
      );

    const purchaseSub =
      DeviceEventEmitter.addListener(
        SHOP_PURCHASE_COMPLETED_EVENT,
        () => {
          activityHandlerRef.current(
            "shop_purchase",
            true
          );
        }
      );

    let achievementSubscription: any =
      null;
    let achievementHandler:
      | ((payload: any) => void)
      | null = null;

    if (AchieveEmitter) {
      achievementHandler = (
        payload: any
      ) => {
        activityHandlerRef.current(
          "achievements",
          true
        );
        legendaryPowerHandlerRef.current(
          "achievements"
        );

        if (
          Number(payload?.coins) > 0
        ) {
          activityHandlerRef.current(
            "coins_earned",
            false
          );
        }
      };

      if (
        typeof (AchieveEmitter as any)
          .addListener === "function"
      ) {
        achievementSubscription = (
          AchieveEmitter as any
        ).addListener(
          "celebrate",
          achievementHandler
        );
      } else if (
        typeof (AchieveEmitter as any).on ===
        "function"
      ) {
        (AchieveEmitter as any).on(
          "celebrate",
          achievementHandler
        );
      }
    }

    return () => {
      activitySub.remove();
      purchaseSub.remove();

      if (
        achievementSubscription?.remove
      ) {
        achievementSubscription.remove();
      } else if (
        achievementHandler &&
        typeof (AchieveEmitter as any)
          ?.off === "function"
      ) {
        (AchieveEmitter as any).off(
          "celebrate",
          achievementHandler
        );
      }
    };
  }, []);

  useEffect(() => {
    const activity:
      | CompanionActivityKey
      | null = pathname.includes(
      "/flashcards"
    )
      ? "flashcards"
      : pathname.includes("/collections")
      ? "collections"
      : pathname.includes("/relax")
      ? "relax"
      : null;

    if (!activity) return;

    const timer = setTimeout(() => {
      activityHandlerRef.current(
        activity,
        false
      );
    }, 700);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    return () => {
      clearSpeechTimer();

      if (longPressTimerRef.current) {
        clearTimeout(
          longPressTimerRef.current
        );
      }

      if (singleTapTimerRef.current) {
        clearTimeout(
          singleTapTimerRef.current
        );
      }
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:
        () => true,
      onMoveShouldSetPanResponder:
        () => true,

      onPanResponderGrant: () => {
        tapCandidateRef.current = true;
        draggingRef.current = false;
        longPressTriggeredRef.current =
          false;

        if (longPressTimerRef.current) {
          clearTimeout(
            longPressTimerRef.current
          );
        }

        if (profileRef.current) {
          longPressTimerRef.current =
            setTimeout(() => {
              longPressTriggeredRef.current =
                true;
              tapCandidateRef.current = false;
              void handlePet();
            }, 560);
        }
      },

      onPanResponderMove: (
        _event,
        gesture
      ) => {
        if (
          Math.abs(gesture.dx) > 8 ||
          Math.abs(gesture.dy) > 8
        ) {
          tapCandidateRef.current = false;
          draggingRef.current = true;

          if (
            longPressTimerRef.current
          ) {
            clearTimeout(
              longPressTimerRef.current
            );
            longPressTimerRef.current =
              null;
          }
        }

        pan.setValue({
          x:
            offsetRef.current.x +
            gesture.dx,
          y:
            offsetRef.current.y +
            gesture.dy,
        });
      },

      onPanResponderRelease: () => {
        if (longPressTimerRef.current) {
          clearTimeout(
            longPressTimerRef.current
          );
          longPressTimerRef.current = null;
        }

        if (
          tapCandidateRef.current &&
          !longPressTriggeredRef.current
        ) {
          try {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(
                Haptics
                  .ImpactFeedbackStyle
                  .Light
              );
            }
          } catch {}

          queueTap();
        } else if (
          draggingRef.current
        ) {
          const current:
            | { x: number; y: number }
            | undefined = (
            pan as any
          ).__getValue?.();

          if (current) {
            offsetRef.current = current;
          }
        }

        draggingRef.current = false;
        longPressTriggeredRef.current =
          false;
      },

      onPanResponderTerminate: () => {
        if (longPressTimerRef.current) {
          clearTimeout(
            longPressTimerRef.current
          );
          longPressTimerRef.current = null;
        }

        draggingRef.current = false;
        longPressTriggeredRef.current =
          false;
      },

      onPanResponderTerminationRequest:
        () => false,
    })
  ).current;

  if (!activeCompanion) return null;

  const speechAccent =
    legendaryPresentation?.accent ||
    (speechKind === "pet"
      ? "#f472b6"
      : speechKind === "activity"
      ? "#facc15"
      : speechKind === "idle"
      ? "#a78bfa"
      : profile?.accent || "#22d3ee");

  const legendaryEntranceScale =
    legendaryEntrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0.34, 1],
    });

  const legendaryEntranceOpacity =
    legendaryEntrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  return (
    <>
      <Animated.View
        style={[
          S.companionWrap,
          isLegendary &&
            S.legendaryCompanionWrap,
          {
            opacity: isLegendary
              ? legendaryEntranceOpacity
              : 1,
            transform: [
              {
                translateX: Animated.add(
                  Animated.add(
                    pan.x,
                    shake
                  ),
                  driftX
                ),
              },
              {
                translateY: Animated.add(
                  Animated.add(
                    bob,
                    pan.y
                  ),
                  hop
                ),
              },
              { scale },
              {
                scale: isLegendary
                  ? legendaryEntranceScale
                  : 1,
              },
              { rotate: rotation },
              {
                rotate: tiltRotation,
              },
            ],
          },
        ]}
      >
        {(profile || isLegendary) &&
        speech ? (
          <View
            pointerEvents="none"
            style={[
              S.companionSpeechBubble,
              isLegendary &&
                S.legendarySpeechBubble,
              {
                borderColor:
                  speechAccent,
                shadowColor:
                  speechAccent,
              },
            ]}
          >
            <Text
              style={[
                S.companionSpeechTitle,
                {
                  color: speechAccent,
                },
              ]}
            >
              {profile
                ? `${profile.shortLabel} · ${friendshipProgress.stage}`
                : `LEGENDARY · ${
                    legendaryPresentation
                      ?.title ||
                    activeCompanion.title
                  }`}
            </Text>
            <Text
              style={
                S.companionSpeechText
              }
            >
              {speech}
            </Text>
            <View
              style={[
                S.companionSpeechArrow,
                {
                  borderTopColor:
                    speechAccent,
                },
              ]}
            />
          </View>
        ) : null}

        <View
          {...panResponder.panHandlers}
          style={[
            S.companionDragTarget,
            isLegendary &&
              S.legendaryDragTarget,
          ]}
        >
          <View
            style={[
              S.companionBadge,
              isLegendary &&
                S.legendaryCompanionBadge,
              legendaryPresentation
                ? {
                    borderColor:
                      legendaryPresentation
                        .accent,
                    backgroundColor:
                      legendaryPresentation
                        .background,
                    shadowColor:
                      legendaryPresentation
                        .accent,
                  }
                : null,
            ]}
          >
            {legendaryPresentation ? (
              <LegendaryAura
                presentation={
                  legendaryPresentation
                }
                activationKey={
                  legendEffectKey
                }
              />
            ) : null}

            <View
              pointerEvents="none"
              style={
                StyleSheet.absoluteFillObject
              }
            >
              {profile ? (
                <CompanionIconBurst
                  icons={burstIcons}
                  burstKey={burstKey}
                  animation={
                    burstAnimation
                  }
                />
              ) : (
                <CompanionEffectOverlay
                  type={legendEffect}
                  effectKey={
                    legendEffectKey
                  }
                />
              )}
            </View>

            <View
              style={[
                S.companionPortraitMask,
                isLegendary &&
                  S.legendaryCompanionPortraitMask,
              ]}
            >
              <Image
                source={
                  (activeCompanion as any)
                    .image
                }
                style={[
                  S.companionImage,
                  isLegendary &&
                    S.legendaryCompanionImage,
                ]}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {legendaryPresentation ? (
          <View
            pointerEvents="none"
            style={[
              S.legendaryStatusPill,
              {
                borderColor:
                  legendaryPresentation
                    .accent,
                shadowColor:
                  legendaryPresentation
                    .accent,
                backgroundColor:
                  legendaryPresentation
                    .background,
              },
            ]}
          >
            <Text
              style={[
                S.legendaryStatusTitle,
                {
                  color:
                    legendaryPresentation
                      .secondary,
                },
              ]}
            >
              ✦ LEGENDARY ·{" "}
              {
                legendaryPresentation
                  .title
              }
            </Text>
            <Text
              style={
                S.legendaryStatusAbility
              }
              numberOfLines={1}
            >
              {
                legendaryPresentation
                  .abilityLabel
              }
            </Text>
          </View>
        ) : null}

        {profile ? (
          <Pressable
            onPress={() =>
              setFriendshipOpen(true)
            }
            style={({ pressed }) => [
              S.companionFriendshipBadge,
              {
                borderColor:
                  profile.accent,
                opacity: pressed
                  ? 0.72
                  : 1,
              },
            ]}
            hitSlop={8}
          >
            <Text
              style={
                S.companionFriendshipText
              }
            >
              {profile.friendshipEmoji}{" "}
              {friendshipProgress.level}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {profile ? (
        <FriendshipProgressModal
          visible={friendshipOpen}
          onClose={() =>
            setFriendshipOpen(false)
          }
          profile={profile}
          points={points}
          dailyStatus={dailyStatus}
          image={
            (activeCompanion as any)
              .image
          }
        />
      ) : null}
    </>
  );
}

function AchievementCelebrationOverlay() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!AchieveEmitter) return;

    const handler = (payload: any) => {
      let msg: string;

      if (typeof payload === "string") {
        msg = payload;
      } else if (payload?.message) {
        msg = String(payload.message);
      } else if (payload?.title && payload?.coins != null) {
        msg = `${payload.title} — +${payload.coins} coins`;
      } else if (payload?.title) {
        msg = String(payload.title);
      } else {
        msg = "Achievement unlocked!";
      }

      setMessage(msg);
      setVisible(true);

      const timeout = setTimeout(() => {
        setVisible(false);
      }, 2600);

      return () => clearTimeout(timeout);
    };

    (AchieveEmitter as any).on?.("celebrate", handler);
    (AchieveEmitter as any).addListener?.("celebrate", handler);

    return () => {
      (AchieveEmitter as any).off?.("celebrate", handler);
      (AchieveEmitter as any).removeListener?.("celebrate", handler);
    };
  }, []);

  if (!visible || !message) return null;

  return (
    <View pointerEvents="none" style={S.overlay}>
      <View style={S.toast}>
        <Text style={S.toastText}>{message}</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <GlobalTextDefaults />
      <ToastHost />
      <InnerTabsLayout />
      {Platform.OS === "web" ? <CursorOverlay /> : null}
    </>
  );
}

function InnerTabsLayout() {
  const insets = useSafeAreaInsets();

  /*
   * HeaderBar calculates its own safe-area padding, so a separate hard-coded
   * 56-point offset can be taller than the rendered header and expose a
   * blank strip beneath the cyan divider. Start with a close estimate, then
   * replace it with the HeaderBar's real measured height.
   */
  const estimatedHeaderHeight = useMemo(
    () =>
      (Platform.OS === "web"
        ? 64
        : 44) +
      (insets?.top ?? 0),
    [insets?.top]
  );

  const [
    headerHeight,
    setHeaderHeight,
  ] = useState(
    estimatedHeaderHeight
  );

  useEffect(() => {
    setHeaderHeight(
      estimatedHeaderHeight
    );
  }, [estimatedHeaderHeight]);

  const [p, setP] = useState<Pt>({ x: -1, y: -1 });
  const [down, setDown] = useState(false);

  const { ready } = useUser();

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CURSOR_EQUIPPED_KEY);
        if (cancelled) return;

        if (!stored) {
          await AsyncStorage.setItem(CURSOR_EQUIPPED_KEY, "star");
          if (__DEV__) {
            console.log("[cursor] seeded default cursor.equipped.v1=star");
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.warn("[cursor] error seeding default cursor", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: "#06121a",
      }}
      onTouchStartCapture={
        Platform.OS === "web"
          ? undefined
          : (e) => {
              setDown(true);
              setP({
                x: e.nativeEvent.pageX,
                y: e.nativeEvent.pageY,
              });
            }
      }
      onTouchMoveCapture={
        Platform.OS === "web"
          ? undefined
          : (e) => {
              setP({
                x: e.nativeEvent.pageX,
                y: e.nativeEvent.pageY,
              });
            }
      }
      onTouchEndCapture={
        Platform.OS === "web" ? undefined : () => setDown(false)
      }
      onTouchCancelCapture={
        Platform.OS === "web" ? undefined : () => setDown(false)
      }
    >
      <AchievementCelebrationOverlay />

      <View
        onLayout={(event) => {
          const measuredHeight =
            Math.ceil(
              event.nativeEvent
                .layout.height
            );

          if (
            measuredHeight > 0 &&
            measuredHeight !==
              headerHeight
          ) {
            setHeaderHeight(
              measuredHeight
            );
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor:
            "#06121a",
        }}
      >
        <HeaderBar />
      </View>

      <AchievementsCoinsBridge />
      <AchievementsAutoTracker />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#00e5ff",
          tabBarInactiveTintColor: "rgba(0,229,255,0.7)",
          tabBarStyle: {
            height: 68,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          sceneStyle: {
            backgroundColor: "#000000",
            paddingTop:
              headerHeight,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.5,
          },
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                props.onPress?.(e);
              }}
            />
          ),
        }}
        tabBar={(props) => <ScrollableTabBar {...props} />}
      >
        <Tabs.Screen
          name="ask"
          options={{
            title: "ASK",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="flashcards"
          options={{
            title: "FLASHCARDS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="quiz"
          options={{
            title: "QUIZ",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="help-circle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="brainteasers"
          options={{
            title: "BRAINTEASERS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bulb-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "SHOP",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="bag-handle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: "ACHIEVEMENTS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "HISTORY",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="relax"
          options={{
            title: "RELAX",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="island"
          options={{
            title: "ISLAND",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sunny-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "ACCOUNT",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="person-circle-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="certificates"
          options={{
            title: "CERTIFICATES",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ribbon-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="collections"
          options={{
            title: "COLLECTIONS",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmarks-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="purchases"
          options={{
            title: "PURCHASES",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bag" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <FxOverlay />
        {Platform.OS === "web" ? <StarTrailOverlay /> : null}
        {Platform.OS !== "web" ? (
          <TouchCursorOverlay p={p} down={down} />
        ) : null}
        <FloatingCompanionOverlay />
      </View>
    </View>
  );
}

export const S = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "ios" ? 96 : 88,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    minWidth: 240,
    maxWidth: 340,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.7)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: "rgba(0,12,20,0.88)",
  },
  toastText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  closeBtn: { position: "absolute", right: 10, top: 6, padding: 4 },
  closeText: { color: "white", fontSize: 22, lineHeight: 22 },

  companionWrap: {
    position: "absolute",
    right: 16,
    bottom: Platform.OS === "web" ? 96 : 88,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
  },
  legendaryCompanionWrap: {
    right: 18,
    bottom:
      Platform.OS === "web"
        ? 132
        : 122,
  },
  companionBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 8, 20, 0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(0,229,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    overflow: "visible",
  },
  legendaryCompanionBadge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    shadowOpacity: 0.9,
    shadowRadius: 25,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 18,
  },
  companionPortraitMask: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,8,20,0.96)",
  },
  legendaryCompanionPortraitMask: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(2,6,23,0.98)",
  },
  companionImage: {
    width: "100%",
    height: "100%",
  },
  legendaryCompanionImage: {
    width: "100%",
    height: "100%",
  },
  companionDragTarget: {
    width: 64,
    height: 64,
  },
  legendaryDragTarget: {
    width: 86,
    height: 86,
  },
  legendaryAuraRoot: {
    position: "absolute",
    left: -15,
    top: -15,
    width: 116,
    height: 116,
    alignItems: "center",
    justifyContent: "center",
  },
  legendaryAuraGlow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  legendaryOrbitRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  legendaryInnerRing: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderStyle: "dotted",
  },
  legendaryOrbitDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 0.95,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 12,
  },
  legendaryOrbitDotTop: {
    left: "50%",
    top: -4,
    marginLeft: -3.5,
  },
  legendaryOrbitDotBottom: {
    left: "50%",
    bottom: -4,
    marginLeft: -3.5,
  },
  legendaryAuraEmblem: {
    position: "absolute",
    right: 5,
    top: 11,
    fontSize: 17,
    fontWeight: "900",
    textShadowColor:
      "rgba(255,255,255,0.7)",
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 8,
  },
  legendaryStatusPill: {
    position: "absolute",
    top: 94,
    right: -8,
    minWidth: 174,
    maxWidth: 210,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowOpacity: 0.72,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 15,
  },
  legendaryStatusTitle: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.65,
  },
  legendaryStatusAbility: {
    color: "#F8FAFC",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  companionSpeechBubble: {
    position: "absolute",
    right: 0,
    bottom: 80,
    width: 232,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(2,8,23,0.97)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.46,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  legendarySpeechBubble: {
    bottom: 122,
    width: 250,
    borderWidth: 2,
    shadowOpacity: 0.72,
    shadowRadius: 18,
    elevation: 16,
  },
  companionSpeechTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  companionSpeechText: {
    color: "#f8fafc",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  companionSpeechArrow: {
    position: "absolute",
    right: 20,
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  companionFriendshipBadge: {
    position: "absolute",
    right: -10,
    bottom: -10,
    minWidth: 39,
    height: 25,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "rgba(30,5,38,0.98)",
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f472b6",
    shadowOpacity: 0.54,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  companionFriendshipText: {
    color: "#fdf4ff",
    fontSize: 10,
    fontWeight: "900",
  },
  friendshipModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "center",
    padding: 18,
    zIndex: 20000,
  },
  friendshipModalCard: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "88%",
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: "rgba(2,8,23,0.99)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  friendshipModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 13,
  },
  friendshipPortrait: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "rgba(15,23,42,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  friendshipPortraitImage: {
    width: 50,
    height: 50,
  },
  friendshipModalEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
  friendshipModalTitle: {
    color: "#f8fafc",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },
  friendshipModalPersonality: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  friendshipProgressCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(15,23,42,0.72)",
    padding: 12,
    marginBottom: 10,
  },
  friendshipProgressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  friendshipProgressLabel: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "900",
  },
  friendshipProgressValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  friendshipProgressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(30,41,59,0.95)",
    marginTop: 9,
  },
  friendshipProgressFill: {
    height: "100%",
    minWidth: 4,
    borderRadius: 999,
  },
  friendshipDailyText: {
    color: "#94a3b8",
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 8,
  },
  friendshipNextCard: {
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: "rgba(30,27,75,0.34)",
    padding: 12,
    marginBottom: 10,
  },
  friendshipNextEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  friendshipNextTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  friendshipNextDescription: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  friendshipRewardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    marginBottom: 8,
  },
  friendshipRewardLevel: {
    width: 31,
    height: 31,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  friendshipRewardLevelText: {
    fontSize: 12,
    fontWeight: "900",
  },
  friendshipRewardTitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
  friendshipRewardDescription: {
    color: "#94a3b8",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  friendshipRewardBonus: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  companionLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#e8fbff",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});