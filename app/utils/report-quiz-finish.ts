// app/utils/report-quiz-finish.ts
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCertificate } from "./certificates";

type Payload = {
  topicId?: string;
  topicTitle?: string;
  scorePct: number;
  correct?: number;
  total?: number;
  finishedAtISO?: string;
  username?: string | null;
};

const KEY = "@nova/quizHistory.v1";

// Safe on web/SSR: AsyncStorage web impl needs window at runtime, but this runs in browser (not Node).
const isSSR = typeof window === "undefined";

/**
 * Shared quiz finish funnel.
 *
 * Supports:
 *   reportQuizFinished({ scorePct, topicTitle, ... })
 *   reportQuizFinished(scorePct, topicTitle)
 */
export async function reportQuizFinished(
  p: Payload | number,
  topicTitleLegacy?: string
) {
  if (Platform.OS === "web" && isSSR) return;

  // Normalize arguments
  const payload: Payload =
    typeof p === "number"
      ? { scorePct: p, topicTitle: topicTitleLegacy || "" }
      : p;

  try {
    const finishedAtISO = payload.finishedAtISO || new Date().toISOString();

    const rec = {
      topicId: payload.topicId || "",
      topicTitle: payload.topicTitle || "",
      scorePct: Number(payload.scorePct || 0),
      correct:
        typeof payload.correct === "number" ? payload.correct : undefined,
      total: typeof payload.total === "number" ? payload.total : undefined,
      finishedAtISO,
      username: payload.username || undefined,
    };

    // 🔹 1) Log simple quiz history locally
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(arr) ? [rec, ...arr].slice(0, 200) : [rec];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));

    // 🔹 2) Auto-award a certificate for 80%+ scores
    try {
      if (rec.scorePct >= 80) {
        const quizTitle = rec.topicTitle || "Quiz";
        // Name is optional; CertificatesScreen will fall back to current user
        await createCertificate({
          quizTitle,
          scorePct: rec.scorePct,
          // You *can* add name/username later; they're optional in the meta type.
        });
      }
    } catch (e) {
      console.warn("[reportQuizFinished] createCertificate failed", e);
    }

    return rec;
  } catch (e) {
    console.warn("[reportQuizFinished] failed", e);
    return null;
  }
}