export type QuizLike = any;

export function computeQuizMetrics(q: QuizLike) {
  const correct = Number(q?.correct ?? q?.score ?? q?.result?.correct ?? 0) || 0;
  const total   = Number(q?.total ?? q?.questions?.length ?? q?.result?.total ?? q?.len ?? 20) || 1;
  const scorePct = Math.round((correct / Math.max(1, total)) * 100);
  let durationSec =
    Number(q?.durationSec ?? q?.result?.durationSec) ||
    (
      (q?.endedAt || q?.endTime) && (q?.startedAt || q?.startTime)
        ? Math.max(0, Math.round((new Date(q.endedAt || q.endTime).getTime() - new Date(q.startedAt || q.startTime).getTime()) / 1000))
        : 9999
    );
  if (!Number.isFinite(durationSec) || durationSec <= 0) durationSec = 9999;
  const subject =
    q?.subject ||
    q?.topic ||
    q?.result?.subject ||
    q?.meta?.subject ||
    q?.params?.subject ||
    "general";
  return { correct, total, scorePct, durationSec, subject };
}
