// app/(tabs)/quiz/[topic].tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { buildQuiz } from "../../_lib/quiz";
import { getCardsById, toQA } from "../../_lib/flashcards";
import { add as addQuizHistory } from "../../_lib/quizHistory"; // ✅ direct history logger
import { safeLogQuiz } from "../../utils/quiz-history-bridge"; // ✅ bridge logger
import { quizFinished } from "../../utils/achievements-bridge"; // ✅ achievements bridge
import {
  useAchievements,
  AchieveEmitter,
} from "../../context/AchievementsContext"; // ✅ achievements context / emitter
import { useCoins } from "../../context/CoinsContext";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import { createCertificate } from "../../utils/certificates";
import { useIsland } from "../../context/IslandContext";
import { useCompanion } from "../../context/CompanionContext";

type QItem = { question: string; choices: string[]; answer: string };

const QUIZ_LEN = 20;
const BASE_TOTAL_TIME = 300; // 5 min
const ADVANCE_DELAY = 650;

const CYAN = "#00E5FF";
const BLUE = "#0B2239";
const BLACK = "#000000";
const NEON = "#39FF14"; // neon green

// 🔧 Dev-only UI. MUST stay false for TestFlight / App Store builds.
const SHOW_DEV_QUIZ_CHEAT = __DEV__;

