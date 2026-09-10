// app/_lib/focusPracticeInsights.ts
import { getAll as getQuizHistory } from "./quizHistory";
import {
  getFocusMistakes,
  type FocusPracticeMistake,
} from "./focusPractice";

export type FocusTopicInsight = {
  topicId: string;
  title: string;
  attempts: number;
  averagePercent: number | null;
  bestPercent: number | null;
  latestPercent: number | null;
  uniqueMistakes: number;
  repeatMisses: number;
  recoveredAnswers: number;
  unresolvedMistakes: number;
  focusScore: number;
  level: "high" | "medium" | "low";
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safePercent(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), 0, 100);
}

function scoreTopic(params: {
  averagePercent: number | null;
  latestPercent: number | null;
  uniqueMistakes: number;
  repeatMisses: number;
  unresolvedMistakes: number;
  recoveredAnswers: number;
}): number {
  let score = 0;

  if (params.averagePercent != null) {
    score += (100 - params.averagePercent) * 0.45;
  }

  if (params.latestPercent != null) {
    score += (100 - params.latestPercent) * 0.25;
  }

  score += Math.min(25, params.uniqueMistakes * 4);
  score += Math.min(20, params.repeatMisses * 2.5);
  score += Math.min(20, params.unresolvedMistakes * 3);
  score -= Math.min(18, params.recoveredAnswers * 2);

  return Math.round(clamp(score, 0, 100));
}

function levelFor(score: number): "high" | "medium" | "low" {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export async function getFocusTopicInsights(): Promise<FocusTopicInsight[]> {
  const [history, mistakes] = await Promise.all([
    getQuizHistory(),
    getFocusMistakes(),
  ]);

  const topicIds = new Set<string>();

  history.forEach((entry) => {
    if (entry.topicId) topicIds.add(String(entry.topicId));
  });

  mistakes.forEach((item) => {
    if (item.topicId) topicIds.add(String(item.topicId));
  });

  const insights: FocusTopicInsight[] = [];

  for (const topicId of topicIds) {
    const attempts = history.filter(
      (entry) => String(entry.topicId) === topicId
    );

    const topicMistakes = mistakes.filter(
      (item) => String(item.topicId) === topicId
    );

    const percentages = attempts
      .map((entry) => safePercent(entry.percent))
      .filter((value): value is number => value != null);

    const averagePercent = percentages.length
      ? Math.round(
          percentages.reduce((sum, value) => sum + value, 0) /
            percentages.length
        )
      : null;

    const bestPercent = percentages.length
      ? Math.max(...percentages)
      : null;

    const latestPercent = attempts.length
      ? safePercent(attempts[0]?.percent)
      : null;

    const uniqueMistakes = topicMistakes.length;

    const repeatMisses = topicMistakes.reduce(
      (sum, item) => sum + Math.max(0, item.missCount - 1),
      0
    );

    const recoveredAnswers = topicMistakes.reduce(
      (sum, item) => sum + Math.max(0, item.correctAfterMissCount),
      0
    );

    const unresolvedMistakes = topicMistakes.filter(
      (item) => item.correctAfterMissCount < item.missCount
    ).length;

    const title =
      attempts.find((entry) => entry.title)?.title ||
      topicMistakes.find((item) => item.topicTitle)?.topicTitle ||
      topicId;

    const focusScore = scoreTopic({
      averagePercent,
      latestPercent,
      uniqueMistakes,
      repeatMisses,
      unresolvedMistakes,
      recoveredAnswers,
    });

    insights.push({
      topicId,
      title,
      attempts: attempts.length,
      averagePercent,
      bestPercent,
      latestPercent,
      uniqueMistakes,
      repeatMisses,
      recoveredAnswers,
      unresolvedMistakes,
      focusScore,
      level: levelFor(focusScore),
    });
  }

  return insights.sort((a, b) => {
    if (b.focusScore !== a.focusScore) {
      return b.focusScore - a.focusScore;
    }

    if (b.unresolvedMistakes !== a.unresolvedMistakes) {
      return b.unresolvedMistakes - a.unresolvedMistakes;
    }

    return a.title.localeCompare(b.title);
  });
}

export async function getFocusMistakesForTopic(
  topicId: string
): Promise<FocusPracticeMistake[]> {
  const all = await getFocusMistakes();

  return all
    .filter((item) => String(item.topicId) === String(topicId))
    .sort((a, b) => {
      const aOpen = a.correctAfterMissCount < a.missCount ? 1 : 0;
      const bOpen = b.correctAfterMissCount < b.missCount ? 1 : 0;

      if (bOpen !== aOpen) return bOpen - aOpen;
      if (b.missCount !== a.missCount) return b.missCount - a.missCount;

      return a.lastMissedAt < b.lastMissedAt ? 1 : -1;
    });
}
