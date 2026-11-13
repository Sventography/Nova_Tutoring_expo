// app/_lib/log-quiz-result.ts
import { add as addQuizHistory } from "./quizHistory";

type LogParams = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
};

export async function logQuizResult(params: LogParams) {
  try {
    console.log("[logQuizResult] about to store quiz entry", params);
    await addQuizHistory({
      topicId: params.topicId,
      title: params.title || "Quiz",
      total: params.total,
      correct: params.correct,
      percent: params.percent,
    });
    console.log("[logQuizResult] stored quiz entry OK");
  } catch (err) {
    console.log("[logQuizResult] FAILED to store quiz entry", err);
  }
}

