import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";

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

type FloatingCompanionOverlayProps = {
  /** Whether the floating companion should be visible at all */
  visible?: boolean;
  /** Optional full companion object (we'll read id/title/image from it). */
  companion?: {
    id?: string;
    title?: string;
    image?: any;
  } | null;
  /** Or just an id if you're not passing the full object. */
  companionId?: string | null;
  /** Optional image override if you want to pass a require(...) directly. */
  image?: any;
  /** Optional title override label. */
  label?: string;
  /** Initial X/Y position; defaults to bottom-right area. */
  startX?: number;
  startY?: number;
  /** Size of the bubble in px; default 80. */
  size?: number;
  /** Optional callback when tapped (on top of animation). */
  onPress?: () => void;
};

/* -------------------------------------------------------------------------- */
/*                         Effect helpers + components                        */
/* -------------------------------------------------------------------------- */

function inferEffectFromId(idRaw: string | null | undefined): CompanionEffectType {
  if (!idRaw) return "hearts";
  const id = String(idRaw).toLowerCase();

  // Legendary companions
  if (id.includes("chrono_fox") || id.includes("chrono-fox")) return "legend_fire";
  if (id.includes("mecha_owl") || id.includes("mecha-owl")) return "legend_lightning";
  if (id.includes("celestra")) return "legend_bubbles";
  if (id.includes("astral_nova") || id.includes("astral-nova")) return "legend_sparkles";
  if (id.includes("aetherwyrm")) return "legend_spiral";
  if (id.includes("axolotl_oracle") || id.includes("axolotl-oracle")) return "shield";

  // Party-esque names can be wired later to party_confetti / party_streamers
  if (id.includes("party")) return "party_confetti";

  // Fallback
  return "hearts";
}

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

  /* ------------------------- Axolotl shield aura ------------------------- */
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

  /* --------------------- Chrono Fox: fire tongues + embers --------------------- */
  if (type === "legend_fire") {
    const animTongue = anim;
    const tongues = [0, 1, 2, 3, 4, 5, 6];
    const embers = [0, 1, 2, 3];

    return (
      <>
        {/* tongues */}
        {tongues.map((idx) => {
          const baseHeight = 50 + idx * 4;
          const baseWidth = 12 + (idx % 3) * 2;
          const offsetX = (idx - tongues.length / 2) * 6;

          const translateY = animTongue.interpolate({
            inputRange: [0, 1],
            outputRange: [8, -baseHeight - 16],
          });

          const scaleY = animTongue.interpolate({
            inputRange: [0, 0.4, 0.8, 1],
            outputRange: [0.4, 1.2, 0.9, 0.5],
          });

          const opacity = animTongue.interpolate({
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

        {/* embers */}
        {embers.map((idx) => {
          const size = 6 + (idx % 2) * 2;
          const baseRadius = 40 + idx * 8;
          const angle = (idx / embers.length) * Math.PI * 2;

          const translateX = animTongue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.cos(angle) * baseRadius],
          });
          const translateY = animTongue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -Math.sin(angle) * baseRadius - 30],
          });
          const opacity = animTongue.interpolate({
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

  /* ----------------------- Mecha Owl: lightning FX ----------------------- */
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

  /* -------------------------- Celestra: bubbles -------------------------- */
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

  /* ------------------------ Astral Nova: sparkles ------------------------ */
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

  /* ------------------------ Aetherwyrm: spirals ------------------------- */
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

  /* -------------------------- Default emoji bursts ------------------------ */
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

        const fontSize =
          type === "books" ? 22 : type === "fire" ? 28 : 26;

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

/* -------------------------------------------------------------------------- */
/*                         FloatingCompanionOverlay UI                        */
/* -------------------------------------------------------------------------- */

export default function FloatingCompanionOverlay(
  props: FloatingCompanionOverlayProps
) {
  const {
    visible = true,
    companion,
    companionId,
    image,
    label,
    startX,
    startY,
    size = 80,
    onPress,
  } = props;

  const { tokens } = useTheme();
  const windowDims = Dimensions.get("window");

  const resolvedId =
    companion?.id ?? companionId ?? (companion as any)?.companionId ?? null;
  const resolvedLabel =
    label ??
    companion?.title ??
    (resolvedId ? resolvedId.replace(/^companion:/, "") : "Companion");

  const imageSource = image ?? companion?.image ?? (companion as any)?.src ?? null;

  const [effectKey, setEffectKey] = useState(0);
  const [effectType, setEffectType] = useState<CompanionEffectType>(
    inferEffectFromId(resolvedId)
  );

  const baseX = useRef(
    startX ?? windowDims.width - size - 16
  ).current;
  const baseY = useRef(
    startY ?? windowDims.height - size - 160
  ).current;

  const [pos, setPos] = useState({ x: baseX, y: baseY });

  const floatScale = useRef(new Animated.Value(1)).current;
  const floatHop = useRef(new Animated.Value(0)).current;
  const floatShake = useRef(new Animated.Value(0)).current;
  const floatRotate = useRef(new Animated.Value(0)).current;

  const floatRotation = floatRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const clickModeRef = useRef(0);

  useEffect(() => {
    // Update effect type whenever id changes
    setEffectType(inferEffectFromId(resolvedId));
  }, [resolvedId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        const newX = baseX + gesture.dx;
        const newY = baseY + gesture.dy;
        setPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (_evt, gesture) => {
        const minX = 8;
        const maxX = windowDims.width - size - 8;
        const minY = 60;
        const maxY = windowDims.height - size - 40;

        let newX = baseX + gesture.dx;
        let newY = baseY + gesture.dy;

        newX = Math.min(Math.max(newX, minX), maxX);
        newY = Math.min(Math.max(newY, minY), maxY);

        (baseX as any).current = newX;
        (baseY as any).current = newY;
        setPos({ x: newX, y: newY });
      },
    })
  ).current;

  const runClickAnimation = () => {
    Haptics.selectionAsync().catch(() => {});

    const mode = clickModeRef.current % 4;
    clickModeRef.current += 1;

    setEffectKey((k) => k + 1);

    if (mode === 0) {
      // hop
      floatHop.setValue(0);
      Animated.sequence([
        Animated.timing(floatHop, {
          toValue: -18,
          duration: 130,
          useNativeDriver: false,
        }),
        Animated.spring(floatHop, {
          toValue: 0,
          friction: 4,
          tension: 60,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (mode === 1) {
      // wiggle
      floatShake.setValue(0);
      Animated.sequence([
        Animated.timing(floatShake, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }),
        Animated.timing(floatShake, {
          toValue: 0,
          duration: 220,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (mode === 2) {
      // spin
      floatRotate.setValue(0);
      Animated.timing(floatRotate, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start(() => {
        floatRotate.setValue(0);
      });
    } else {
      // pulse
      floatScale.setValue(1);
      Animated.sequence([
        Animated.timing(floatScale, {
          toValue: 1.12,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.spring(floatScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: false,
        }),
      ]).start();
    }

    if (onPress) onPress();
  };

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: size,
          height: size,
          transform: [
            { translateY: floatHop },
            {
              rotateZ: floatShake.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "-7deg"],
              }),
            },
            { rotate: floatRotation },
            { scale: floatScale },
          ],
        }}
      >
        <View
          style={{
            position: "absolute",
            left: size / 2,
            top: size / 2,
            width: 0,
            height: 0,
          }}
          pointerEvents="none"
        >
          <CompanionEffectOverlay type={effectType} effectKey={effectKey} />
        </View>

        <Pressable
          onPress={runClickAnimation}
          style={({ pressed }) => [
            styles.bubble,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: tokens.border as any,
              backgroundColor: tokens.isDark
                ? "rgba(15,23,42,0.95)"
                : "rgba(255,255,255,0.96)",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={{
                width: size - 14,
                height: size - 14,
                borderRadius: (size - 14) / 2,
              }}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={{
                color: tokens.text as any,
                fontSize: 12,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {resolvedLabel}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
