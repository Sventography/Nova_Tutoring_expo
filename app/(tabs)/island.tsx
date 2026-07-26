// app/(tabs)/island.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  ISLAND_MILESTONES,
  type IslandMilestone,
  useIsland,
} from "../context/IslandContext";

const XP_SOURCES = [
  {
    key: "quiz",
    label: "Quizzes",
    icon: "help-circle-outline",
    color: "#38bdf8",
  },
  {
    key: "brainteasers",
    label: "Brainteasers",
    icon: "bulb-outline",
    color: "#fbbf24",
  },
  {
    key: "ask",
    label: "Ask Nova",
    icon: "chatbubbles-outline",
    color: "#c084fc",
  },
  {
    key: "login",
    label: "Daily login",
    icon: "calendar-outline",
    color: "#34d399",
  },
] as const;

const STARS = [
  [0.08, 0.11, 2],
  [0.17, 0.28, 3],
  [0.26, 0.08, 2],
  [0.37, 0.18, 2],
  [0.48, 0.09, 3],
  [0.59, 0.24, 2],
  [0.69, 0.12, 2],
  [0.79, 0.26, 3],
  [0.9, 0.12, 2],
  [0.95, 0.35, 2],
] as const;

function Cloud({
  size,
  opacity,
}: {
  size: number;
  opacity: number;
}) {
  return (
    <View style={{ width: size, height: size * 0.45, opacity }}>
      <View
        style={[
          styles.cloud,
          {
            left: 0,
            bottom: 0,
            width: size * 0.48,
            height: size * 0.28,
          },
        ]}
      />
      <View
        style={[
          styles.cloud,
          {
            left: size * 0.24,
            bottom: 0,
            width: size * 0.44,
            height: size * 0.44,
          },
        ]}
      />
      <View
        style={[
          styles.cloud,
          {
            right: 0,
            bottom: 0,
            width: size * 0.52,
            height: size * 0.31,
          },
        ]}
      />
    </View>
  );
}

