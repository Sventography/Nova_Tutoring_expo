// app/hooks/useServerQuizAchievementAttempt.ts
import { useCallback, useEffect, useRef } from "react";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

export type ServerQuizAchievementFinishResult = {
  completed: boolean;
  attemptId: string | null;
  answeredCount: number;
  correctCount: number;
  scorePct: number;
  achievementIds: string[];
};

type RemoteFinishRow = {
  completed?: boolean | null;
  quiz_attempt_id?: string | null;
  answered_count?: number | string | null;
  correct_count?: number | string | null;
  score_pct?: number | string | null;
  achievement_ids?: string[] | null;
};

function firstRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  if (data && typeof data === "object") {
    return data as T;
  }
  return null;
}

function safeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function uniqueIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useServerQuizAchievementAttempt(
  topicIdInput: string,
  subjectKeyInput: string,
  titleInput?: string
) {
  const { supabaseUserId } = useUser() as any;

  const serverBacked =
    !!(supabaseUserId && String(supabaseUserId).trim());

  const topicId =
    String(topicIdInput || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown";

  const subjectKey =
    String(subjectKeyInput || "general")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "general";

  const title = String(titleInput || "").trim();

  const attemptIdRef = useRef<string | null>(null);
  const beginPromiseRef = useRef<Promise<string | null> | null>(null);
  const answerQueueRef = useRef<Promise<void>>(Promise.resolve());
  const generationRef = useRef(0);

  const rpcWithRetry = useCallback(
    async (
      fn: () => Promise<{ data: any; error: any }>,
      label: string
    ) => {
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await fn();

        if (!error) {
          return data;
        }

        lastError = error;

        if (attempt < 2) {
          await wait(attempt === 0 ? 200 : 600);
        }
      }

      console.warn(
        `[QuizAchievements] ${label} failed after retries`,
        lastError
      );
      throw lastError;
    },
    []
  );

  const ensureAttempt = useCallback(async (): Promise<string | null> => {
    if (!serverBacked) return null;

    if (attemptIdRef.current) {
      return attemptIdRef.current;
    }

    if (beginPromiseRef.current) {
      return beginPromiseRef.current;
    }

    const generation = generationRef.current;

    const promise = (async () => {
      const data = await rpcWithRetry(
        () =>
          supabase.rpc(
            "nova_begin_quiz_achievement_attempt",
            {
              p_topic_id: topicId,
              p_subject_key: subjectKey,
              p_title: title || null,
            }
          ),
        "begin attempt"
      );

      const attemptId =
        typeof data === "string"
          ? data
          : String(
              (data as any)?.attempt_id ??
              (Array.isArray(data)
                ? (data[0] as any)?.attempt_id
                : "") ??
              ""
            ).trim();

      if (!attemptId) {
        throw new Error(
          "Quiz achievement server did not return an attempt ID."
        );
      }

      if (generation === generationRef.current) {
        attemptIdRef.current = attemptId;
      }

      return attemptId;
    })();

    beginPromiseRef.current = promise;

    try {
      return await promise;
    } finally {
      if (beginPromiseRef.current === promise) {
        beginPromiseRef.current = null;
      }
    }
  }, [
    rpcWithRetry,
    serverBacked,
    subjectKey,
    title,
    topicId,
  ]);

  useEffect(() => {
    generationRef.current += 1;
    attemptIdRef.current = null;
    beginPromiseRef.current = null;
    answerQueueRef.current = Promise.resolve();

    if (serverBacked) {
      void ensureAttempt().catch((error) => {
        console.warn(
          "[QuizAchievements] initial attempt begin failed",
          error
        );
      });
    }
  }, [
    ensureAttempt,
    serverBacked,
    subjectKey,
    topicId,
  ]);

  const recordAnswer = useCallback(
    async (
      questionIndex: number,
      correct: boolean
    ): Promise<void> => {
      if (!serverBacked) return;

      const run = answerQueueRef.current
        .catch(() => {})
        .then(async () => {
          const attemptId = await ensureAttempt();
          if (!attemptId) return;

          await rpcWithRetry(
            () =>
              supabase.rpc(
                "nova_record_quiz_achievement_answer",
                {
                  p_attempt_id: attemptId,
                  p_question_index:
                    Math.max(
                      0,
                      Math.min(
                        19,
                        Math.trunc(
                          Number(questionIndex) || 0
                        )
                      )
                    ),
                  p_correct: !!correct,
                }
              ),
            `record answer ${questionIndex}`
          );
        });

      answerQueueRef.current = run;
      await run;
    },
    [
      ensureAttempt,
      rpcWithRetry,
      serverBacked,
    ]
  );

  const finishAttempt = useCallback(
    async (): Promise<ServerQuizAchievementFinishResult> => {
      if (!serverBacked) {
        return {
          completed: false,
          attemptId: null,
          answeredCount: 0,
          correctCount: 0,
          scorePct: 0,
          achievementIds: [],
        };
      }

      await answerQueueRef.current;

      const attemptId = await ensureAttempt();

      if (!attemptId) {
        throw new Error(
          "Quiz achievement attempt was not available."
        );
      }

      const data = await rpcWithRetry(
        () =>
          supabase.rpc(
            "nova_finish_quiz_achievement_attempt",
            {
              p_attempt_id: attemptId,
            }
          ),
        "finish attempt"
      );

      const row =
        firstRpcRow<RemoteFinishRow>(data);

      if (!row) {
        throw new Error(
          "Quiz achievement server returned no finish result."
        );
      }

      return {
        completed: row.completed === true,
        attemptId:
          String(
            row.quiz_attempt_id ||
            attemptId
          ).trim() || attemptId,
        answeredCount:
          safeInt(row.answered_count),
        correctCount:
          safeInt(row.correct_count),
        scorePct:
          safeInt(row.score_pct),
        achievementIds:
          uniqueIds(row.achievement_ids),
      };
    },
    [
      ensureAttempt,
      rpcWithRetry,
      serverBacked,
    ]
  );

  const beginNewAttempt = useCallback(
    async (): Promise<void> => {
      if (!serverBacked) return;

      try {
        await answerQueueRef.current;
      } catch {
        // A failed old answer should not poison the next retake.
      }

      generationRef.current += 1;
      attemptIdRef.current = null;
      beginPromiseRef.current = null;
      answerQueueRef.current = Promise.resolve();

      await ensureAttempt();
    },
    [
      ensureAttempt,
      serverBacked,
    ]
  );

  return {
    serverBacked,
    recordAnswer,
    finishAttempt,
    beginNewAttempt,
  };
}
