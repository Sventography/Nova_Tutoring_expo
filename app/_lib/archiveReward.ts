type ArchiveReward = {
  status: "awarded" | "already_awarded" | "completed" | "closed" | "retry";
};

export async function completeArchive(base: string, token: string): Promise<ArchiveReward> {
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
