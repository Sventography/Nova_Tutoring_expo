"use strict";

const RELEASE_REF = "refs/heads/release/web-ios-working-20260115";
const VALID_MODES = ["build-only", "testflight"];

function validateRelease(env, config) {
  const problems = [];
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") problems.push("Manual dispatch required");
  if (env.GITHUB_REF !== RELEASE_REF) problems.push("Use the protected iOS release branch");
  const sha = env.GITHUB_SHA || "";
  if (!/^[0-9a-f]{40}$/.test(sha) || env.RELEASE_SHA !== sha || env.IOS_APPROVED_SHA !== sha) {
    problems.push("Dispatch SHA and environment-approved SHA must match the exact checkout");
  }
  if (env.IOS_RELEASE_ENABLED !== "true") problems.push("iOS release switch is not enabled");
  if (!VALID_MODES.includes(env.RELEASE_MODE)) problems.push("Invalid release mode");
  if (!/^\d+\.\d+\.\d+$/.test(env.EAS_CLI_VERSION || "")) problems.push("Set an exact reviewed EAS CLI version");
  const profile = config?.build?.production;
  if (profile?.environment !== "production" || profile?.distribution === "internal" || profile?.ios?.simulator === true) {
    problems.push("Expected store-distribution production build profile");
  }
  if (!profile || ["EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED", "EXPO_PUBLIC_COLLECTOR_STAGING_MODE", "EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW", "EXPO_PUBLIC_NORAS_LANTERN_PREVIEW"].some(key => profile.env?.[key] !== "false")) {
    problems.push("Collector and preview flags must remain disabled for this release");
  }
  if (env.RELEASE_MODE === "testflight") {
    const appId = config?.submit?.production?.ios?.ascAppId;
    if (typeof appId !== "string" || !/^\d+$/.test(appId) || appId !== env.IOS_ASC_APP_ID) {
      problems.push("Confirm matching App Store Connect numeric app ID in eas.json and protected environment");
    }
  }
  return problems;
}

module.exports = { validateRelease };

if (require.main === module) {
  const config = require("../eas.json");
  const problems = validateRelease(process.env, config);
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exitCode = 1;
  } else {
    console.log("Release guard passed for approved commit and mode.");
  }
}
