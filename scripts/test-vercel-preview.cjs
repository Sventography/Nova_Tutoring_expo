const assert = require("node:assert/strict");
const { previewEnvironment } = require("./export-vercel.cjs");

const stage = {
  VERCEL_ENV: "preview",
  VERCEL_URL: "nova-build-example.vercel.app",
  VERCEL_BRANCH_URL: "nova-branch-example.vercel.app",
  EXPO_PUBLIC_SUPABASE_URL: "https://gouhhltupxaycuysdtrw.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test",
};
const isolated = previewEnvironment({
  ...stage,
  EXPO_PUBLIC_BACKEND_URL: "https://other.example",
  EXPO_PUBLIC_ARCHIVE_VERIFICATION_ENABLED: "true",
  EXPO_PUBLIC_GARDEN_CHECKS: "true",
});
assert.equal(isolated.EXPO_PUBLIC_BACKEND_URL, "https://nova-backend-disabled.invalid");
assert.equal(isolated.EXPO_PUBLIC_API_URL, isolated.EXPO_PUBLIC_BACKEND_URL);
assert.equal(isolated.EXPO_PUBLIC_AUTH_CONFIRMATION_URL, "https://nova-branch-example.vercel.app/auth/callback");
assert.equal(isolated.EXPO_PUBLIC_ARCHIVE_VERIFICATION_ENABLED, "false");
assert.equal(isolated.EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED, "false");
assert.equal(isolated.EXPO_PUBLIC_GARDEN_CHECKS, "false");
assert.equal(isolated.EXPO_PUBLIC_ISOLATED_PREVIEW, "true");
for (const override of [
  {EXPO_PUBLIC_SUPABASE_URL: ""},
  {EXPO_PUBLIC_SUPABASE_URL: "https://other.supabase.co"},
  {EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined},
  {EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_test"},
  {VERCEL_BRANCH_URL: "unexpected.example"},
]) assert.throws(() => previewEnvironment({...stage, ...override}));
for (const VERCEL_ENV of ["development", "production", undefined]) {
  const original = {VERCEL_ENV};
  assert.strictEqual(previewEnvironment(original), original);
}
console.log("PASS isolated preview target, public-key validation, callback and closed backend; native and production configuration preserved.");
