import { supabase } from "../lib/supabase";

export const ARCHIVE_STAR_ID = "seventeenth_star" as const;

export async function getArchiveAwardDate(userId: string): Promise<number | null> {
  const { data, error } = await supabase.from("nova_archive_completions")
    .select("completed_at").eq("user_id", userId).lte("finish_number", 20).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const timestamp = Date.parse(data.completed_at);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid archive award date");
  return timestamp;
}

export type ArchiveReward = {
  status: "awarded" | "already_awarded" | "completed" | "closed" | "retry" | "question" | "incorrect" | "stale" | "wait";
  challenge?: string;
  question?: string;
  step?: number;
  total?: number;
  retry_after?: number;
};

// Explicit staging/release gate. This client never uses the old fixed-phrase endpoint.
const ARCHIVE_CLAIMS_READY = process.env.EXPO_PUBLIC_ARCHIVE_VERIFICATION_ENABLED === "true";
export async function completeArchive(base: string, token: string, evidence?: { challenge: string; answer: string }): Promise<ArchiveReward> {
  if (!ARCHIVE_CLAIMS_READY) return { status: "closed" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(base + "/api/archive/verification", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(evidence ? { action: "answer", ...evidence } : { action: "start" }),
    });
    const payload = await response.json();
    const status = payload.status;
    if (status === "closed") return { status };
    if (response.ok && ["awarded", "already_awarded", "completed", "wait"].includes(status)) return { status, retry_after: payload.retry_after };
    if (response.ok && ["question", "incorrect", "stale"].includes(status) &&
        typeof payload.challenge === "string" && typeof payload.question === "string") {
      return { status, challenge: payload.challenge, question: payload.question, step: payload.step, total: payload.total };
    }
    return { status: "retry" };
  } catch {
    return { status: "retry" };
  } finally {
    clearTimeout(timeout);
  }
}
export function archiveReceiptText(receipt: ArchiveReward): string {
  switch (receipt.status) {
    case "question": case "incorrect": case "stale":
      return (receipt.status === "incorrect" ? "Not quite. Look at your retained notes. " : receipt.status === "stale" ? "This is the current question. " : "") +
        "Before I seal your account's record, help me check what survived (" + receipt.step + "/" + receipt.total + ").\n\n" +
        receipt.question + "\n\nReply with Archive: followed by a few words. You can return to studying at any time; replay Session 017 to resume.";
    case "wait": return "The record needs a little time before another attempt. Try replaying Session 017 in about " + Math.max(1, Math.ceil((receipt.retry_after ?? 900)/60)) + " minutes.";
    case "awarded": return "First Twenty · 25,000 Nova Coins, the First Twenty badge, and the Seventeenth Star were added to your account.";
    case "already_awarded": return "First Twenty · Your 25,000 Nova Coins, First Twenty badge, and Seventeenth Star are already recorded.";
    case "completed": return "Your archive completion is recorded. All twenty reward places have been claimed.";
    case "closed": return "Session 017 is closed. Reward claims are currently closed.";
    default: return "Your reveal is saved. Replay Session 017 to resume checking your account receipt.";
  }
}
