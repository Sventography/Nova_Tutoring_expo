/**
 * Strict temporary Xcode overlay for NOVA//ARCHIVE iPhone staging builds.
 * This repo tracks ios/, so Xcode values override app.config at EAS build.
 * Only scripts/build-collector-staging-ios.sh may invoke --apply; it safely
 * backs up and restores the two tracked native files after EAS uploads.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PRODUCTION_ID = "com.sventography.novatutoring.ios";
const STAGING_ID = "com.sventography.novatutoring.ios.collectorstage";
const PRODUCTION_SCHEME = "nova";
const STAGING_SCHEME = "novacollectorstage";
const PRODUCTION_DISPLAY_NAME = "Nova Tutoring";
const STAGING_DISPLAY_NAME = "Nova Collector Staging";
const PROJECT_RELATIVE = "ios/NovaTutoring.xcodeproj/project.pbxproj";
const PLIST_RELATIVE = "ios/NovaTutoring/Info.plist";

const count = (source, needle) => source.split(needle).length - 1;
function one(source, before, after, label) {
  assert.equal(count(source, before), 1,
    label + ": expected exactly one original value; refusing unsafe edit");
  return source.replace(before, after);
}
function applyOverlayText(project, plist) {
  const from = "PRODUCT_BUNDLE_IDENTIFIER = " + PRODUCTION_ID + ";";
  const to = "PRODUCT_BUNDLE_IDENTIFIER = " + STAGING_ID + ";";
  assert.equal(count(project, from), 2,
    "Expected exactly two production Xcode bundle-ID settings (Debug/Release); refusing unsafe edit.");
  project = project.replaceAll(from, to);
  // Preserve the actual Xcode scheme and target product names.
  plist = one(
    plist,
    "<key>CFBundleDisplayName</key>\n\t<string>" + PRODUCTION_DISPLAY_NAME + "</string>",
    "<key>CFBundleDisplayName</key>\n\t<string>" + STAGING_DISPLAY_NAME + "</string>",
    "iPhone display name"
  );
  plist = one(
    plist, "<string>" + PRODUCTION_SCHEME + "</string>",
    "<string>" + STAGING_SCHEME + "</string>", "native deep-link scheme"
  );
  plist = one(
    plist, "<string>" + PRODUCTION_ID + "</string>",
    "<string>" + STAGING_ID + "</string>", "bundle-ID URL scheme"
  );
  // Safari on iPhone can access a local HTTP URL without the app's Local
  // Network privilege. The native Expo dev client cannot. Only the staging
  // IPA adds these privacy declarations: the source Info.plist for the
  // production Nova app is restored unchanged after EAS upload.
  plist = one(
    plist,
    "\t<key>NSAppTransportSecurity</key>",
    "\t<key>NSLocalNetworkUsageDescription</key>\n" +
      "\t<string>Nova Collector Staging connects to the Expo development server on your local Wi-Fi.</string>\n" +
      "\t<key>NSBonjourServices</key>\n" +
      "\t<array>\n\t\t<string>_expo._tcp</string>\n\t</array>\n" +
      "\t<key>NSAppTransportSecurity</key>",
    "staging-only local-network privacy declarations"
  );
  verifyOverlayText(project, plist);
  return { project, plist };
}
function verifyOverlayText(project, plist) {
  assert.equal(count(project, "PRODUCT_BUNDLE_IDENTIFIER = " + STAGING_ID + ";"), 2,
    "Both native Debug/Release bundle IDs must identify staging.");
  assert.equal(count(project, "PRODUCT_BUNDLE_IDENTIFIER = " + PRODUCTION_ID + ";"), 0,
    "The native project still contains the production bundle ID.");
  assert.equal(count(plist, "<key>CFBundleDisplayName</key>\n\t<string>" + STAGING_DISPLAY_NAME + "</string>"), 1,
    "Staging iPhone display name must be distinct.");
  assert.equal(count(plist, "<string>" + STAGING_SCHEME + "</string>"), 1,
    "Staging app must own its distinct native deep-link scheme.");
  assert.equal(count(plist, "<string>" + STAGING_ID + "</string>"), 1,
    "Staging app must own its distinct bundle-ID URL scheme.");
  assert.equal(count(plist, "<string>" + PRODUCTION_SCHEME + "</string>"), 0,
    "Staging app must not claim normal Nova's deep-link scheme.");
  assert.equal(count(plist, "<string>" + PRODUCTION_ID + "</string>"), 0,
    "Staging app must not claim normal Nova's bundle-ID URL scheme.");
  assert.equal(count(plist, "<key>NSLocalNetworkUsageDescription</key>"), 1,
    "Staging IPA must declare local-network privacy usage to iOS.");
  assert.equal(count(plist, "<key>NSBonjourServices</key>"), 1,
    "Staging IPA must declare Expo's Bonjour service discovery.");
  assert.equal(count(plist, "<string>_expo._tcp</string>"), 1,
    "Expo dev-server Bonjour service must be declared exactly once.");
  assert.equal(count(plist, "<key>NSAllowsLocalNetworking</key>\n\t\t<true/>"), 1,
    "iOS App Transport Security must continue to allow local HTTP for Metro.");
  return true;
}
function run(mode, root) {
  const projectPath = path.join(root, PROJECT_RELATIVE);
  const plistPath = path.join(root, PLIST_RELATIVE);
  let project = fs.readFileSync(projectPath, "utf8");
  let plist = fs.readFileSync(plistPath, "utf8");
  if (mode === "--apply") {
    const staged = applyOverlayText(project, plist);
    // Backup/restoration is owned by the launcher, not this utility.
    fs.writeFileSync(projectPath, staged.project);
    fs.writeFileSync(plistPath, staged.plist);
    project = fs.readFileSync(projectPath, "utf8");
    plist = fs.readFileSync(plistPath, "utf8");
  } else if (mode !== "--verify") {
    throw new Error("Use --apply or --verify, optionally followed by --root PATH.");
  }
  verifyOverlayText(project, plist);
  console.log("STAGING NATIVE VERIFIED:");
  console.log("  iPhone app: " + STAGING_DISPLAY_NAME);
  console.log("  Xcode bundle ID: " + STAGING_ID + " (Debug + Release)");
  console.log("  iOS link scheme: " + STAGING_SCHEME);
  console.log("  Local network privacy: declared (Expo Bonjour + local HTTP)");
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const mode = args[0];
    const rootIndex = args.indexOf("--root");
    const root = rootIndex >= 0 ? args[rootIndex + 1] : path.resolve(__dirname, "..");
    assert.ok(root, "Missing --root PATH.");
    run(mode, root);
  } catch (error) {
    console.error("[collector-staging-native] " + (error?.message || String(error)));
    process.exitCode = 1;
  }
}
module.exports = {
  applyOverlayText, verifyOverlayText,
  PRODUCTION_ID, STAGING_ID, PRODUCTION_SCHEME, STAGING_SCHEME,
  PRODUCTION_DISPLAY_NAME, STAGING_DISPLAY_NAME,
  PROJECT_RELATIVE, PLIST_RELATIVE,
};
