/**
 * Regression: the committed native ios/ directory must NOT cause the
 * collector EAS profile to install over the ordinary Nova Tutoring app.
 * Tests the actual Xcode project + Info.plist in a throwaway temp copy.
 * Never changes the repository native files or invokes Apple/EAS.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const overlay = require("./collector-staging-native-ios.cjs");

const root = path.resolve(__dirname, "..");
const xcodePath = path.join(root, overlay.PROJECT_RELATIVE);
const plistPath = path.join(root, overlay.PLIST_RELATIVE);
const originalProject = fs.readFileSync(xcodePath, "utf8");
const originalPlist = fs.readFileSync(plistPath, "utf8");

assert.equal(
  originalProject.split("PRODUCT_BUNDLE_IDENTIFIER = " + overlay.PRODUCTION_ID + ";").length - 1,
  2,
  "Original Xcode project must retain both production Debug/Release IDs"
);
assert.match(originalPlist, /<string>Nova Tutoring<\/string>/);
assert.match(originalPlist, /<string>nova<\/string>/);
assert.doesNotMatch(originalPlist, /NSLocalNetworkUsageDescription/,
  "Production Info.plist must remain untouched by staging network fix");
assert.doesNotMatch(originalPlist, /NSBonjourServices/,
  "Production Info.plist must not gain staging-only Bonjour discovery");
assert.ok(!originalProject.includes(overlay.STAGING_ID),
  "Do not commit staging-only iOS identifiers into production native source");

const modified = overlay.applyOverlayText(originalProject, originalPlist);
assert.equal(overlay.verifyOverlayText(modified.project, modified.plist), true);
assert.ok(!modified.project.includes("PRODUCT_BUNDLE_IDENTIFIER = " + overlay.PRODUCTION_ID + ";"));
assert.match(modified.plist, /<string>Nova Collector Staging<\/string>/);
assert.match(modified.plist, /<string>novacollectorstage<\/string>/);
assert.match(modified.plist, /<string>com\.sventography\.novatutoring\.ios\.collectorstage<\/string>/);
assert.ok(!modified.plist.includes("<string>nova</string>"));
assert.match(modified.plist, /<key>NSLocalNetworkUsageDescription<\/key>/,
  "Staging app must declare native local-network permission rationale");
assert.match(modified.plist, /<key>NSBonjourServices<\/key>/,
  "Staging app must declare Expo development server discovery");
assert.match(modified.plist, /<string>_expo\._tcp<\/string>/);
assert.match(modified.plist,
  /<key>NSAllowsLocalNetworking<\/key>\s*<true\/>/,
  "Staging app must preserve local HTTP access for Metro");

assert.throws(
  () => overlay.applyOverlayText(modified.project, modified.plist),
  /Expected exactly two production Xcode bundle-ID settings/,
  "Accidentally applying staging twice must fail closed"
);
assert.throws(
  () => overlay.applyOverlayText(originalProject.replace(
    "PRODUCT_BUNDLE_IDENTIFIER = " + overlay.PRODUCTION_ID + ";",
    "PRODUCT_BUNDLE_IDENTIFIER = fake.invalid;"
  ), originalPlist),
  /Expected exactly two production Xcode bundle-ID settings/,
  "Missing or mismatched native settings must fail closed"
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nova-collector-ios-overlay-"));
try {
  const tempProjectPath = path.join(tmp, overlay.PROJECT_RELATIVE);
  const tempPlistPath = path.join(tmp, overlay.PLIST_RELATIVE);
  fs.mkdirSync(path.dirname(tempProjectPath), { recursive: true });
  fs.mkdirSync(path.dirname(tempPlistPath), { recursive: true });
  fs.writeFileSync(tempProjectPath, originalProject);
  fs.writeFileSync(tempPlistPath, originalPlist);
  const utility = path.join(__dirname, "collector-staging-native-ios.cjs");
  execFileSync(process.execPath, [utility, "--apply", "--root", tmp], { encoding: "utf8" });
  execFileSync(process.execPath, [utility, "--verify", "--root", tmp], { encoding: "utf8" });
  assert.equal(fs.readFileSync(tempProjectPath, "utf8"), modified.project);
  assert.equal(fs.readFileSync(tempPlistPath, "utf8"), modified.plist);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Guarantee regression test itself never mutates native source files.
assert.equal(fs.readFileSync(xcodePath, "utf8"), originalProject);
assert.equal(fs.readFileSync(plistPath, "utf8"), originalPlist);
assert.doesNotMatch(fs.readFileSync(plistPath, "utf8"), /NSLocalNetworkUsageDescription/,
  "Never persist the staging-only network permission in the real app");

const runner = fs.readFileSync(
  path.join(root, "scripts/build-collector-staging-ios.sh"), "utf8"
);
assert.match(runner, /git branch --show-current/);
assert.match(runner, /git status --porcelain --/);
assert.match(runner, /mktemp -d/);
assert.match(runner, /cp "\$PROJECT" "\$BACKUP_DIR\/project\.pbxproj"/);
assert.match(runner, /cp "\$PLIST" "\$BACKUP_DIR\/Info\.plist"/);
assert.match(runner, /trap restore_native EXIT/);
assert.match(runner, /--check-only/);
assert.match(runner, /PRE-FLIGHT PASSED. No EAS build was started/);
assert.match(runner, /node scripts\/collector-staging-native-ios\.cjs --apply/);
assert.match(runner, /node scripts\/collector-staging-native-ios\.cjs --verify/);
assert.match(runner, /export EXPO_PUBLIC_COLLECTOR_STAGING_MODE=true/);
assert.match(runner, /export EAS_BUILD_PROFILE=collector-staging-ios/);
assert.match(runner, /npx eas-cli@latest build --platform ios --profile collector-staging-ios/);
assert.match(runner, /Restored the original production native source files/);
assert.match(runner, /"requireCommit"/);

console.log("Collector staging native iOS overlay, safety checks, and source restoration tests passed.");
