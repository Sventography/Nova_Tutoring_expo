export function canonId(input?: string | null): string {
  if (!input) return "";
  let s = String(input).trim().toLowerCase();

  // unify separators/spaces/underscores
  s = s.replace(/\s*&\s*/g, "-and-");   // "Black & Gold" -> "black-and-gold"
  s = s.replace(/[\s_]+/g, "-");        // spaces/underscores -> dash
  s = s.replace(/-+/g, "-");            // collapse multiple dashes
  s = s.replace(/[^a-z0-9-]/g, "");     // strip non alnum/dash
  s = s.replace(/^-|-$/g, "");          // trim dashes

  // known aliases
  const aliases: Record<string, string> = {
    "black-gold": "black-and-gold",
  };
  if (aliases[s]) s = aliases[s];
  return s;
}

export function canonNs(kind: "theme" | "cursor" | "item", id: string) {
  const c = canonId(id);
  return kind === "item" ? c : `${kind}:${c}`;
}
