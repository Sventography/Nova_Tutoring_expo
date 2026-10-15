# Nora's Last Lantern — implementation brief

Status: design specification only; not a working island asset or redemption integration.

## Island collectible
- ID: `noras_last_lantern_017`
- Display name: Nora's Last Lantern
- Rarity: one-of-one, assigned exclusively to verified Archive White Rabbit 017/100.
- Appearance: very large castle-shaped lantern, broad footprint, ornate towers on both sides, glowing gold framework, luminous central chamber, waterfalls, purple/cyan accents.
- Idle: warm light remains visible by day and night; minimal animated sparkles.
- Tap: launch an approximately 6–8 second fireworks sequence from side towers, with gold, cyan, and purple bursts.
- Performance: no continuous fireworks, throttle activation, limit particles and lights, avoid loading large textures until needed; account for island scene lag.
- Ownership: only verified holder may place the item; island visitors may tap to trigger fireworks. Do not make transferable by default.
- Text: avoid revealing Session 017 lore to visitors who have not unlocked its ARG milestone.

## Plushie tiers
- Regular White Rabbit: standard island bunny decoration.
- Archive Edition numbers 001–100 except 017: same exclusive glowing Archive Rabbit garden lantern decoration.
- Archive Edition 017/100: Nora's Last Lantern, unique worldwide.
- Number embroidered directly on plushie's body in cursive: cyan for 99 editions, metallic gold for 017.
- Shop may disclose total edition size but must not reveal assigned serial numbers, remaining quantity, or reward differentiation before fulfillment.
- Purchases must not be required to finish the ARG.

## Redemption and verification
- Physical package includes unique single-use claim credential, separate from public certificate verification QR.
- Server verifies and atomically consumes claim credentials; enforce one unique 017 entitlement and idempotent claims.
- Never trust client-side unlock flags for item ownership or edition stock.
- Public authenticity page on sventographystudios.com verifies edition and serial; not linked in public navigation, but unlisted is not private.
- Redemption claims must be recoverable through a secure support process without allowing duplicate ownership.
- Do not launch a randomized special-reward offer without applicable legal and platform-policy review.

## Next engineering step
Find the live island scene/decorations registry and placement persistence code, then implement an optimized 3D scene component behind a developer-only flag. The current GitHub default branch did not surface the previously named island files at the expected paths; confirm the live branch before modifying runtime code.
