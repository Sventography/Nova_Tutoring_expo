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
  const { islandLevel, islandXp, ready, loading } = useIsland();

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
          Your learning is secretly growing a floating island in the sky.
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

        {/* Copy describing the future evolution */}
        <Text style={styles.body}>
          In a future update, every quiz, flashcard, streak, and Ask session
          will feed this bar, unlocking{" "}
          <Text style={styles.highlight}>trees</Text>,{" "}
          <Text style={styles.highlight}>waterfalls</Text>,{" "}
          <Text style={styles.highlight}>glowing buildings</Text>, and{" "}
          <Text style={styles.highlight}>companion habitats</Text> on your
          own magical island.
        </Text>

        <Text style={styles.footer}>
          Keep learning now so your island is ready to awaken when Nova Island
          fully arrives. 💫
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
    marginBottom: 18,
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
  body: {
    fontSize: 15,
    color: "#cbd5f5",
    lineHeight: 22,
    marginBottom: 10,
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