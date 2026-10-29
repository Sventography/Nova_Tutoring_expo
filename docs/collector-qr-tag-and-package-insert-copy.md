# NOVA//ARCHIVE — Collector QR tag and packaging insert copy

**Status:** Proposed print-ready wording approved for inclusion in the
feature-branch design reference; artwork, dimensions and physical print
proofs are NOT yet produced. No physical QR codes have been issued.

## Recommended packaging layout

**Use one QR tag + one small double-sided insert inside the sealed package.**
The sewn/hang tag carries the actual individual QR code. The collector
card carries readable instructions. The in-app verification/redeem success
screen also repeats the precise route and has an Open My Island action.

Do not cram the full instructions onto the QR tag: doing so makes the QR
hard to scan and makes the premium product feel like an instruction manual.

Suggested card format: a sturdy 3×4 in or 3×5 in double-sided card,
with readable type, amber/gold accents for Nora and restrained purple for
the archive. These are print-layout proposals, not final dimensions.

**Important:** The tag/card is placed INSIDE the package; never use
a pre-purchase photo, shop description or exterior label to expose a
serial, claim state, rarity of an individual unit or the #017 secret.

## 1. QR tag — shared concise copy

**Front (beside or above the individual code):**

    NOVA // ARCHIVE
    SCAN TO VERIFY
    YOUR COLLECTOR KEEPSAKE

**Back / under the code:**

    Sign in to Nova Tutoring to claim
    your included island reward.
    Keep this tag — it's your authenticity key.

QR requirement: use the individualized private QR authenticity URL,
not the public shop homepage. Include a unique, high-entropy code in
the QR destination. The code is never printed as readable text in a
public digital document and is not accessible through a public app menu.
The authenticity page is entered only from the QR/physical card.

## 2. Unique #017 — small collector card, FRONT

    NOVA // ARCHIVE

    THE SEVENTEENTH STAR

    Some things were never meant to be forgotten.

    “I kept the light on. Just in case.”

    — NORA VALE · SESSION 017

The #017 edition alone may use gold stitching/foil and mention its
unique castle in this **inside-the-box** insert. Its serial is only
revealed on the physical item/tag and private QR authenticity page.

## 3. Unique #017 — small collector card, BACK

    YOUR CASTLE IS WAITING. 🏰

    1  Scan the QR code on your collector tag.
    2  Sign in to Nova Tutoring and claim
       Nora's Last Lantern.
    3  Open ISLAND. Scroll below the 3D island.
    4  Tap BUILD, then DECORATION INVENTORY.
       (Not the regular Inventory.)
    5  Find LAST LANTERN → PLACE → SAVE.

    Tap your castle once it's placed
    to awaken its fireworks.

    Keep this card. Keep the light.

There is no extra purchase, ARG paywall or achievement requirement to
place the castle once the valid #017 claim is bound to the account.
The island decoration appears only after authenticated server ownership
verification; a second account may not redeem that same one-use code.

## 4. Other 99 limited plushies — shared collector card

**Front:**

    NOVA // ARCHIVE

    A LIGHT LEFT BURNING.

    Some things were never meant to be forgotten.

    “I kept the light on. Just in case.”

    — NORA VALE

**Back:**

    YOUR NOVA KEEPSAKE IS WAITING.

    1  Scan the QR code on your collector tag.
    2  Sign in to Nova Tutoring and claim
       your included island reward.
    3  Open ISLAND. Scroll below the 3D island.
    4  Tap BUILD, then DECORATION INVENTORY.
    5  Find your collector reward → PLACE → SAVE.

    Keep this card. Keep the light.

Use the actual in-app catalog item name in step 5 once the *shared*
reward for the other 99 is finalized. **Do not print “Last Lantern” or
promise the #017 castle** on the general collector card. If the shared
reward ends up in a different inventory system, update these steps to
the actual UI before manufacturing. Generic QR tag copy may be reused
across all limited editions.

## 5. Regular plushie variant

Regular plushies may also carry an individualized QR authentication
and a modest island reward. Reuse the neutral QR tag wording. Write
their actual island-reward instructions for the final reward type;
never imply a regular plushie includes the limited or #017 castle.

## Digital companion — already implemented on feature branch

After a successful signed-in #017 redemption, the collector page shows:
- “Your castle is in Decoration Inventory”
- Island → scroll below 3D scene → BUILD → Decoration Inventory
  (not ordinary Inventory) → Last Lantern → PLACE → SAVE
- An **Open my island** action

The Island BUILD panel also shows a waiting-castle notice, and the
Decoration Inventory auto-opens and highlights the reward while
unplaced. Do not rely on any physical insert as the sole instructions:
buyers can lose, recycle, or discard packaging.

## Production packaging QA checklist

- [ ] #017 secret/serial hidden in storefront and pre-purchase materials
- [ ] Physical #017 gold stitching vs other 99 cyan; no outside preview
- [ ] Tag scan opens the unlinked, private QR-only authenticity page
- [ ] QR unique per actual unit; hash stored server-side
- [ ] No live QR secrets committed in this file or a source repository
- [ ] Account login → verify → claim → island inventory → place → SAVE
- [ ] Scan legibility verified on actual printed tag (minimum quiet zone)
- [ ] Printed instructions match iOS, Android and web UI labels
- [ ] Repeat scan after redemption shows “already yours,” not a new grant
- [ ] Other edition units get their own correct shared reward
- [ ] Physical card is optional help, not the only recovery instructions
