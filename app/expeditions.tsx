import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./context/ThemeContext";
import { useIsland } from "./context/IslandContext";
import { useUser } from "./context/UserContext";
import {
  expeditionForDate,
  localExpeditionDateKey,
} from "./_lib/studyExpeditions";

const DAILY_REWARD_XP = 5;
const STATE_PREFIX = "@nova/study-expedition:completed:v1:";

export default function StudyExpeditionsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { addIslandXp } = useIsland();
  const { supabaseUserId } = useUser() as { supabaseUserId?: string | null };
  const [dateKey] = useState(localExpeditionDateKey);
  const expedition = useMemo(() => expeditionForDate(dateKey), [dateKey]);
  const owner = supabaseUserId || "guest";
  const storageKey = STATE_PREFIX + owner + ":" + dateKey;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCompleted(false);
    setReviewing(false);
    setStep(0);
    setSolved(false);
    setWrongAttempt(false);
    setShowHint(false);
    setSelected(null);
    setFirstTryCount(0);
    setIsDone(false);
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (active) setCompleted(value === expedition.id);
      })
      .catch((cause) => {
        console.warn("[StudyExpeditions] loading progress failed", cause);
        if (active) setError("Progress could not be loaded. The expedition is still playable.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storageKey, expedition.id]);

  const question = expedition.questions[step];
  const choose = (index: number) => {
    if (solved || saving) return;
    setSelected(index);
    if (index === question.correctIndex) {
      setSolved(true);
      if (!wrongAttempt) setFirstTryCount((count) => count + 1);
      setError(null);
    } else {
      setWrongAttempt(true);
      setShowHint(true);
    }
  };

  const next = () => {
    if (!solved) return;
    if (step === expedition.questions.length - 1) {
      setIsDone(true);
      return;
    }
    setStep((value) => value + 1);
    setSolved(false);
    setWrongAttempt(false);
    setShowHint(false);
    setSelected(null);
  };

  const complete = async () => {
    if (savingRef.current || !isDone) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      // Mark before the XP update to prevent repeated taps from farming the reward.
      // This is a small, local-only beta reward; cross-device grants need a
      // server-side idempotency key before the feature is promoted.
      const already = await AsyncStorage.getItem(storageKey);
      if (already !== expedition.id) {
        await AsyncStorage.setItem(storageKey, expedition.id);
        await addIslandXp(DAILY_REWARD_XP, "study_expedition", { dateKey, expeditionId: expedition.id });
      }
      setCompleted(true);
      setReviewing(false);
    } catch (cause) {
      console.warn("[StudyExpeditions] could not finish", cause);
      const marked = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (marked === expedition.id) {
        setCompleted(true);
        setReviewing(false);
        setError("Your expedition was saved. The Island XP may not have been credited.");
      } else {
        setError("We couldn't save your expedition. Please try again.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const review = () => {
    setReviewing(true);
    setStep(0);
    setSelected(null);
    setSolved(false);
    setWrongAttempt(false);
    setShowHint(false);
    setFirstTryCount(0);
    setIsDone(false);
    setError(null);
  };

  return (
    <LinearGradient colors={tokens.gradient} style={S.screen}>
      <ScrollView contentContainerStyle={S.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={S.back}>
          <Ionicons name="arrow-back" color={tokens.text} size={18} />
          <Text style={[S.backText, { color: tokens.text }]}>Back to learning</Text>
        </Pressable>
        <Text style={[S.eyebrow, { color: tokens.accent }]}>TODAY'S STUDY EXPEDITION</Text>
        <Text style={[S.title, { color: tokens.text }]}>{expedition.title}</Text>
        <Text style={[S.subtitle, { color: tokens.cardText }]}>{expedition.subtitle}</Text>
        <Text style={[S.intro, { color: tokens.text }]}>{expedition.introduction}</Text>
        <View style={S.progressRow}>
          {expedition.questions.map((q, i) => (
            <View key={i} style={[S.progressPill, { backgroundColor: i <= step || isDone ? tokens.accent : tokens.border }]} />
          ))}
        </View>
        {loading ? <ActivityIndicator color={tokens.accent} size="large" /> : completed && !reviewing ? (
          <View style={[S.panel, { borderColor: tokens.accent, backgroundColor: tokens.card }]}>
            <Ionicons name="checkmark-circle" size={40} color={tokens.accent} />
            <Text style={[S.panelHeading, { color: tokens.text }]}>Expedition completed!</Text>
            <Text style={[S.body, { color: tokens.cardText }]}>You can revisit today's lesson whenever you'd like. Tomorrow brings another expedition.</Text>
            <Pressable style={[S.primary, { backgroundColor: tokens.accent }]} onPress={review}>
              <Text style={S.primaryText}>Review today's lesson</Text>
            </Pressable>
          </View>
        ) : isDone ? (
          <View style={[S.panel, { borderColor: tokens.accent, backgroundColor: tokens.card }]}>
            <Text style={[S.panelHeading, { color: tokens.text }]}>The path is clear!</Text>
            <Text style={[S.body, { color: tokens.cardText }]}>You solved all three challenges and got {firstTryCount} right on your first try. Mistakes are part of learning.</Text>
            <Text style={[S.body, { color: tokens.cardText }]}>{reviewing ? "Review complete. You've already earned today's reward." : "Finish to save your progress and earn 5 Island XP once today."}</Text>
            {reviewing ? (
              <Pressable style={[S.primary, { backgroundColor: tokens.accent }]} onPress={() => { setReviewing(false); setCompleted(true); }}>
                <Text style={S.primaryText}>Return to expedition</Text>
              </Pressable>
            ) : (
              <Pressable style={[S.primary, { backgroundColor: tokens.accent }]} onPress={() => { void complete(); }} disabled={saving}>
                <Text style={S.primaryText}>{saving ? "Saving..." : "Complete expedition"}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={[S.panel, { borderColor: tokens.border, backgroundColor: tokens.card }]}>
            <Text style={[S.stepText, { color: tokens.accent }]}>CHALLENGE {step + 1} OF {expedition.questions.length}</Text>
            <Text style={[S.question, { color: tokens.text }]}>{question.question}</Text>
            {question.choices.map((choice, i) => (
              <Pressable key={i} onPress={() => choose(i)} accessibilityRole="button" disabled={solved} style={[S.choice, { borderColor: solved && i === question.correctIndex ? tokens.accent : tokens.border, backgroundColor: selected === i ? "rgba(0,229,255,0.16)" : "transparent" }]}>
                <Text style={[S.choiceText, { color: tokens.text }]}>{choice}</Text>
                {solved && i === question.correctIndex ? <Ionicons name="checkmark-circle" color={tokens.accent} size={20} /> : null}
              </Pressable>
            ))}
            {!solved && !showHint ? (
              <Pressable onPress={() => setShowHint(true)} accessibilityRole="button" style={S.hintButton}>
                <Text style={[S.hintText, { color: tokens.accent }]}>Need a hint?</Text>
              </Pressable>
            ) : null}
            {!solved && showHint ? (
              <Text style={[S.body, { color: tokens.cardText }]}>{wrongAttempt ? "Not quite. Try another answer! " : ""}{question.hint}</Text>
            ) : null}
            {solved ? (
              <>
                <Text style={[S.correct, { color: tokens.accent }]}>That's right!</Text>
                <Text style={[S.body, { color: tokens.text }]}>{question.explanation}</Text>
                <Pressable style={[S.primary, { backgroundColor: tokens.accent }]} onPress={next}>
                  <Text style={S.primaryText}>{step + 1 === expedition.questions.length ? "See results" : "Continue"}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
        {error ? <Text accessibilityRole="alert" style={[S.error, { color: tokens.text }]}>{error}</Text> : null}
        <Text style={[S.footer, { color: tokens.cardText }]}>A little progress every day. All learning activities stay available without an extra purchase.</Text>
      </ScrollView>
    </LinearGradient>
  );
}
const S = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 64, maxWidth: 640, width: "100%", alignSelf: "center", gap: 12 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  backText: { fontSize: 14, fontWeight: "700" },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.6, marginTop: 8 },
  title: { fontSize: 28, fontWeight: "900" },
  subtitle: { fontSize: 14, fontWeight: "700" },
  intro: { fontSize: 15, lineHeight: 23, marginTop: 2 },
  progressRow: { flexDirection: "row", gap: 6, marginVertical: 10 },
  progressPill: { flex: 1, height: 6, borderRadius: 99, opacity: 0.9 },
  panel: { borderWidth: 1.5, borderRadius: 18, padding: 18, gap: 12 },
  panelHeading: { fontSize: 22, fontWeight: "800" },
  stepText: { fontSize: 12, letterSpacing: 1.2, fontWeight: "800" },
  question: { fontSize: 19, lineHeight: 26, fontWeight: "800", marginBottom: 4 },
  choice: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 12, minHeight: 50, padding: 13 },
  choiceText: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  hintButton: { paddingVertical: 10 },
  hintText: { fontWeight: "700" },
  correct: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21 },
  primary: { borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 14, marginTop: 4 },
  primaryText: { color: "#05202a", fontWeight: "900", fontSize: 15 },
  error: { borderWidth: 1, borderColor: "#f97373", borderRadius: 10, padding: 12 },
  footer: { textAlign: "center", fontSize: 12, lineHeight: 19, marginTop: 4 },
});
