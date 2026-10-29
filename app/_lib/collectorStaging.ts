/**
 * Fail-closed boundaries for real-account collector staging.
 *
 * A staging run must connect to an isolated Supabase Auth project AND a
 * separate backend. Do not test reward grants with production user accounts.
 * This file contains public project references, never secret credentials.
 */
export const COLLECTOR_STAGING_MODE =
  process.env.EXPO_PUBLIC_COLLECTOR_STAGING_MODE === "true";

// A separately deployed HTTPS preview can run with a production-optimized
// web bundle. This extra explicit switch must NEVER be enabled in a live app
// build. Both staging URLs are still checked against the production denylist.
export const COLLECTOR_STAGING_BUILD_ALLOWED =
  __DEV__ || process.env.EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW === "true";

// Live Nova Auth and its historical inactive project are both forbidden as
// staging targets. Project refs are public identifiers, not API keys.
const ONLY_ALLOWED_STAGING_REF = "gouhhltupxaycuysdtrw";

const FORBIDDEN_SUPABASE_REFS = new Set([
  "owlbqyiqsyfcrpqqfacp",
  "zgrixkqcowitlygbvrlw",
]);

const PRODUCTION_BACKENDS = new Set([
  "nove-tutoring-backend.onrender.com",
  "nova-tutoring-backend.onrender.com",
]);

function parsedUrl(value: string): URL | null {
  try {
    const result = new URL(value.trim());
    if (result.username || result.password || result.search || result.hash) return null;
    return result;
  } catch {
    return null;
  }
}

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function hostedSupabaseRef(hostname: string): string | null {
  const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  return match ? match[1] : null;
}

export function collectorStagingConfigError(
  supabaseUrl: string,
  backendUrl: string,
  allowedBuild: boolean,
): string | null {
  if (!allowedBuild) return "Collector staging requires a dev build or explicit staging web preview.";

  const auth = parsedUrl(supabaseUrl);
  if (!auth) return "Provide a valid isolated EXPO_PUBLIC_SUPABASE_URL for staging.";
  const ref = hostedSupabaseRef(auth.hostname);
  if (!ref) {
    return "Staging Auth must use a dedicated hosted Supabase project.";
  }
  if (ref && FORBIDDEN_SUPABASE_REFS.has(ref)) {
    return "Collector staging refuses Nova's production or former Supabase project.";
  }
  if (ref !== ONLY_ALLOWED_STAGING_REF) {
    return "Collector staging requires the dedicated nova-collector-staging project.";
  }
  if (auth.protocol !== "https:" || (auth.pathname !== "/" && auth.pathname !== "")) {
    return "Hosted staging Supabase Auth must use a root HTTPS URL.";
  }

  const backend = parsedUrl(backendUrl);
  if (!backend) return "Provide a valid EXPO_PUBLIC_BACKEND_URL for isolated staging.";
  if (PRODUCTION_BACKENDS.has(backend.hostname)) {
    return "Collector staging refuses Nova's live Render backend.";
  }
  if (backend.origin !== auth.origin) {
    return "Staging collector API must use the same isolated Supabase Edge project as Auth.";
  }
  if (backend.pathname !== "/" && backend.pathname !== "") {
    return "Staging collector backend URL must not contain a path.";
  }
  if (backend.protocol !== "https:" &&
    !(backend.protocol === "http:" && isLocalhost(backend.hostname))) {
    return "Staging collector backend must use HTTPS or local loopback.";
  }
  // Never send real Auth access tokens over unencrypted LAN connections.
  return null;
}

export function collectorStagingStorageKey(supabaseUrl: string): string {
  if (!COLLECTOR_STAGING_MODE) return "nova.supabase.auth.v3";
  // Never share an old live-app session with a staging Auth project. Include
  // the full URL so two distinct localhost projects also remain separate.
  const suffix = Array.from(supabaseUrl)
    .map((char) => char.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
  return "nova.supabase.auth.v3.collector-stage." + suffix;
}