function IslandScene({
  width,
  level,
  selectedId,
  onSelect,
}: {
  width: number;
  level: number;
  selectedId: string;
  onSelect: (milestone: IslandMilestone) => void;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const cloudOne = useRef(new Animated.Value(-120)).current;
  const cloudTwo = useRef(new Animated.Value(width + 100)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const cloudOneLoop = Animated.loop(
      Animated.timing(cloudOne, {
        toValue: width + 120,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const cloudTwoLoop = Animated.loop(
      Animated.timing(cloudTwo, {
        toValue: -160,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    floatLoop.start();
    pulseLoop.start();
    cloudOneLoop.start();
    cloudTwoLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
      cloudOneLoop.stop();
      cloudTwoLoop.stop();
    };
  }, [cloudOne, cloudTwo, float, pulse, width]);

  const sceneHeight = width >= 560 ? 430 : 380;
  const islandWidth = Math.min(width * 0.82, 500);
  const islandLeft = (width - islandWidth) / 2;
  const grassTop = sceneHeight * 0.49;
  const rockHeight = sceneHeight * 0.34;

  const positions = useMemo(
    () => ({
      study_grove: { left: islandWidth * 0.08, top: grassTop - 31 },
      starlight_garden: { left: islandWidth * 0.22, top: grassTop + 12 },
      nova_library: { left: islandWidth * 0.38, top: grassTop - 42 },
      learning_falls: { left: islandWidth * 0.53, top: grassTop + 16 },
      sky_observatory: { left: islandWidth * 0.68, top: grassTop - 39 },
      companion_habitat: { left: islandWidth * 0.8, top: grassTop + 10 },
    }),
    [grassTop, islandWidth]
  );

  return (
    <View style={[styles.scene, { height: sceneHeight }]}>
      <LinearGradient
        colors={["#07152f", "#0f2f52", "#155e75"]}
        style={StyleSheet.absoluteFill}
      />

      {STARS.map(([x, y, size], index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            left: width * x,
            top: sceneHeight * y,
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: "#f8fafc",
            opacity: 0.78,
          }}
        />
      ))}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 50,
          transform: [{ translateX: cloudOne }],
        }}
      >
        <Cloud size={110} opacity={0.34} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 112,
          transform: [{ translateX: cloudTwo }],
        }}
      >
        <Cloud size={145} opacity={0.22} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          left: islandLeft,
          top: 16,
          width: islandWidth,
          height: sceneHeight - 20,
          transform: [{ translateY: float }],
        }}
      >
        <View
          style={[
            styles.grass,
            {
              top: grassTop,
              width: islandWidth,
              height: islandWidth * 0.27,
              borderRadius: islandWidth,
            },
          ]}
        />

        <View
          style={{
            position: "absolute",
            top: grassTop + islandWidth * 0.18,
            left: islandWidth * 0.12,
            width: 0,
            height: 0,
            borderLeftWidth: islandWidth * 0.38,
            borderRightWidth: islandWidth * 0.38,
            borderTopWidth: rockHeight,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#50362d",
          }}
        />

        <View
          style={{
            position: "absolute",
            top: grassTop + islandWidth * 0.18,
            left: islandWidth * 0.31,
            width: 0,
            height: 0,
            borderLeftWidth: islandWidth * 0.19,
            borderRightWidth: islandWidth * 0.19,
            borderTopWidth: rockHeight * 0.88,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "#6b4a3b",
            opacity: 0.72,
          }}
        />

        {level >= 5 ? (
          <LinearGradient
            colors={["#e0f2fe", "#38bdf8", "rgba(14,116,144,0.2)"]}
            style={{
              position: "absolute",
              top: grassTop + islandWidth * 0.15,
              left: islandWidth * 0.57,
              width: islandWidth * 0.065,
              height: rockHeight * 0.88,
              borderRadius: 999,
            }}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: islandWidth / 2 - 38,
            top: grassTop - 74,
            width: 76,
            height: 76,
            borderRadius: 76,
            backgroundColor: "#22d3ee",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.55],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1.16],
                }),
              },
            ],
          }}
        />

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: islandWidth / 2 - 15,
            top: grassTop - 50,
            width: 0,
            height: 0,
            borderLeftWidth: 15,
            borderRightWidth: 15,
            borderBottomWidth: 36,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "#67e8f9",
            transform: [{ rotate: "180deg" }],
          }}
        />

        {ISLAND_MILESTONES.map((milestone) => {
          const unlocked = level >= milestone.level;
          const selected = selectedId === milestone.id;
          const position =
            positions[milestone.id as keyof typeof positions];

          return (
            <Pressable
              key={milestone.id}
              onPress={() => onSelect(milestone)}
              style={({ pressed }) => [
                styles.landmark,
                {
                  left: position.left,
                  top: position.top,
                  borderColor: selected
                    ? "#f8fafc"
                    : unlocked
                    ? "#67e8f9"
                    : "#64748b",
                  backgroundColor: unlocked
                    ? selected
                      ? "rgba(14,165,233,0.94)"
                      : "rgba(2,132,199,0.84)"
                    : "rgba(15,23,42,0.84)",
                  opacity: unlocked ? 1 : 0.72,
                  transform: [
                    { scale: pressed ? 0.92 : selected ? 1.08 : 1 },
                  ],
                },
              ]}
            >
              <Ionicons
                name={
                  unlocked
                    ? (milestone.icon as any)
                    : "lock-closed"
                }
                color={unlocked ? "#f8fafc" : "#94a3b8"}
                size={17}
              />
              <Text style={styles.landmarkLabel} numberOfLines={1}>
                {unlocked ? milestone.shortTitle : `Lv ${milestone.level}`}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <View style={styles.sceneHint}>
        <Ionicons name="hand-left-outline" color="#bae6fd" size={14} />
        <Text style={styles.sceneHintText}>Tap a landmark to inspect it</Text>
      </View>
    </View>
  );
}

export default function IslandScreen() {
  const { width } = useWindowDimensions();
  const {
    islandLevel,
    islandXp,
    xpToNext,
    progress,
    islandStage,
    nextUnlock,
    loading,
    ready,
    lastGain,
    lastGainReason,
    lastGainToken,
    todayFromQuiz,
    todayFromBrainteasers,
    todayFromAsk,
    todayFromLogin,
    todayFromOther,
    totalToday,
    refreshIsland,
  } = useIsland();

  const contentWidth = Math.min(Math.max(width - 24, 300), 720);

  const latestUnlockedId = useMemo(
    () =>
      [...ISLAND_MILESTONES]
        .reverse()
        .find((milestone) => islandLevel >= milestone.level)?.id ??
      ISLAND_MILESTONES[0].id,
    [islandLevel]
  );

  const [selectedId, setSelectedId] = useState(latestUnlockedId);
  const gainAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedId((current) => {
      const selected = ISLAND_MILESTONES.find(
        (milestone) => milestone.id === current
      );

      return selected && selected.level <= islandLevel
        ? current
        : latestUnlockedId;
    });
  }, [islandLevel, latestUnlockedId]);

  useEffect(() => {
    if (!lastGain || lastGainToken <= 0) return;

    gainAnim.setValue(0);
    Animated.sequence([
      Animated.spring(gainAnim, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.delay(1700),
      Animated.timing(gainAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [gainAnim, lastGain, lastGainToken]);

  const selected =
    ISLAND_MILESTONES.find((milestone) => milestone.id === selectedId) ??
    ISLAND_MILESTONES[0];

  const selectedUnlocked = islandLevel >= selected.level;

  const sourceValues = {
    quiz: todayFromQuiz,
    brainteasers: todayFromBrainteasers,
    ask: todayFromAsk,
    login: todayFromLogin,
  };

  const inspect = (milestone: IslandMilestone) => {
    try {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    } catch {}

    setSelectedId(milestone.id);
  };

  return (
    <LinearGradient
      colors={["#020617", "#07142a", "#03111f"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { width: contentWidth }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>ISLAND FOUNDATION ONLINE</Text>
            </View>
            <Text style={styles.title}>Nova Island</Text>
            <Text style={styles.subtitle}>
              Your real learning is shaping a world in the sky.
            </Text>
          </View>

          <Pressable
            onPress={() => void refreshIsland()}
            disabled={loading}
            style={({ pressed }) => [
              styles.refresh,
              { opacity: loading ? 0.55 : pressed ? 0.72 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#67e8f9" />
            ) : (
              <Ionicons name="refresh" color="#67e8f9" size={20} />
            )}
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.stage}>
                {ready ? islandStage : "Waking your island…"}
              </Text>
              <Text style={styles.level}>Island Level {islandLevel}</Text>
            </View>
            <Text style={styles.xp}>
              {islandXp} / {xpToNext} XP
            </Text>
          </View>

          <View style={styles.track}>
            <LinearGradient
              colors={["#22d3ee", "#38bdf8", "#a78bfa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.fill,
                { width: `${Math.max(0.02, progress) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.nextRow}>
            <Ionicons
              name={nextUnlock ? "lock-open-outline" : "sparkles"}
              color="#bae6fd"
              size={15}
            />
            <Text style={styles.nextText}>
              {nextUnlock
                ? `${nextUnlock.title} awakens at Level ${nextUnlock.level}`
                : "Every foundation landmark is awake"}
            </Text>
          </View>
        </View>

        <View style={styles.sceneCard}>
          <IslandScene
            width={contentWidth - 2}
            level={islandLevel}
            selectedId={selectedId}
            onSelect={inspect}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.gain,
              {
                opacity: gainAnim,
                transform: [
                  {
                    translateY: gainAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                  },
                  {
                    scale: gainAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.86, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="sparkles" color="#fef08a" size={17} />
            <Text style={styles.gainText}>
              +{lastGain} XP{lastGainReason ? ` · ${lastGainReason}` : ""}
            </Text>
          </Animated.View>
        </View>

        <View
          style={[
            styles.detail,
            {
              borderColor: selectedUnlocked
                ? "rgba(103,232,249,0.62)"
                : "rgba(148,163,184,0.42)",
            },
          ]}
        >
          <View style={styles.detailIcon}>
            <Ionicons
              name={
                selectedUnlocked
                  ? (selected.icon as any)
                  : "lock-closed-outline"
              }
              color={selectedUnlocked ? "#67e8f9" : "#94a3b8"}
              size={25}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.detailTitleRow}>
              <Text style={styles.detailTitle}>{selected.title}</Text>
              <View style={styles.statusPill}>
                <Text
                  style={[
                    styles.statusText,
                    { color: selectedUnlocked ? "#6ee7b7" : "#cbd5e1" },
                  ]}
                >
                  {selectedUnlocked ? "AWAKE" : `LEVEL ${selected.level}`}
                </Text>
              </View>
            </View>
            <Text style={styles.detailBody}>{selected.description}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.sectionTitle}>Learning energy</Text>
          </View>
          <View style={styles.totalPill}>
            <Text style={styles.totalText}>+{totalToday} XP</Text>
          </View>
        </View>

        <View style={styles.sourceGrid}>
          {XP_SOURCES.map((source) => {
            const value = sourceValues[source.key];

            return (
              <View
                key={source.key}
                style={[
                  styles.sourceCard,
                  {
                    borderColor:
                      value > 0 ? `${source.color}99` : "#334155",
                  },
                ]}
              >
                <View
                  style={[
                    styles.sourceIcon,
                    { backgroundColor: `${source.color}20` },
                  ]}
                >
                  <Ionicons
                    name={source.icon as any}
                    color={source.color}
                    size={19}
                  />
                </View>
                <Text style={styles.sourceLabel}>{source.label}</Text>
                <Text style={[styles.sourceValue, { color: source.color }]}>
                  +{value}
                </Text>
              </View>
            );
          })}
        </View>

        {todayFromOther > 0 ? (
          <View style={styles.otherRow}>
            <Ionicons name="add-circle-outline" color="#cbd5e1" size={16} />
            <Text style={styles.otherText}>
              Other learning activities: +{todayFromOther} XP
            </Text>
          </View>
        ) : null}

        <View style={styles.roadmap}>
          <Text style={styles.eyebrow}>ISLAND ROADMAP</Text>
          <Text style={styles.roadmapTitle}>The world is ready to grow</Text>
          <Text style={styles.roadmapBody}>
            The Island now has one shared XP engine, persistent progress,
            daily source tracking, responsive landmarks, and safe loading
            states. Buildings, companions, habitats, and XP Surge can now be
            layered onto this foundation.
          </Text>

          <View style={styles.milestones}>
            {ISLAND_MILESTONES.map((milestone) => {
              const unlocked = islandLevel >= milestone.level;

              return (
                <Pressable
                  key={milestone.id}
                  onPress={() => inspect(milestone)}
                  style={({ pressed }) => [
                    styles.milestone,
                    {
                      borderColor: unlocked ? "#67e8f999" : "#334155",
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      unlocked
                        ? (milestone.icon as any)
                        : "lock-closed-outline"
                    }
                    color={unlocked ? "#67e8f9" : "#64748b"}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.milestoneText,
                      { color: unlocked ? "#e0f2fe" : "#94a3b8" },
                    ]}
                  >
                    Lv {milestone.level} · {milestone.shortTitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.footer}>
          Quizzes, brainteasers, Ask Nova, and daily login rewards already
          feed this island. Every point of XP now has somewhere to live. 💫
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignSelf: "center",
    paddingTop: 18,
    paddingHorizontal: 1,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  onlineBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#67e8f96b",
    backgroundColor: "#0891b21f",
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 7,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: "#34d399",
  },
  onlineText: {
    color: "#a5f3fc",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.75,
  },
  title: {
    color: "#f0f9ff",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "#bae6fd",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  refresh: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#67e8f973",
    backgroundColor: "#0891b221",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#38bdf87a",
    backgroundColor: "#07142ae0",
    padding: 15,
    marginBottom: 13,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  stage: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  level: {
    color: "#f0f9ff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },
  xp: {
    color: "#bae6fd",
    fontSize: 12,
    fontWeight: "800",
  },
  track: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#0f172af5",
    borderWidth: 1,
    borderColor: "#67e8f957",
    marginTop: 12,
  },
  fill: {
    height: "100%",
    minWidth: 5,
    borderRadius: 999,
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },
  nextText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  sceneCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#67e8f975",
    backgroundColor: "#07152f",
    marginBottom: 12,
    position: "relative",
  },
  scene: {
    width: "100%",
    overflow: "hidden",
  },
  cloud: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },
  grass: {
    position: "absolute",
    backgroundColor: "#2f9e62",
    borderWidth: 4,
    borderColor: "#71e2a7",
  },
  landmark: {
    position: "absolute",
    width: 54,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  landmarkLabel: {
    maxWidth: 47,
    color: "#f8fafc",
    fontSize: 7.8,
    lineHeight: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  sceneHint: {
    position: "absolute",
    left: 12,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#02061799",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  sceneHintText: {
    color: "#bae6fd",
    fontSize: 10,
    fontWeight: "700",
  },
  gain: {
    position: "absolute",
    top: 13,
    right: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fef08ac2",
    backgroundColor: "#713f12eb",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  gainText: {
    color: "#fef9c3",
    fontSize: 11,
    fontWeight: "900",
  },
  detail: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#07142adb",
    padding: 14,
    marginBottom: 20,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0ea5e92e",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  detailTitle: {
    color: "#f0f9ff",
    fontSize: 16,
    fontWeight: "900",
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: "#3341554d",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.45,
  },
  detailBody: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.75,
  },
  sectionTitle: {
    color: "#f0f9ff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },
  totalPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#67e8f97a",
    backgroundColor: "#0891b224",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  totalText: {
    color: "#a5f3fc",
    fontSize: 12,
    fontWeight: "900",
  },
  sourceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sourceCard: {
    width: "48%",
    minHeight: 108,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#07142ac7",
    padding: 12,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 9,
  },
  sourceValue: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },
  otherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 13,
    backgroundColor: "#0f172ab3",
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 13,
  },
  otherText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "700",
  },
  roadmap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a78bfa6b",
    backgroundColor: "#1e1b4b61",
    padding: 15,
    marginTop: 8,
  },
  roadmapTitle: {
    color: "#ede9fe",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  roadmapBody: {
    color: "#c4b5fd",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  milestones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#0f172a94",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  milestoneText: {
    fontSize: 10,
    fontWeight: "800",
  },
  footer: {
    color: "#7dd3fc",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 18,
  },
});