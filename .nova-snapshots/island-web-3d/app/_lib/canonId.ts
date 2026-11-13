// app/_lib/canonId.ts

/**
 * Canonicalizes IDs across the app so the same item matches everywhere
 * even if older code stored variants like:
 *  - cursor:star_trail vs cursor:star-trail
 *  - theme:black_gold vs theme:blackgold
 *  - cursor_orb vs cursor:orb
 *
 * Rules:
 * - Keep the prefix separator ":" if present (DO NOT remove it)
 * - Lowercase
 * - Convert underscores/spaces to hyphens in the suffix
 * - Normalize known legacy aliases
 */
export function canonId(id: string) {
  if (!id) return "";

  let v = String(id).trim().toLowerCase();

  // normalize whitespace
  v = v.replace(/\s+/g, "");

  // If it has a prefix, preserve it (theme:, cursor:, companion:, etc.)
  if (v.includes(":")) {
    const parts = v.split(":");
    const prefix = parts.shift() || "";
    const restRaw = parts.join(":"); // in case stray ":" existed
    const rest = restRaw.replace(/_/g, "-").replace(/\s+/g, "-");
    v = `${prefix}:${rest}`;
  } else {
    // Legacy "cursor_orb" / "theme_neon" styles
    v = v.replace(/_/g, "-").replace(/\s+/g, "-");

    if (v.startsWith("cursor-")) v = "cursor:" + v.replace(/^cursor-/, "");
    if (v.startsWith("theme-")) v = "theme:" + v.replace(/^theme-/, "");
    if (v.startsWith("companion-"))
      v = "companion:" + v.replace(/^companion-/, "");
  }

  // Alias normalization
  if (v === "cursor:startrail") v = "cursor:star-trail";
  if (v === "cursor:star_trail") v = "cursor:star-trail";

  if (v === "theme:black_gold") v = "theme:blackgold";
  if (v === "theme:black-gold") v = "theme:blackgold";

  if (v === "theme:neon_purple") v = "theme:neonpurple";
  if (v === "theme:neon-purple") v = "theme:neonpurple";

  // Long-name -> base (if older variants exist)
  if (v === "theme:crimson-dream" || v === "theme:crimson_dream") v = "theme:crimson";
  if (v === "theme:emerald-wave" || v === "theme:emerald_wave") v = "theme:emerald";
  if (v === "theme:silver-frost" || v === "theme:silver_frost") v = "theme:silver";

  // Common legacy product ids (App Store IDs / old catalog ids)
  if (v === "theme_neon" || v === "theme:neon_nova") v = "theme:neon";
  if (v === "cursor_glow") v = "cursor:glow";
  if (v === "cursor_orb") v = "cursor:orb";
  if (v === "cursor_star_trail" || v === "cursor_star-trail") v = "cursor:star-trail";

  return v;
}