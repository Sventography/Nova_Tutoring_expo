import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Platform,
  Animated,
  Easing,
  DeviceEventEmitter,
} from "react-native";
import {
  useAchievements,
  ACHIEVEMENT_EVENT,
} from "../context/AchievementsContext";
import { ACHIEVEMENT_LIST } from "../constants/achievements";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { useStudyProgress } from "../context/StudyProgressContext";

type Item = {
  id: string;
  title: string;
  desc?: string;
  coins: number;
  unlockedAt?: number;
};
type Section = { title: string; data: Item[] };

export default function AchievementsScreen() {
  const { unlocked } = useAchievements();
  const { tokens } = useTheme();
  const {
    ready: studyReady,
    totalXp: studyTotalXp,
    level: studyLevel,
    xpIntoLevel: studyXpIntoLevel,
    xpForNextLevel: studyXpForNextLevel,
    progress: studyProgress,
  } = useStudyProgress();
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    const onUnlocked = () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      try {
        confettiRef.current?.start?.();
      } catch {}
    };
    const sub = DeviceEventEmitter.addListener(ACHIEVEMENT_EVENT, onUnlocked);
    if (Platform.OS === "web") {
      const handler = () => onUnlocked();
      // @ts-ignore
      window.addEventListener(ACHIEVEMENT_EVENT as any, handler as any);
      return () => {
        sub.remove();
        // @ts-ignore
        window.removeEventListener(ACHIEVEMENT_EVENT as any, handler as any);
      };
    }
    return () => sub.remove();
  }, []);

  const sections: Section[] = useMemo(() => {
    const unlockedList: Item[] = [];
    const lockedList: Item[] = [];
    for (const a of ACHIEVEMENT_LIST) {
      const ts = unlocked && unlocked[a.id];
      const base = {
        id: a.id,
        title: a.title,
        desc: a.desc,
        coins: a.coins ?? 0,
      };
      if (ts) unlockedList.push({ ...base, unlockedAt: ts });
      else lockedList.push(base);
    }
    unlockedList.sort(
      (a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)
    );
    return [
      ...(unlockedList.length
        ? [{ title: "Unlocked Achievements", data: unlockedList }]
        : []),
      {
        title: unlockedList.length ? "More to Unlock" : "Achievements",
        data: lockedList,
      },
    ];
  }, [unlocked]);

  return (
    <LinearGradient colors={tokens.gradient} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ConfettiCannon
          ref={confettiRef}
          autoStart={false}
          fadeOut
          count={80}
          origin={{ x: 0, y: 0 }}
        />
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={S.listContent}
          ListHeaderComponent={
            <StudyProgressCard
              tokens={tokens}
              ready={studyReady}
              totalXp={studyTotalXp}
              level={studyLevel}
              xpIntoLevel={studyXpIntoLevel}
              xpForNextLevel={studyXpForNextLevel}
              progress={studyProgress}
            />
          }
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[S.sectionTitle, { color: tokens.text }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) =>
            item.unlockedAt ? (
              <UnlockedCard item={item} tokens={tokens} />
            ) : (
              <LockedCard item={item} tokens={tokens} />
            )
          }
          initialNumToRender={18}
          windowSize={10}
          maxToRenderPerBatch={24}
          removeClippedSubviews
        />
      </View>
    </LinearGradient>
  );
}

/* ---------- helpers ---------- */

function subjectFromId(id: string): string | null {
  if (!id.startsWith("quiz_")) return null;
  const parts = id.split("_");
  if (parts.length === 3) {
    const mid = parts[1];
    if (isNaN(Number(mid))) return mid;
  }
  if (parts.length === 4 && parts[1] === "taken") {
    const mid = parts[2];
    if (isNaN(Number(mid))) return mid;
  }
  return null;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/_/g, " ");
}

