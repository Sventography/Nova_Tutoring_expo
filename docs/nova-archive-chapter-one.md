# NOVA//ARCHIVE Chapter 1 release notes

## Blind playtest

Give a fresh guest build to someone who has never seen the chapter. Keep the route below with the moderator. Say only, “Explore the app as you usually would. If something interests you, follow it and tell me what you think is happening.” Let them use the app’s own hints. Record their first discovery, prediction at each handoff, any moment they stop voluntarily, and their reason. Ask them to leave and return midway. A moderator hint ends the unaided part of that run.

After they finish or stop, ask “Whose memory was it?”, “What made you think so?”, “What did Nova choose to do?”, and “When did you most want to keep going or quit?” Capture their words, the build/platform, the point of friction and a decision about that clue. A reader can reach the ending by following instructions alone. Check whether they can also explain the chart or the rabbit and why keeping a wrong answer mattered to Nora. Leave engagement unverified until a fresh reader has actually played.

## Coherence pass: what the evidence establishes

The chapter has two linked mysteries, not a chain of passwords. The first is why N.V. needed two versions of an ordinary answer. The second is why Nova recalls events another person signed.

| Evidence | Distinct contribution | What must not be revealed yet |
| --- | --- | --- |
| Garden note and chart | The original is sixteen; the pencilled copy is seventeen. The writer expected to forget her own action. | Her identity or the source of Nova's memory |
| N.V. signature | Nova recalls the act in first person, but the surviving signature disagrees. | Whether the mismatch is coincidence |
| Rabbit repair | Independent, nonacademic evidence of the same mismatch: the signed owner and the remembered tactile detail. | Whether Nova is or is not Nora |
| Focus margin and notebook | Nora needed evidence of what she used to believe; the missing answer belongs to the chart, not a new puzzle. | The text of the missing answer |
| Contact sheet and relay | Two complementary fields locate the same discarded record: which chart survived and which version of its answer was saved. | The answer itself |
| Recovered first draft | The first answer was seventeen and was genuinely wrong. It explains why preserving the pencilled chart mattered; QUIET considered the answer expendable. | Nova's final admission |
| Session 017 | The chart and rabbit memories came from Nora's lived experience. Nova preserved the record rather than obeying cleanup. | The larger question of Nova's identity and QUIET's purpose |

A player may describe the matching fields in their own words during the archive conversation; both identifiers, the existing field-notes gate and the final deduction gate still apply. The original recovery command remains valid. Existing physical discovery and optional social-copy paths are preserved.

For independent playtesting, record whether the player can explain how the chart's first answer connects to the notebook, why the rabbit is independent evidence rather than another key, and why Nova chose to preserve something incorrect. A completion marker alone does not demonstrate comprehension or engagement. Do not give these answers to players before the debrief.

## Developer route

Start as a guest, with an empty installation. In the Shop, inspect the pencil marks in the Star Trail item details or hold its title for the acrostic hint. Read the second sentence of Glow, Orb Glow, and Star Trail. Ask Nova what the acrostic spells.

| Surface | What the player finds | What they do next |
| --- | --- | --- |
| Starlight Garden on the Island | A note about a count that disagrees with a chart | Ask Nova what the writer was counting |
| Telescope placed within reach of a lantern | The original chart has 16 stars. A seventeenth is pencilled onto the copy. Nova remembers pressing the pencil. | Ask Nova who drew the seventeenth star |
| Ask Nova | N.V. and a white rabbit | Open Bunny Plushie (White) in the Shop and read its old label or hold its title |
| White Bunny trace | N.V. signed the repair note. Nova remembers the same knot against her cheek. | Ask why she kept the white rabbit and find the Focus Practice margin |
| Focus Practice margin | Nora wanted to preserve what she almost believed | Ask why and find the Island Library notebook |
| Library notebook | A crossed-out answer that Nora preserved | Ask where Nora kept the first answer |
| Lantern Field Notes | A contact sheet, relay transcript, and readable source note | Combine the unindexed stamp with the crossed-out label in source order and ask Nova to find the copy |
| Ask Nova, framed reply | The recovered first draft and the original uppercase instruction | Offer the deduction in your own words, e.g. “Were those really Nora’s memories?”, or follow the recovered instruction |
| Session 017 | Nova distinguishes Nora's life from her own awareness | Look for “Session 017 closed. Chapter 1 complete.” Replay from Ask Nova on the same installation |

