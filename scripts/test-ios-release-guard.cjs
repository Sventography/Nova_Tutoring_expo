"use strict";
const assert = require("node:assert/strict");
const { validateRelease } = require("./ios-release-guard.cjs");
const sha = "a".repeat(40);
const env = {GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_REF:"refs/heads/release/web-ios-working-20260115",GITHUB_SHA:sha,RELEASE_SHA:sha,IOS_APPROVED_SHA:sha,IOS_RELEASE_ENABLED:"true",RELEASE_MODE:"testflight",EAS_CLI_VERSION:"1.2.3",IOS_ASC_APP_ID:"123456789"};
const config = {build:{production:{environment:"production",env:{EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED:"false",EXPO_PUBLIC_COLLECTOR_STAGING_MODE:"false",EXPO_PUBLIC_COLLECTOR_STAGING_WEB_PREVIEW:"false",EXPO_PUBLIC_NORAS_LANTERN_PREVIEW:"false"}}},submit:{production:{ios:{ascAppId:"123456789"}}}};
assert.deepEqual(validateRelease(env,config),[]);
for (const changes of [{GITHUB_EVENT_NAME:"push"},{GITHUB_REF:"refs/heads/feature/journal-retained-notes"},{RELEASE_SHA:"b".repeat(40)},{IOS_APPROVED_SHA:""},{IOS_RELEASE_ENABLED:"false"},{RELEASE_MODE:"public"},{EAS_CLI_VERSION:"latest"},{IOS_ASC_APP_ID:"987654321"}]) {
  assert.ok(validateRelease({...env,...changes},config).length,JSON.stringify(changes));
}
assert.ok(validateRelease(env,{...config,submit:{}}).length);
assert.ok(validateRelease(env,{...config,build:{production:{...config.build.production,ios:{simulator:true}}}}).length);
assert.ok(validateRelease(env,{...config,build:{production:{...config.build.production,env:{...config.build.production.env,EXPO_PUBLIC_COLLECTOR_REDEMPTION_ENABLED:"true"}}}}).length);
assert.deepEqual(validateRelease({...env,RELEASE_MODE:"build-only"},{...config,submit:{}}),[]);
console.log("PASS: 13 release guard cases");
