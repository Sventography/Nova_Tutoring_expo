# Orbit lesson browser accessibility

Base: `57223a9cb60eb2283a7a45c04e957f868c6552f1` (Discover / PR #10).

## Defect and change

The selected orbital distance and prediction had a visual border and bold text,
but React Native Web did not expose `accessibilityState.selected` on the
buttons. A browser user relying on assistive technology could not identify
which choice was active from the accessibility state.

`OrbitLab` now supplies `aria-pressed` for these choice buttons on web. It keeps
the existing native selection state and leaves the momentary time controls as
ordinary buttons. The labelled orbit SVG also has an explicit image role.

The same browser regression fails against the unchanged base export because
the first distance button has no pressed state (`null`, expected `false`). It
passes against the corrected export.

## Verification

The browser test enters the actual exported `/discover` route as a fresh guest,
uses topic search to open the Moon discovery, and exercises the lesson. It
permits only local static GET/HEAD requests; every external request is blocked.

Verified in Chromium 158:

| Viewport | Input | Result |
| --- | --- | --- |
| 1280 × 844 | Keyboard, Tab, Enter and Space | Pass |
| 390 × 844 | Emulated touch | Pass |
| 320 × 844 | Emulated touch | Pass |

The checks cover all four radii, exclusive pressed states, prediction changes,
correct and incorrect feedback, resetting elapsed time and predictions when
the distance changes, the 0- and 12-month boundaries, a complete reference
orbit, Back and Reset behavior, the diagram's accessible name and updated time,
44-pixel control targets, and no horizontal overflow within the lesson. No
uncaught page errors occurred. Each guest context blocked one external request.
One repeat screenshot run encountered a Chromium page-process crash; the next
full run completed all three viewports successfully. The cause of that transient
crash was not established.

Rendered 320-pixel evidence: [controls and diagram](orbit-narrow-controls.webp)
and [time controls and results](orbit-narrow-results.webp). These are captures
of the actual scrollable app at the original viewport size.

The actual `node scripts/test-orbit-lab.cjs` regression passed with the installed
TypeScript compiler. Both base and corrected Expo static web exports completed
with dummy public backend values and dotenv loading disabled. A TypeScript
program rooted at the orbit component and model produced the same 16 existing
transitive diagnostics before and after the change, with no diagnostics in
either orbit file and no new or removed diagnostics. This is not a clean
repository-wide typecheck claim.

Run the browser check after exporting the app:

```bash
QA_EXPORT=/path/to/static-export \
QA_CHROMIUM=/path/to/chromium \
QA_SCREENSHOTS=/path/to/qa-images \
python scripts/test-orbit-lab-browser.py
```

`QA_SCREENSHOTS` is optional. Python Playwright and a compatible Chromium
binary are required; the test installs nothing and makes no external calls.

## Limits and integration

Automated browser semantics and emulated touch do not verify VoiceOver,
TalkBack, physical iPhone/Android behavior, or every app theme. The change does
not modify orbital calculations, lesson routing, user storage, accounts,
payments, rewards, dependencies or backend configuration.

This is an isolated candidate for the integration owner. The frozen Discover
and stability branch heads and the active integration worktree were not
modified. Re-run the browser script against the integrated export when this
commit is incorporated. No production merge, deployment or reward activation
is part of this change.
