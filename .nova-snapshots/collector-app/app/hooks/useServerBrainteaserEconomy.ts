// app/hooks/useServerBrainteaserEconomy.ts
import { useCallback } from "react";

import { supabase } from "../lib/supabase";
import { useCoins } from "../context/CoinsContext";
import { useUser } from "../context/UserContext";

type RemoteStatusRow = {
  day_key?: string | null;
  answered_count?: number | string | null;
  correct_count?: number | string | null;
  slot0_answered?: boolean | null;
  slot0_correct?: boolean | null;
  slot1_answered?: boolean | null;
  slot1_correct?: boolean | null;
  question_0?: string | null;
  question_1?: string | null;
  answered_pairs?: number | string | null;
  perfect_pairs?: number | string | null;
  correct_total?: number | string | null;
  achievement_ids?: string[] | null;
};

type RemoteAwardRow = RemoteStatusRow & {
  newly_submitted?: boolean | null;
  submitted_slot?: number | string | null;
  is_correct?: boolean | null;
  correct_answer?: string | null;
  answer_base_coins?: number | string | null;
  answer_coins?: number | string | null;
  perfect_bonus_base_coins?: number | string | null;
  perfect_bonus_coins?: number | string | null;
  total_coins_awarded?: number | string | null;
  pair_completed?: boolean | null;
  perfect_pair?: boolean | null;
  has_astral_nova?: boolean | null;
  has_aetherwyrm?: boolean | null;
};

export type ServerBrainteaserStatus = {
  dayKey: string;
  answeredCount: number;
  correctCount: number;
  slot0Answered: boolean;
  slot0Correct: boolean;
  slot1Answered: boolean;
  slot1Correct: boolean;
  question0: string;
  question1: string;
  answeredPairs: number;
  perfectPairs: number;
  correctTotal: number;
  achievementIds: string[];
};

export type ServerBrainteaserAward = ServerBrainteaserStatus & {
  newlySubmitted: boolean;
  submittedSlot: number;
  isCorrect: boolean;
  correctAnswer: string;
  answerBaseCoins: number;
  answerCoins: number;
  perfectBonusBaseCoins: number;
  perfectBonusCoins: number;
  totalCoinsAwarded: number;
  pairCompleted: boolean;
  perfectPair: boolean;
  hasAstralNova: boolean;
  hasAetherwyrm: boolean;
};

function firstRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  if (data && typeof data === "object") return data as T;
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

function normalizeStatus(row: RemoteStatusRow): ServerBrainteaserStatus {
  return {
    dayKey: String(row.day_key || ""),
    answeredCount: safeInt(row.answered_count),
    correctCount: safeInt(row.correct_count),
    slot0Answered: row.slot0_answered === true,
    slot0Correct: row.slot0_correct === true,
    slot1Answered: row.slot1_answered === true,
    slot1Correct: row.slot1_correct === true,
    question0: String(row.question_0 || "").trim(),
    question1: String(row.question_1 || "").trim(),
    answeredPairs: safeInt(row.answered_pairs),
    perfectPairs: safeInt(row.perfect_pairs),
    correctTotal: safeInt(row.correct_total),
    achievementIds: uniqueIds(row.achievement_ids),
  };
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useServerBrainteaserEconomy() {
  const { supabaseUserId } = useUser() as any;
  const { refreshCoins } = useCoins();

  const serverBacked =
    !!(supabaseUserId && String(supabaseUserId).trim());

  const rpcWithRetry = useCallback(
    async (
      fn: () => Promise<{ data: any; error: any }>,
      label: string
    ) => {
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await fn();
        if (!error) return data;

        lastError = error;
        if (attempt < 2) await wait(attempt === 0 ? 200 : 600);
      }

      console.warn(
        `[BrainteaserEconomy] ${label} failed after retries`,
        lastError
      );
      throw lastError;
    },
    []
  );

  const loadStatus = useCallback(
    async (): Promise<ServerBrainteaserStatus> => {
      if (!serverBacked) {
        throw new Error(
          "Server Brainteaser status requires a signed-in user."
        );
      }

      const data = await rpcWithRetry(
        () => supabase.rpc("nova_brainteaser_status"),
        "status"
      );

      const row = firstRpcRow<RemoteStatusRow>(data);
      if (!row) {
        throw new Error("Brainteaser server returned no status.");
      }

      const status = normalizeStatus(row);
      if (!status.question0 || !status.question1) {
        throw new Error(
          "Brainteaser server returned an incomplete daily pair."
        );
      }

      return status;
    },
    [rpcWithRetry, serverBacked]
  );

  const submitAnswer = useCallback(
    async (input: {
      slot: number;
      question: string;
      answer: string;
    }): Promise<ServerBrainteaserAward> => {
      if (!serverBacked) {
        throw new Error(
          "Server Brainteaser submission requires a signed-in user."
        );
      }

      const slot = Math.max(
        0,
        Math.min(1, Math.trunc(Number(input.slot) || 0))
      );

      const data = await rpcWithRetry(
        () =>
          supabase.rpc("nova_submit_brainteaser_answer", {
            p_slot: slot,
            p_question: String(input.question || ""),
            p_answer: String(input.answer || ""),
          }),
        `submit slot ${slot}`
      );

      const row = firstRpcRow<RemoteAwardRow>(data);
      if (!row) {
        throw new Error(
          "Brainteaser server returned no submission result."
        );
      }

      const status = normalizeStatus(row);
      const totalCoinsAwarded = safeInt(row.total_coins_awarded);

      if (row.newly_submitted === true && totalCoinsAwarded > 0) {
        await refreshCoins();
      }

      return {
        ...status,
        newlySubmitted: row.newly_submitted === true,
        submittedSlot: safeInt(row.submitted_slot),
        isCorrect: row.is_correct === true,
        correctAnswer: String(row.correct_answer || "").trim(),
        answerBaseCoins: safeInt(row.answer_base_coins),
        answerCoins: safeInt(row.answer_coins),
        perfectBonusBaseCoins: safeInt(row.perfect_bonus_base_coins),
        perfectBonusCoins: safeInt(row.perfect_bonus_coins),
        totalCoinsAwarded,
        pairCompleted: row.pair_completed === true,
        perfectPair: row.perfect_pair === true,
        hasAstralNova: row.has_astral_nova === true,
        hasAetherwyrm: row.has_aetherwyrm === true,
      };
    },
    [refreshCoins, rpcWithRetry, serverBacked]
  );

  return {
    serverBacked,
    loadStatus,
    submitAnswer,
  };
}
