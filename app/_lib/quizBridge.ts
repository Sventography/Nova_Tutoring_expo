// app/_lib/quizBridge.ts
import { add as addQuizHistory } from "./quizHistory";
import { reportQuizFinished } from "../utils/report-quiz-finish";
import { unlockQuizAchievements } from "../utils/achievements-bridge";
import { createCertificate } from "../utils/certificates";
import { showToast } from "../utils/toast";

export type QuizBridgePayload = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent?: number;
  username?: string | null;
};

export async function handleQuizFinished(payload: QuizBridgePayload) {
  const { topicId, title, total, correct, username } = payload;
  const percent =
    typeof payload.percent === "number"
      ? payload.percent
      : total
      ? Math.round((correct / total) * 100)
      : 0;

  console.log("[quizBridge] handleQuizFinished", {
    topicId,
    title,
    total,
    correct,
    percent,
  });

  // 1) HISTORY
  try {
    await addQuizHistory({ topicId, title, total, correct, percent });
    console.log("[quizBridge] history add OK");
  } catch (err) {
    console.log("[quizBridge] history add FAILED", err);
  }

  // 2) Achievements reporter
  try {
    await reportQuizFinished(percent, topicId);
  } catch (err) {
    console.log("[quizBridge] reportQuizFinished FAILED", err);
  }

  // 3) Achievements unlocks
  try {
    await unlockQuizAchievements({
      correct,
      total,
      pct: percent,
      topicId,
    });
  } catch (err) {
    console.log("[quizBridge] unlockQuizAchievements FAILED", err);
  }
}
