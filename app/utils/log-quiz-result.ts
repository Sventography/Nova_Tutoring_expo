// app/utils/log-quiz-result.ts
import { add as addQuizHistory } from "../_lib/quizHistory";

export async function logQuizResult(params: {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
}) {
  const { topicId, title, total, correct, percent } = params;

  try {
    await addQuizHistory({
      topicId,
      title,
      total,
      correct,
      percent,
      finishedAt: new Date().toISOString(),
    });
    console.log("[quiz] logged to history", {
      topicId,
      title,
      total,
      correct,
      percent,
    });
  } catch (err) {
    console.log("[quiz] logQuizResult failed", err);
  }
}
