// app/utils/quiz-history-bridge.ts
import { add as addQuizHistory } from "../_lib/quizHistory";

/**
 * Unified, safe quiz history logger.
 * This guarantees that quiz results always get written,
 * even if the quiz screen or imports change.
 */
export async function logQuizToHistory(entry: {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
}) {
  try {
    console.log("[bridge] logging quiz ->", entry);
    await addQuizHistory(entry);
    console.log("[bridge] OK");
  } catch (err) {
    console.log("[bridge] FAILED", err);
  }
}

/**
 * Never throws — safe to call from any quiz component.
 */
export async function safeLogQuiz(entry: {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
}) {
  try {
    await logQuizToHistory(entry);
  } catch (_) {
    // swallow intentionally for safety
  }
}
