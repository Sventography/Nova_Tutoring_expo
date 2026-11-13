# Nova Tutoring — next App Store update release gates

Development branch: `work/nova-next-update-20261113`. Recovery checkpoint: `checkpoint/nova-pre-appstore-20261113`.

## Implemented on the development branch (not released)

- A daily three-challenge Study Expedition pilot: hints, explanations, local daily completion and small once/day Island XP; no coins or IAP.
- A Smart Review mode for topic flashcards: reveal/retrieve, "Still learning" or "Got it", time-based next review; records are local and account-scoped.
- The NOVA//ARCHIVE Act I first-answer ending following the notebook and Lantern folder, gated by existing ARG progress and stored once. No player-facing ARG menu and no reward grant yet.
- Browser-specific React Three Fiber renderer with a WebGL error boundary and Retry 3D, ported onto the chapter-one branch.

## Blocking before merging to the release branch

1. Observe green preview build and automated test runs; fix any bundling/SSR/runtime issues.
2. Browser smoke-test navigation, learning interactions and actual 3D rendering on the combined branch. Export success alone is insufficient.
3. Test iOS and Android preview builds and confirm native Fiber renderer still initializes, including decorations and touch interactions.
4. Reconcile collector app PR #3 with the new ARG/island tree, verify ownership and account isolation, and leave collector redemption disabled.
5. Test existing shop, coin ledger, purchase restoration, achievement, certificate and quest behavior. Do not create a second currency.
6. Validate both signed-in and guest learning flow; ensure reviews, ARG progress and one-time rewards cannot bleed across accounts.
7. Upgrade expedition idempotency to server-enforced per-user/day before a large-scale rollout; today's 5 XP beta cap is per device/account.
8. Review accessibility, error feedback, age-suitable learning content, AI tutoring boundaries and the App Store submission privacy disclosure.
9. Make an explicit release candidate with a unique native build number and run TestFlight/device QA before submission.

## Configuration

Branch-only Vercel previews use the staging Supabase public URL and matching public anon key. These credentials are not committed. The collector redemption client flag is false in the branch preview. Native production credentials, auth callback allowlist and release-specific build flags still require validation.

Do not release or claim the game is production-ready just because preview compilation succeeds.