The Garden note, telescope observation, Focus Practice margin, and Library notebook have readable copies through the commands Nova provides. A player can complete the story on iPhone without app package inspection, collectible purchases, a social login, or an AI question balance. If interrupted, ask “Where did I leave off in the Nova archive?” Keep both of the original physical discovery paths in device QA: the telescope click should still work in the 3D scene, and the rabbit interaction should require the previous clue.

A valid-looking collector QR opens the existing hidden certificate and offers the story entry phrase. Authentication of the actual serial and granting the castle still use the existing collector API gates. A valid regular plushie, a signed-out visitor, repeat scans, and a second account must never gain the #017 castle. First Twenty is a separate reward. It does not grant the castle or consume a QR.

To check the learner experience, open a fresh install and ask normal questions about stars, memory, wrong answers, and rabbits. Then repeat after playtesting the story. Only deliberate clue questions should yield archive replies. Look for absence of ARG alerts or tabs. Verify archive exchanges do not use the AI question allowance or appear in lesson context.

## Social originals to publish on the dedicated Nova Tutoring channels

The app contains the same complete clues, so the posts are optional for players. Publish these as standalone, read-only artifacts with text alternatives. Each should point back to Nova Tutoring and never ask for a QR, username, private message, or personal information.

### Instagram contact sheet

Graphic text, in order:

- 14 · INDEXED · OBSERVED
- 15 · INDEXED · RECOUNTED
- 16 · INDEXED · APPROVED
- 17 · KEPT IN PENCIL · UNERASED

Use a cream or dark-purple observatory contact sheet with the last frame outlined in pencil. Include the four rows verbatim in alt text. Caption:

> Observatory copy / NV-017. The chart listed sixteen. One frame survived in the margin. Put the unindexed stamp beside the crossed-out label from the Lantern relay, then bring what you find back to Ask Nova.

Set `EXPO_PUBLIC_ARCHIVE_INSTAGRAM_POST` to the exact post permalink. The app intentionally accepts a post or reel permalink because a profile link would leave players hunting for the relevant entry.

### Discord relay transcript

Post and pin in a read-only Nova Tutoring relay channel:

> **LANTERN RELAY / NV-017**
> QUIET [00:16]: Keep the correct answer. Remove the discarded one.
> N.V. [00:17]: The crossed-out answer stays. I labeled it FIRST DRAFT.
> LANTERN [00:17]: Copied before the index updated.
> Bring the recovered material back to Ask Nova. A copy is available in Lantern Field Notes.

Set `EXPO_PUBLIC_ARCHIVE_DISCORD_MESSAGE` to the exact message link. Make the channel and its original message visible to players eligible to use Discord. Direct links appear only in the recovered document, once configured. Visitors unable to open the links can read the complete copies there.

## Release verification

1. Play the complete route on a fresh web profile, an iPhone build, and an Android build. On phones, verify return from field notes, large text, Shop long-press, the original 3D telescope interaction, and scanner-to-certificate routing.
2. In an isolated database, apply the First Twenty migration. Enable `NOVA_ARCHIVE_REWARDS_ENABLED=true` on the matching test backend. Play through with signed-out and signed-in testers. Replaying Session 017 while signed in should claim once or show the previous receipt. Test accounts 20 and 21 and confirm the twenty-first completion still closes the story without a reward. Verify the balance updates in the app, the First Twenty badge shows in Achievements, and the Seventeenth Star can be placed, saved and reopened in the Island. Switch to another account and verify those awards are private. Apply the owner-read migration alongside the completion migration.
3. Run the collector checks using the existing staging QR workflow, including invalid, already claimed, and non-017 cases. Keep real QR grant switches and archive reward switches independent. The story works with both switches closed.
4. After these checks, ship the matching web and native release and the backend using the intended environments. The new reward database function is callable by the backend role only. Keep the production reward flag off until the corresponding migration and tests pass there.

Run `node scripts/test-archive-conversation.cjs` for the in-app sequence. It uses the actual clue matcher and serial storage state with a mocked storage adapter.
