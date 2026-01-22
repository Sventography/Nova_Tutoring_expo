// app/_lib/log-quiz-result.ts
import { add, QuizEntry, getAll } from "../_lib/quizHistory";

export type LogQuizParams = {
  topicId: string;
  title: string;
  total: number;
  correct: number;
  percent: number;
};

/**
 * Persist a finished quiz attempt into AsyncStorage so the History tab
 * can read and display it.
 */
export async function logQuizResult(params: LogQuizParams) {
  const entry: QuizEntry = {
    topicId: String(params.topicId || ""),
    title: params.title || "",
    total: Number(params.total || 0),
    correct: Number(params.correct || 0),
    percent: Number(params.percent || 0),
    finishedAt: new Date().toISOString(),
  };

  try {
    console.log("[quizHistory] logging quiz result", entry);
    await add(entry);

    // debug: see how many we have after saving
    const all = await getAll();
    console.log("[quizHistory] total entries after save:", all.length);
  } catch (err) {
    console.log("[quizHistory] logQuizResult failed", err);
  }
}