function formatWhen(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function StudyProgressCard({
  tokens,
  ready,
  totalXp,
  level,
  xpIntoLevel,
  xpForNextLevel,
  progress,
}: {
  tokens: any;
  ready: boolean;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
}) {
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(progress * 100))
  );

  return (
    <View
      style={[
        S.studyProgressCard,
        {
          borderColor: tokens.accent,
          backgroundColor: tokens.isDark
            ? "rgba(0,229,255,0.08)"
            : "rgba(0,120,200,0.06)",
          shadowColor: tokens.accent,
        },
      ]}
    >
      <View style={S.studyProgressHeader}>
        <View style={S.studyProgressTitleRow}>
          <Ionicons
            name="school-outline"
            size={22}
            color={tokens.accent}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                S.studyProgressEyebrow,
                { color: tokens.accent },
              ]}
            >
              STUDY PROGRESS
            </Text>
            <Text
              style={[
                S.studyProgressLevel,
                { color: tokens.text },
              ]}
            >
              Study Level {level}
            </Text>
          </View>
        </View>

        <View
          style={[
            S.studyLevelBadge,
            { borderColor: tokens.accent },
          ]}
        >
          <Text
            style={[
              S.studyLevelBadgeText,
              { color: tokens.accent },
            ]}
          >
            LV {level}
          </Text>
        </View>
      </View>

      {ready ? (
        <>
          <View style={S.studyProgressNumbers}>
            <Text
              style={[
                S.studyProgressXpText,
                { color: tokens.text },
              ]}
            >
              {xpIntoLevel} / {xpForNextLevel} XP
            </Text>

            <Text
              style={[
                S.studyProgressPercent,
                { color: tokens.cardText },
              ]}
            >
              {progressPercent}%
            </Text>
          </View>

          <View
            style={[
              S.studyProgressTrack,
              {
                backgroundColor: tokens.isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.10)",
              },
            ]}
          >
            <View
              style={[
                S.studyProgressFill,
                {
                  backgroundColor: tokens.accent,
                  width: `${progressPercent}%` as any,
                },
              ]}
            />
          </View>

          <Text
            style={[
              S.studyProgressTotal,
              { color: tokens.cardText },
            ]}
          >
            Total Study XP earned: {totalXp}
          </Text>
        </>
      ) : (
        <Text
          style={[
            S.studyProgressTotal,
            { color: tokens.cardText },
          ]}
        >
          Loading Study Progress…
        </Text>
      )}

      <View
        style={[
          S.studyInfoBox,
          {
            borderColor: tokens.isDark
              ? "rgba(0,229,255,0.24)"
              : "rgba(0,120,200,0.18)",
          },
        ]}
      >
        <Text
          style={[
            S.studyInfoTitle,
            { color: tokens.text },
          ]}
        >
          What is Study XP?
        </Text>

        <Text
          style={[
            S.studyInfoText,
            { color: tokens.cardText },
          ]}
        >
          Study XP raises your Study Level, a permanent measure
          of your overall Nova quiz progress.
        </Text>

        <Text
          style={[
            S.studyInfoText,
            { color: tokens.cardText },
          ]}
        >
          Complete every question in a quiz to earn XP. Your
          first completion of each topic per day earns the full
          Study XP reward. Repeating that topic earns a smaller
          5 XP practice reward.
        </Text>
      </View>
    </View>
  );
}

/* ---------- cards ---------- */

