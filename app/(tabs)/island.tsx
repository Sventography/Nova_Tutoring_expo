// app/(tabs)/island.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useIsland } from "../context/IslandContext";

/**
 * Keep this in sync with xpForNextLevel in IslandContext.
 */
function xpForNextLevel(level: number): number {
  const base = 150; // XP for Level 1 -> 2
  const step = 50;  // each level adds +50 XP requirement
  const lvl = Math.max(1, level);
  return base + (lvl - 1) * step;
}

export default function IslandScreen() {
  const {
    islandLevel,
    islandXp,
    ready,
    loading,
    todayFromQuiz,
    todayFromBrainteasers,
    todayFromAsk,
    todayFromLogin,
  } = useIsland();

  const xpNeeded = useMemo(
    () => xpForNextLevel(islandLevel),
    [islandLevel]
  );

  const progress = useMemo(() => {
    if (!xpNeeded || xpNeeded <= 0) return 0;
    const raw = islandXp / xpNeeded;
    return Math.max(0, Math.min(1, raw));
  }, [islandXp, xpNeeded]);

  const statusText = !ready || loading
    ? "Syncing your island..."
    : `Island Level ${islandLevel}`;

  const showSummary = ready && !loading;

  const totalToday =
    todayFromQuiz + todayFromBrainteasers + todayFromAsk + todayFromLogin;

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={["#020617", "#020617", "#020617"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.card}>
        <Text style={styles.badge}>COMING SOON</Text>
        <Text style={styles.title}>Nova Island</Text>

        <Text style={styles.subtitle}>
          Your learning is quietly growing a floating island in the sky.
        </Text>

        {/* Level + XP header */}
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>{statusText}</Text>
          {ready && !loading && (
            <Text style={styles.levelTag}>v2+ Feature</Text>
          )}
        </View>

        {/* XP bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {ready && !loading
              ? `${islandXp} / ${xpNeeded} XP to next level`
              : "Loading island progress..."}
          </Text>
        </View>

        {/* Today's XP summary strip */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today’s XP summary</Text>
          {showSummary ? (
            totalToday > 0 ? (
              <>
                <Text style={styles.summaryLine}>
                  Your island earned <Text style={styles.summaryEm}>
                    +{totalToday} XP
                  </Text>{" "}
                  today:
                </Text>
                <View style={styles.summaryChipsRow}>
                  <View
                    style={[
                      styles.summaryChip,
                      todayFromQuiz > 0
                        ? styles.summaryChipActive
                        : styles.summaryChipDim,
                    ]}
                  >
                    <Text style={styles.summaryChipLabel}>Quizzes</Text>
                    <Text style={styles.summaryChipValue}>
                      +{todayFromQuiz}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryChip,
                      todayFromBrainteasers > 0
                        ? styles.summaryChipActive
                        : styles.summaryChipDim,
                    ]}
                  >
                    <Text style={styles.summaryChipLabel}>Brainteasers</Text>
                    <Text style={styles.summaryChipValue}>
                      +{todayFromBrainteasers}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryChip,
                      todayFromAsk > 0
                        ? styles.summaryChipActive
                        : styles.summaryChipDim,
                    ]}
                  >
                    <Text style={styles.summaryChipLabel}>Ask Nova</Text>
                    <Text style={styles.summaryChipValue}>
                      +{todayFromAsk}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryChip,
                      todayFromLogin > 0
                        ? styles.summaryChipActive
                        : styles.summaryChipDim,
                    ]}
                  >
                    <Text style={styles.summaryChipLabel}>Daily login</Text>
                    <Text style={styles.summaryChipValue}>
                      +{todayFromLogin}
                    </Text>
                  </View>
                </View>
                <Text style={styles.summaryHint}>
                  XP resets each day, but your island level and bar keep
                  climbing over time.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.summaryLine}>
                  No island XP earned yet today.
                </Text>
                <Text style={styles.summaryHint}>
                  Finish a quiz with a solid score, solve your daily
                  brainteasers, log in, or ask real questions on the Ask tab to
                  start feeding your island.
                </Text>
              </>
            )
          ) : (
            <Text style={styles.summaryLine}>
              We’ll show today’s XP breakdown here once your island finishes
              syncing.
            </Text>
          )}
        </View>

        {/* What currently powers the island */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What powers your island today</Text>
          <Text style={styles.bullet}>
            • <Text style={styles.highlight}>Daily login</Text> — log in once a day for a small +5 XP spark
          </Text>
          <Text style={styles.bullet}>
            • <Text style={styles.highlight}>Quizzes</Text> — big chunks of XP when you finish a run
          </Text>
          <Text style={styles.bullet}>
            • <Text style={styles.highlight}>Daily brainteasers</Text> — capped XP from your 2 riddles
          </Text>
          <Text style={styles.bullet}>
            • <Text style={styles.highlight}>Ask Nova answers</Text> — tiny XP drips for real questions
          </Text>
        </View>

        <Text style={styles.body}>
          In a future update, this progress will awaken a full{" "}
          <Text style={styles.highlight}>Nova Island</Text>:{" "}
          <Text style={styles.highlight}>trees</Text>,{" "}
          <Text style={styles.highlight}>waterfalls</Text>,{" "}
          <Text style={styles.highlight}>glowing study buildings</Text>, and{" "}
          <Text style={styles.highlight}>companion habitats</Text> that evolve
          as you keep learning.
        </Text>

        <Text style={styles.bodySmall}>
          Other activities like streaks, relax time, and carefully tuned
          flashcards may join the XP pool later — but for now, your island only
          grows from real work, not easy farming.
        </Text>

        <Text style={styles.footer}>
          Keep playing, asking, and solving now so your island is ready to
          awaken the moment Nova Island fully arrives. 💫
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.5)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.16)",
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#e0faff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#bae6fd",
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e0f2fe",
  },
  levelTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7dd3fc",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.18)",
  },
  progressWrap: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,1)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.5)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.95)",
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: "#9ca3af",
  },

  summaryCard: {
    marginBottom: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.45)",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#e0f2fe",
    marginBottom: 4,
  },
  summaryLine: {
    fontSize: 12,
    color: "#cbd5f5",
    marginBottom: 6,
  },
  summaryEm: {
    color: "#7dd3fc",
    fontWeight: "800",
  },
  summaryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 90,
  },
  summaryChipActive: {
    backgroundColor: "rgba(56,189,248,0.2)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.8)",
  },
  summaryChipDim: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(30,64,175,0.7)",
  },
  summaryChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e0f2fe",
  },
  summaryChipValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7dd3fc",
    marginTop: 2,
  },
  summaryHint: {
    fontSize: 11,
    color: "#93c5fd",
    marginTop: 4,
  },

  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e0f2fe",
    marginBottom: 4,
  },
  bullet: {
    fontSize: 13,
    color: "#cbd5f5",
    marginBottom: 2,
  },
  body: {
    fontSize: 15,
    color: "#cbd5f5",
    lineHeight: 22,
    marginBottom: 8,
  },
  bodySmall: {
    fontSize: 13,
    color: "#a5b4fc",
    lineHeight: 20,
    marginBottom: 6,
  },
  highlight: {
    color: "#7dd3fc",
    fontWeight: "700",
  },
  footer: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
});