const { spawnSync } = require("node:child_process");

const STAGING_REF = "gouhhltupxaycuysdtrw";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;

function previewEnvironment(env) {
  if (env.VERCEL_ENV !== "preview") return env;
  if (env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") !== STAGING_URL) {
    throw new Error("Set this preview branch's EXPO_PUBLIC_SUPABASE_URL to the isolated staging project.");
  }
  // Only a client publishable key is safe to embed in a static bundle.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "")) {
    throw new Error("Set this preview branch's EXPO_PUBLIC_SUPABASE_ANON_KEY to the staging publishable key.");
  }
  const host = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  if (!host || !/^[a-z0-9-]+\.vercel\.app$/i.test(host)) {
    throw new Error("A Vercel preview hostname is required for isolated authentication callbacks.");
  }
  const callback = `https://${host}/auth/callback`;
  // There is no approved staging Flask backend. Keep even older callers off
  // production, local LAN services and billable APIs until one is provisioned.
  const disabledBackend = "https://nova-backend-disabled.invalid";
  return {
    ...env,
    EXPO_NO_DOTENV: "1",
    EXPO_PUBLIC_ISOLATED_PREVIEW: "true",
    EXPO_PUBLIC_BACKEND_URL: disabledBackend,
    EXPO_PUBLIC_API_URL: disabledBackend,
    EXPO_PUBLIC_API_BASE: disabledBackend,
    EXPO_PUBLIC_AUTH_CONFIRMATION_URL: callback,
    EXPO_PUBLIC_PASSWORD_RECOVERY_URL: callback,
    EXPO_PUBLIC_WEB_PASSWORD_RECOVERY_URL: callback,
    EXPO_PUBLIC_ANALYTICS_URL: "",
    EXPO_PUBLIC_OPENAI_API_KEY: "",
    EXPO_PUBLIC_STRIPE_PK: "",
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
    EXPO_PUBLIC_GARDEN_CHECKS: "false",
    EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED: "false",
    EXPO_PUBLIC_ARCHIVE_VERIFICATION_ENABLED: "false",
  };
}

if (require.main === module) {
  const expo = require.resolve("expo/bin/cli");
  const run = spawnSync(process.execPath, [expo, "export", "-p", "web", ...process.argv.slice(2)], {
    env: previewEnvironment(process.env),
    stdio: "inherit",
  });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
}

module.exports = { previewEnvironment };