function UnlockedCard({ item, tokens }: { item: Item; tokens: any }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulse]);

  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const shadowRadius = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 12],
  });

  const subj = subjectFromId(item.id);

  const bgColors = tokens.isDark
    ? [tokens.card, "#050b18"]
    : [tokens.card, "#f1f7ff"];

  return (
    <Animated.View
      style={[
        S.cardWrap,
        {
          shadowColor: tokens.accent,
          shadowOpacity: 0.35,
          shadowRadius,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <LinearGradient colors={bgColors} style={S.cardBg}>
        <LinearGradient
          colors={[tokens.accent, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.neonBorder}
        />
        <Animated.View
          style={[
            S.borderOverlay,
            { opacity: borderOpacity, borderColor: tokens.accent },
          ]}
        />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="trophy" size={18} color={tokens.accent} />
            <Text style={[S.title, { color: tokens.text }]}>
              {item.title}
            </Text>
            {!!subj && (
              <View
                style={[
                  S.pill,
                  {
                    borderColor: tokens.accent,
                    backgroundColor: tokens.isDark
                      ? "rgba(0,229,255,0.08)"
                      : "rgba(0,120,200,0.06)",
                  },
                ]}
              >
                <Text style={[S.pillText, { color: tokens.accent }]}>
                  {titleCase(subj)}
                </Text>
              </View>
            )}
          </View>
          {!!item.desc && (
            <Text style={[S.desc, { color: tokens.cardText }]}>
              {item.desc}
            </Text>
          )}
          <View style={S.metaRow}>
            <View
              style={[
                S.badge,
                { borderColor: tokens.accent },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={tokens.accent} />
              <Text style={[S.badgeText, { color: tokens.text }]}>
                +{item.coins} coins
              </Text>
            </View>
            <Text style={[S.whenText, { color: tokens.cardText }]}>
              {formatWhen(item.unlockedAt)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function LockedCard({ item, tokens }: { item: Item; tokens: any }) {
  const subj = subjectFromId(item.id);

  const bgColors = tokens.isDark
    ? [tokens.card, "#050b18"]
    : [tokens.card, "#f1f7ff"];

  const muted = tokens.isDark
    ? "rgba(200,220,235,0.7)"
    : "rgba(40,60,80,0.8)";

  return (
    <View
      style={[
        S.cardWrap,
        {
          shadowColor: tokens.accent,
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <LinearGradient colors={bgColors} style={S.cardBg}>
        <LinearGradient
          colors={[tokens.border, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.neonBorder}
        />
        <View style={S.cardInner}>
          <View style={S.titleRow}>
            <Ionicons name="lock-closed" size={18} color={muted} />
            <Text style={[S.title, { color: tokens.text }]}>
              {item.title}
            </Text>
            {!!subj && (
              <View
                style={[
                  S.pill,
                  {
                    borderColor: muted,
                    backgroundColor: tokens.isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <Text style={[S.pillText, { color: muted }]}>
                  {titleCase(subj)}
                </Text>
              </View>
            )}
          </View>
          {!!item.desc && (
            <Text style={[S.descMuted, { color: muted }]}>
              {item.desc}
            </Text>
          )}
          <View style={S.metaRow}>
            <View
              style={[
                S.badge,
                { borderColor: muted },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={14}
                color={muted}
              />
              <Text style={[S.badgeText, { color: muted }]}>
                +{item.coins} coins
              </Text>
            </View>
            <Text style={[S.whenText, { color: muted }]}>
              Locked
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ---------- styles ---------- */

export const S = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 24 },

  studyProgressCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  studyProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  studyProgressTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studyProgressEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  studyProgressLevel: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "900",
  },
  studyLevelBadge: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  studyLevelBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  studyProgressNumbers: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studyProgressXpText: {
    fontSize: 14,
    fontWeight: "900",
  },
  studyProgressPercent: {
    fontSize: 12,
    fontWeight: "800",
  },
  studyProgressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 7,
  },
  studyProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  studyProgressTotal: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "700",
  },
  studyInfoBox: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 13,
  },
  studyInfoTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  studyInfoText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },

  sectionTitle: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  cardWrap: {
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  cardBg: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  neonBorder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    borderWidth: 1,
    borderRadius: 14,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardInner: { padding: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  title: { fontWeight: "800" },
  desc: { marginBottom: 8 },
  descMuted: { marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontWeight: "700" },
  whenText: { fontWeight: "600" },
  pill: {
    marginLeft: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: { fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
});
