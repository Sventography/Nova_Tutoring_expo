// app/hooks/useServerAskAchievements.ts
import { useCallback } from "react";

import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

type RemoteAskStatusRow = {
  successful_questions?: number | string | null;
  achievement_ids?: string[] | null;
};

export type ServerAskAchievementStatus = {
  successfulQuestions: number;
  achievementIds: string[];
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

  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : 0;
}

function uniqueIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) =>
          String(value || "").trim()
        )
        .filter(Boolean)
    )
  );
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useServerAskAchievements() {
  const { supabaseUserId } = useUser() as any;

  const serverBacked =
    !!(
      supabaseUserId &&
      String(supabaseUserId).trim()
    );

  const refreshEligibility = useCallback(
    async (): Promise<ServerAskAchievementStatus> => {
      if (!serverBacked) {
        throw new Error(
          "Server Ask achievements require a signed-in user."
        );
      }

      let lastError: any = null;

      for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
      ) {
        const { data, error } =
          await supabase.rpc(
            "nova_ask_achievement_status"
          );

        if (!error) {
          const row =
            firstRpcRow<RemoteAskStatusRow>(
              data
            );

          if (!row) {
            throw new Error(
              "Ask achievement server returned no status."
            );
          }

          return {
            successfulQuestions:
              safeInt(
                row.successful_questions
              ),
            achievementIds:
              uniqueIds(
                row.achievement_ids
              ),
          };
        }

        lastError = error;

        if (attempt < 2) {
          await wait(
            attempt === 0 ? 200 : 600
          );
        }
      }

      console.warn(
        "[AskAchievements] status failed after retries",
        lastError
      );

      throw lastError;
    },
    [serverBacked]
  );

  return {
    serverBacked,
    refreshEligibility,
  };
}