export default function TopicQuiz() {
  const { id = "", title = "" } =
    useLocalSearchParams<{ id?: string; title?: string }>();
  const router = useRouter();
  const ach = useAchievements();
  const { addCoins } = useCoins();
  const { show: showToast } = useToast();
  const { user } = useUser() as any;
  const { addIslandXp } = useIsland();
  const { activeCompanion } = useCompanion();

  const activeCompanionToken = useMemo(
    () =>
      [
        activeCompanion?.id,
        activeCompanion?.canonId,
        activeCompanion?.title,
        activeCompanion?.meta?.iapProductId,
      ]
        .map((value) =>
          String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
        )
        .filter(Boolean)
        .join("|"),
    [
      activeCompanion?.id,
      activeCompanion?.canonId,
      activeCompanion?.title,
      activeCompanion?.meta?.iapProductId,
    ]
  );

  const activeAbilityType =
    activeCompanion?.ability?.type ?? null;

  const hasChronoFox =
    activeAbilityType === "quiz_time_bonus" ||
    activeCompanionToken.includes("chronofox");

  const hasAstralNova =
    activeAbilityType === "quiz_certificate_bonus" ||
    activeCompanionToken.includes("astralnova");

  const chronoExtraMinutes = hasChronoFox
    ? Math.max(
        0,
        Number(
          activeCompanion?.ability?.extraMinutes ??
            2
        )
      )
    : 0;

  const astralCertificateBonus = hasAstralNova
    ? Math.max(
        0,
        Math.round(
          Number(
            activeCompanion?.ability
              ?.bonusCoinsFlat ??
              500
          )
        )
      )
    : 0;

  const quizTotalTime = useMemo(
    () =>
      BASE_TOTAL_TIME +
      Math.round(
        chronoExtraMinutes * 60
      ),
    [chronoExtraMinutes]
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [noData, setNoData] = useState(false);

  const [totalLeft, setTotalLeft] = useState(quizTotalTime);
  const [done, setDone] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loggedRef = useRef(false);
  const notifiedRef = useRef(false);
  const certificateCreatedRef =
    useRef(false);
  const astralBonusGivenRef = useRef(false);

  const [showCongrats, setShowCongrats] = useState(false);
  const [lastXp, setLastXp] = useState<number | null>(null); // 🌴 store last quiz XP for UI
  const [legendaryNotice, setLegendaryNotice] =
    useState<string | null>(null);

  const current = items[idx];
  const total = items.length;

  const headerTitle = useMemo(
    () => (title ? String(title) : "Quiz"),
    [title]
  );

  const getDisplayName = useCallback(() => {
    const fromUser =
      (user?.username && String(user.username).trim()) ||
      (user?.name && String(user.name).trim());
    return fromUser || "Nova Student";
  }, [user]);

  // Android hardware back handler
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        if (!done && !loading && !noData) {
          Alert.alert("Exit quiz?", "Your progress will be lost.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Exit",
              style: "destructive",
              onPress: () => router.replace("/(tabs)/quiz"),
            },
          ]);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [done, loading, noData, router])
  );

  // Load questions
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const raw = getCardsById(String(id));
        const hasQA = raw
          .map(toQA)
          .filter(Boolean) as { question: string; answer: string }[];

        if (!hasQA.length) {
          if (mounted) {
            setNoData(true);
          }
          return;
        }

        const built = buildQuiz(raw as any, QUIZ_LEN);

        if (mounted) {
          setItems(built);
          setIdx(0);
          setCorrect(0);
          setSelected(null);
          setLocked(false);
          setDone(false);
          setTotalLeft(quizTotalTime);
          setNoData(false);

          loggedRef.current = false;
          notifiedRef.current = false;
          certificateCreatedRef.current = false;
          astralBonusGivenRef.current = false;
          setShowCongrats(false);
          setLegendaryNotice(null);
          setLastXp(null); // reset XP display for a fresh run
        }
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (autoRef.current) clearTimeout(autoRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      autoRef.current = null;
      totalTimerRef.current = null;
    };
  }, [
    id,
    quizTotalTime,
  ]);

  // Total timer
  useEffect(() => {
    if (loading || done || noData) return;

    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    totalTimerRef.current = setInterval(() => {
      setTotalLeft((t) => {
        if (t <= 1) {
          if (totalTimerRef.current) clearInterval(totalTimerRef.current);
          totalTimerRef.current = null;
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    };
  }, [loading, done, noData]);

  function next() {
    if (idx + 1 >= total) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setLocked(false);
  }

  // DEV helper: force quiz to finish with target %
  // (Hidden in production: SHOW_DEV_QUIZ_CHEAT = false)
  function devForceFinish(targetPct: number) {
    if (!total || done) return;
    const clamped = Math.max(0, Math.min(100, targetPct));
    const neededCorrect = Math.round((clamped / 100) * total);

    console.log("[DEV] Forcing quiz finish", {
      total,
      targetPct: clamped,
      neededCorrect,
    });

    setCorrect(neededCorrect);
    setIdx(total - 1);
    setSelected(null);
    setLocked(true);
    setDone(true);
  }

  async function onPick(i: number) {
    if (locked || !current) return;

    setSelected(i);
    setLocked(true);

    const chosen = current.choices[i];
    const isCorrect = chosen === current.answer;

    if (isCorrect) {
      setCorrect((c) => c + 1);

      // Per-question coins (legit reward)
      try {
        void addCoins(5, "quiz_correct", {
          topicId: String(id),
          questionIndex: idx,
          question: current.question,
        });
      } catch (e) {
        console.warn("[Quiz] addCoins failed", e);
      }

      // 🌴 Per-question Island XP (small drip, hard to farm)
      try {
        if (addIslandXp) {
          addIslandXp(2, {
            reason: "quiz_correct",
            meta: {
              topicId: String(id),
              questionIndex: idx,
              question: current.question,
            },
          }).catch(() => {});
        }
      } catch {
        // ignore island XP errors
      }

      try {
        showToast({
          title: "+5 coins",
          message: "Correct answer!",
          type: "success",
          icon: "🪙",
        });
      } catch (e) {
        console.warn("[Quiz] showToast failed", e);
      }
    }

    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(next, ADVANCE_DELAY);
  }

  function finishNow() {
    setDone(true);
  }

  function restart() {
    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = null;

    setIdx(0);
    setCorrect(0);
    setSelected(null);
    setLocked(false);
    setDone(false);
    setTotalLeft(quizTotalTime);

    loggedRef.current = false;
    notifiedRef.current = false;
    certificateCreatedRef.current = false;
    astralBonusGivenRef.current = false;
    setShowCongrats(false);
    setLegendaryNotice(null);
    setLastXp(null);
  }

  const mm = Math.floor(totalLeft / 60);
  const ss = String(totalLeft % 60).padStart(2, "0");

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LinearGradient colors={[BLACK, BLUE]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={S.container}>{children}</ScrollView>
    </LinearGradient>
  );

  // When quiz is finished: history, achievements, certificate, island XP
  useEffect(() => {
    if (!done) return;
    if (!total) return;
    if (loggedRef.current) return;

    const pct = total ? Math.round((correct / total) * 100) : 0;
    const topicId = String(id);

    // The guarded direct certificate writer below is the single source of truth.
    loggedRef.current = true;

    const durationSecRaw = quizTotalTime - totalLeft;
    const durationSec = durationSecRaw < 0 ? 0 : durationSecRaw;

    void safeLogQuiz({
      topicId,
      title: headerTitle,
      total,
      correct,
      percent: pct,
    }).catch(() => {});

    void addQuizHistory({
      topicId,
      title: headerTitle,
      total,
      correct,
      percent: pct,
    }).catch(() => {});

    if (ach && typeof (ach as any).onQuizFinished === "function") {
      try {
        const maybePromise = (ach as any).onQuizFinished(pct, headerTitle);
        if (maybePromise && typeof maybePromise?.catch === "function") {
          maybePromise.catch(() => {});
        }
      } catch {}
    }

    try {
      quizFinished(correct, durationSec, total);
    } catch {}

    try {
      AchieveEmitter.emit("ACHIEVEMENT_EVENT", {
        type: "quizFinished",
        scorePct: pct,
        subject: headerTitle,
      });
    } catch {}

    // 🌴 Island XP: gentle, non-abusable scaling from quizzes
    try {
      if (addIslandXp) {
        const xpPerCorrect = 2; // matches the small drip from per-question events
        const baseXp = correct * xpPerCorrect;

        // Modest bonus XP based on performance
        let bonusXp = 0;

        if (pct >= 80 && pct < 90) {
          bonusXp += 4;
        } else if (pct >= 90 && pct < 100) {
          bonusXp += 6;
        } else if (pct === 100) {
          bonusXp += 10;
        }

        const totalXp = baseXp + bonusXp;

        setLastXp(totalXp > 0 ? totalXp : 0); // store for UI

        if (totalXp > 0) {
          addIslandXp(totalXp, {
            reason: "quiz",
            meta: {
              topicId,
              title: headerTitle,
              totalQuestions: total,
              correct,
              percent: pct,
            },
          }).catch(() => {});
        } else if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[Island] No XP from quiz (totalXp=0)", {
            pct,
            correct,
            total,
          });
        }
      } else {
        setLastXp(0);
      }
    } catch {
      // ignore island XP errors, but keep whatever lastXp we computed
    }

    // 🔹 Create one certificate per quiz attempt.
    if (
      pct >= 80 &&
      !certificateCreatedRef.current
    ) {
      certificateCreatedRef.current = true;

      (async () => {
        let certificateCreated = false;

        try {
          const name =
            getDisplayName();

          await createCertificate({
            name,
            quizTitle:
              headerTitle,
            scorePct: pct,
          });

          certificateCreated = true;

          console.log(
            "[Quiz] Local certificate created once for this attempt",
            headerTitle,
            pct,
            name
          );
        } catch (error) {
          certificateCreatedRef.current =
            false;

          console.warn(
            "[Quiz] createCertificate failed",
            error
          );
        }

        if (
          !certificateCreated ||
          !hasAstralNova ||
          astralCertificateBonus <=
            0 ||
          astralBonusGivenRef.current
        ) {
          return;
        }

        astralBonusGivenRef.current =
          true;

        try {
          await addCoins(
            astralCertificateBonus,
            "astral_nova_certificate_bonus",
            {
              topicId,
              title: headerTitle,
              percent: pct,
              companionId:
                activeCompanion?.id ??
                "companion:astral_nova",
              abilityType:
                activeAbilityType,
            }
          );

          setLegendaryNotice(
            `Astral Nova awakened · +${astralCertificateBonus} bonus coins`
          );

          try {
            showToast({
              title:
                "Astral Nova activated",
              message: `Certificate bonus: +${astralCertificateBonus} coins`,
              type: "success",
              icon: "✨",
            });
          } catch {}
        } catch (error) {
          astralBonusGivenRef.current =
            false;

          console.warn(
            "[Quiz] Astral Nova certificate bonus failed",
            error
          );
        }
      })();
    }

    if (!notifiedRef.current) {
      notifiedRef.current = true;
      setShowCongrats(true);
    }
  }, [
    done,
    total,
    correct,
    totalLeft,
    id,
    headerTitle,
    ach,
    getDisplayName,
    addIslandXp,
    quizTotalTime,
    hasAstralNova,
    astralCertificateBonus,
    addCoins,
    activeCompanion?.id,
    activeAbilityType,
    showToast,
  ]);

  // Render states

  if (loading) {
    return (
      <Shell>
        <View style={S.center}>
          <ActivityIndicator color={CYAN} />
          <Text style={[S.dim, { color: CYAN }]}>
            Loading {headerTitle}…
          </Text>
        </View>
      </Shell>
    );
  }

  if (noData) {
    return (
      <Shell>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={S.result}>
          No questions are available for this topic yet.
        </Text>
        <View style={{ height: 12 }} />
        <Pressable
          style={[S.btn, S.outline]}
          onPress={() => router.replace("/(tabs)/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
      </Shell>
    );
  }

  if (done || !current) {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const earnedCert = pct >= 80;

    return (
      <Shell>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={S.result}>
          Score: {correct} / {total} ({pct}%).
        </Text>

        {typeof lastXp === "number" && lastXp > 0 && (
          <Text style={S.xpText}>Island XP gained: +{lastXp}</Text>
        )}

        {legendaryNotice ? (
          <View style={S.legendaryResultCard}>
            <Text style={S.legendaryResultTitle}>
              ✦ Legendary ability activated
            </Text>
            <Text style={S.legendaryResultText}>
              {legendaryNotice}
            </Text>
          </View>
        ) : null}

        <View style={{ height: 12 }} />
        <View style={S.row}>
          <Pressable
            style={[S.btn, S.outline]}
            onPress={() => router.replace("/(tabs)/quiz")}
          >
            <Text style={S.btnTxt}>Topics</Text>
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable style={[S.btn, S.solid]} onPress={restart}>
            <Text style={S.btnTxt}>Start Over</Text>
          </Pressable>
        </View>

        {showCongrats && (
          <View style={S.modalBackdrop}>
            <View style={S.modalCard}>
              <Text style={S.modalTitle}>
                {earnedCert ? "Quiz complete! 🎉" : "Quiz complete"}
              </Text>
              <Text style={S.modalText}>
                You scored {pct}%.
                {"\n"}
                {earnedCert
                  ? "You also unlocked a certificate for this quiz. Tap below to view it, or open the Achievements tab to see what you’ve unlocked."
                  : "Check the Achievements tab to see what you’ve unlocked and what’s next."}
              </Text>

              {earnedCert && hasAstralNova ? (
                <Text style={S.astralModalText}>
                  ✦ Astral Nova grants +
                  {astralCertificateBonus} certificate coins.
                </Text>
              ) : null}

              <View style={S.modalButtons}>
                {earnedCert && (
                  <>
                    <Pressable
                      style={[S.btn, S.solid, { flex: 1 }]}
                      onPress={() => {
                        setShowCongrats(false);
                        router.push("/certificates");
                      }}
                    >
                      <Text style={S.btnTxt}>View Certificate</Text>
                    </Pressable>
                    <View style={{ width: 10 }} />
                  </>
                )}

                <Pressable
                  style={[S.btn, S.outline, { flex: 1 }]}
                  onPress={() => {
                    setShowCongrats(false);
                    router.push("/achievements");
                  }}
                >
                  <Text style={S.btnTxt}>View Achievements</Text>
                </Pressable>
              </View>

              <View style={{ height: 10 }} />
              <Pressable
                style={[S.btn, S.outline, { marginTop: 4 }]}
                onPress={() => setShowCongrats(false)}
              >
                <Text style={S.btnTxt}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Shell>
    );
  }

  // Active quiz view
  return (
    <Shell>
      <View style={S.headerRow}>
        <Text style={S.title}>{headerTitle}</Text>
        <Text style={[S.meta, totalLeft <= 20 ? S.danger : undefined]}>
          ⏳ {mm}:{ss}
        </Text>
      </View>

      <Text style={S.meta}>
        Question {idx + 1} / {total}
      </Text>

      {hasChronoFox ? (
        <View style={S.chronoCard}>
          <Text style={S.chronoTitle}>
            ◷ CHRONO FOX ACTIVE
          </Text>
          <Text style={S.legendaryAbilityText}>
            Timeline extended by +
            {chronoExtraMinutes} minutes ·
            starting time{" "}
            {Math.floor(
              quizTotalTime / 60
            )}:00
          </Text>
        </View>
      ) : null}

      {hasAstralNova ? (
        <View style={S.astralCard}>
          <Text style={S.astralTitle}>
            ✦ ASTRAL NOVA ACTIVE
          </Text>
          <Text style={S.legendaryAbilityText}>
            Earn +
            {astralCertificateBonus} bonus
            coins when this quiz awards a
            certificate.
          </Text>
        </View>
      ) : null}

      <Text style={S.qText}>{current.question}</Text>

      <View style={{ height: 10 }} />

      {current.choices.map((opt, i) => {
        const isPicked = selected === i;
        const isRight = locked && opt === current.answer;
        const isWrong = locked && isPicked && !isRight;

        return (
          <Pressable
            key={`${i}-${opt}`}
            disabled={locked}
            onPress={() => onPick(i)}
            style={[
              S.choice,
              isPicked && S.choicePicked,
              isRight && S.choiceRight,
              isWrong && S.choiceWrong,
            ]}
          >
            <Text style={[S.choiceTxt, isRight && S.choiceTxtRight]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}

      <View style={{ height: 12 }} />
      <View style={S.headerRow}>
        <Text style={S.meta}>Correct: {correct}</Text>
        <Text style={S.meta}>Remaining: {total - (idx + 1)}</Text>
      </View>

      <View style={{ height: 14 }} />
      <View style={S.row}>
        <Pressable
          style={[S.btn, S.outline]}
          onPress={() => router.replace("/(tabs)/quiz")}
        >
          <Text style={S.btnTxt}>Topics</Text>
        </Pressable>
        <View style={{ width: 10 }} />
        <Pressable style={[S.btn, S.solid]} onPress={finishNow}>
          <Text style={S.btnTxt}>Finish</Text>
        </Pressable>
      </View>

      {SHOW_DEV_QUIZ_CHEAT && (
        <View style={[S.devRow, { marginTop: 16 }]}>
          <Text style={S.devLabel}>DEV • Quiz Cheats</Text>
          <View style={S.devButtonsRow}>
            <Pressable
              style={S.devBtn}
              onPress={() => devForceFinish(80)}
            >
              <Text style={S.devBtnText}>Force 80% (cert)</Text>
            </Pressable>
            <Pressable
              style={S.devBtn}
              onPress={() => devForceFinish(100)}
            >
              <Text style={S.devBtnText}>Force 100%</Text>
            </Pressable>
          </View>
          <Text style={S.devHint}>
            Use in TestFlight to unlock certificates fast and check bleed across
            accounts.
          </Text>
        </View>
      )}
    </Shell>
  );
}

export const S = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.8 },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: CYAN,
    marginBottom: 4,
  },
  qText: {
    fontSize: 18,
    color: CYAN,
    marginTop: 10,
    fontWeight: "800",
    lineHeight: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  meta: { fontSize: 14, color: CYAN, opacity: 0.9, fontWeight: "700" },
  danger: { color: "#ff6b6b", fontWeight: "900" },

  choice: {
    minHeight: 56,
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CYAN,
    marginVertical: 7,
    backgroundColor: "rgba(0, 229, 255, 0.06)",
  },
  choicePicked: {
    backgroundColor: "rgba(0, 229, 255, 0.14)",
  },
  choiceRight: {
    backgroundColor: "rgba(57, 255, 20, 0.22)",
    borderColor: NEON,
    shadowColor: NEON,
    shadowOpacity: 0.75,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  choiceTxtRight: { color: NEON, fontWeight: "900" },
  choiceWrong: {
    backgroundColor: "rgba(255, 107, 107, 0.18)",
    borderColor: "#ff6b6b",
  },
  choiceTxt: {
    fontSize: 16,
    color: CYAN,
    fontWeight: "800",
    lineHeight: 22,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  btnTxt: { color: CYAN, fontWeight: "900", textAlign: "center" },

  solid: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: CYAN,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: CYAN,
  },

  result: { fontSize: 18, color: CYAN, marginTop: 6, fontWeight: "800" },

  xpText: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "800",
    color: NEON,
  },
  chronoCard: {
    marginTop: 10,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    backgroundColor:
      "rgba(120,53,15,0.30)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  astralCard: {
    marginTop: 10,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#E879F9",
    backgroundColor:
      "rgba(88,28,135,0.30)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chronoTitle: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  astralTitle: {
    color: "#F5D0FE",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  legendaryAbilityText: {
    marginTop: 4,
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  legendaryResultCard: {
    marginTop: 12,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#E879F9",
    backgroundColor:
      "rgba(88,28,135,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  legendaryResultTitle: {
    color: "#F5D0FE",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  legendaryResultText: {
    marginTop: 4,
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
  },

  modalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "88%",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#03131E",
    borderWidth: 1.5,
    borderColor: CYAN,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: CYAN,
    marginBottom: 6,
  },
  modalText: {
    fontSize: 14,
    color: "#CFEAF7",
    marginBottom: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  astralModalText: {
    marginTop: -4,
    marginBottom: 14,
    color: "#F5D0FE",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  devRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CYAN,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  devLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: CYAN,
    marginBottom: 6,
  },
  devButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  devBtn: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CYAN,
    alignItems: "center",
    backgroundColor: "rgba(0, 229, 255, 0.16)",
  },
  devBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: CYAN,
  },
  devHint: {
    fontSize: 11,
    marginTop: 4,
    color: "#CFEAF7",
  },
});