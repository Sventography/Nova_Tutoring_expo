import { add } from "../_lib/quizHistory";

export async function logQuizResult(params: {
  topicId?: string;
  title?: string;
  total: number;
  correct: number;
  percent: number;
}) {
  const { topicId, title, total, correct, percent } = params;
  const entry = {
    topicId: String(topicId ?? title ?? "unknown"),
    title: String(title ?? topicId ?? "Unknown"),
    total: Number(total || 0),
    correct: Number(correct || 0),
    percent: Math.round(Number(percent || 0)),
    finishedAt: new Date().toISOString(),
  };
  await add(entry);
}
