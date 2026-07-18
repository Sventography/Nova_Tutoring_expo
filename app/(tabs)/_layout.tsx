// app/(tabs)/_layout.tsx
import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
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

// --------------------
// DEV-ONLY imports
// --------------------
if (__DEV__) {
  try {
    require("../utils/_streak-autoboot");
    require("../utils/streak-achievements-autoboot");
    require("../utils/dev-expose");
    require("../utils/achievements-smoketest");
  } catch {}
}

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

/**
 * Global floating companion bubble that:
 * - Uses the currently equipped companion
 * - Is visible on every tab (shop can show its own if desired)
 * - Bobs gently
 * - Wiggles / hops / spins / shimmies / swirls on tap
 * - Shows the same FX as the Shop tab
 * - Can be dragged by holding and moving your finger
 */
function FloatingCompanionOverlay() {
  const { activeCompanion } = useCompanion();

  const bob = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const floatScale = useRef(new Animated.Value(1)).current;
  const floatHop = useRef(new Animated.Value(0)).current;
  const floatShake = useRef(new Animated.Value(0)).current;
  const floatRotate = useRef(new Animated.Value(0)).current;
  const clickModeRef = useRef(0);

  const rotation = floatRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const [effectType, setEffectType] = useState<CompanionEffectType>("stars");
  const [effectKey, setEffectKey] = useState(0);

  const isTapRef = useRef(true);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -6,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    if (!activeCompanion) {
      setEffectType("stars");
      return;
    }

    const id =
      (activeCompanion as any).canonId ||
      (activeCompanion as any).id ||
      "";
    const eff = getCompanionEffect(id);
    setEffectType(eff);
    setEffectKey((k) => k + 1);
  }, [activeCompanion]);

  function wiggleAction() {
    floatScale.setValue(1);
    Animated.sequence([
      Animated.timing(floatScale, {
        toValue: 1.18,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: 0.95,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: 1.05,
        duration: 110,
        useNativeDriver: false,
      }),
      Animated.timing(floatScale, {
        toValue: 1,
        duration: 110,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function hopAction() {
    floatHop.setValue(0);
    Animated.sequence([
      Animated.timing(floatHop, {
        toValue: -14,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(floatHop, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function spinAction() {
    floatRotate.setValue(0);
    Animated.sequence([
      Animated.timing(floatRotate, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(floatRotate, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function shimmyAction() {
    floatShake.setValue(0);
    Animated.sequence([
      Animated.timing(floatShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: 0.5,
        duration: 60,
        useNativeDriver: false,
      }),
      Animated.timing(floatShake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function swirlAction() {
    floatScale.setValue(1);
    floatRotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(floatScale, {
          toValue: 1.2,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(floatScale, {
          toValue: 0.95,
          duration: 140,
          useNativeDriver: false,
        }),
        Animated.timing(floatScale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(floatRotate, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(floatRotate, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }

  const handleTap = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}

    clickModeRef.current = (clickModeRef.current + 1) % 5;
    const mode = clickModeRef.current;

    switch (mode) {
      case 0:
        wiggleAction();
        break;
      case 1:
        hopAction();
        break;
      case 2:
        spinAction();
        break;
      case 3:
        shimmyAction();
        break;
      case 4:
      default:
        swirlAction();
        break;
    }

    setEffectKey((k) => k + 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isTapRef.current = true;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8) {
          isTapRef.current = false;
        }
        const nx = offsetRef.current.x + gesture.dx;
        const ny = offsetRef.current.y + gesture.dy;
        pan.setValue({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        if (isTapRef.current) {
          handleTap();
        } else {
          const current: { x: number; y: number } =
            (pan as any).__getValue?.() ?? { x: 0, y: 0 };
          offsetRef.current = current;
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  if (!activeCompanion) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        S.companionWrap,
        {
          transform: [
            {
              translateX: Animated.add(pan.x, floatShake),
            },
            {
              translateY: Animated.add(Animated.add(bob, pan.y), floatHop),
            },
            { scale: floatScale },
            { rotate: rotation },
          ],
        },
      ]}
    >
      <View style={S.companionBadge}>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <CompanionEffectOverlay type={effectType} effectKey={effectKey} />
        </View>

        <Image
          source={(activeCompanion as any).image}
          style={S.companionImage}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
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
  const HEADER_HEIGHT = (Platform.OS === "web" ? 64 : 56) + (insets?.top ?? 0);

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
      style={{ flex: 1, position: "relative" }}
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
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
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
            backgroundColor: "transparent",
            paddingTop: HEADER_HEIGHT,
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
  companionImage: {
    width: 48,
    height: 48,
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