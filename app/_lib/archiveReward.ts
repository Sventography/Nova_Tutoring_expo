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

type ArchiveReward = {
  status: "awarded" | "already_awarded" | "completed" | "closed" | "retry";
};

// Release gate: older deployed backends may still accept client-only evidence.
// Do not call them until the server-side verifier has been implemented, deployed and tested.
const ARCHIVE_CLAIMS_READY: boolean = false;
export async function completeArchive(base: string, token: string): Promise<ArchiveReward> {
  if (!ARCHIVE_CLAIMS_READY) return { status: "closed" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(base + "/api/archive/complete", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ recovered: "unerased first draft", prompt: "ask nova what she got wrong" }),
    });
    const payload = await response.json();
    const status = payload.status;
    if (status === "closed") return { status };
    if (response.ok && ["awarded", "already_awarded", "completed"].includes(status)) return { status };
    return { status: "retry" };
  } catch {
    return { status: "retry" };
  } finally {
    clearTimeout(timeout);
  }
}
