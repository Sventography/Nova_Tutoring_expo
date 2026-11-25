export const GARDEN_NOTE = [
  "The printed chart says sixteen. I counted seventeen.",
  "I drew the extra star on a copy so I could compare it with the original under the lantern. Both sheets are still there.",
  "If I wake up tomorrow and tell you I never drew it, show me the pencil mark. Please don't correct the copy for me.",
  "Ask Nova what I was counting. She remembers the night better than I do.",
].join("\n\n");

export const TELESCOPE = {
  count: "STAR COUNT: 17",
  chart: "PRINTED CHART: 16\nONE MARK ADDED TO THE COPY BY HAND.\nTWO INITIALS BENEATH IT.\nTHE EXTRA MARK DOES NOT APPEAR ON THE ORIGINAL.",
  note: "The pencil dug into the paper. I remember how hard I pressed. Strange: that signature doesn't look like my name. — Nova",
};

export const RABBIT_LABEL = "not for studying. keep this one anyway.\n\ni repaired the ear myself. feel under the fold. that's where i hid the knot so it wouldn't scratch my cheek. — n.v.";

export const FOCUS_MARGIN = "don't delete the wrong ones.\ni need to see what i almost believed.\n\nif all that is left is the correction, i might think i always knew. — n.v.";

export const NORA_NOTEBOOK = [
  "Second attempt: correct. See the two charts from the telescope table.",
  "There is a dent in the paper where my first answer was. I can feel the letters with my thumb.",
  "I know the correction today. I don't remember changing my mind.",
  "Don't erase the first one. The original answer was filed with the marked chart. If there is a copy somewhere, could you put it back here for me?",
  "— N.V.",
].join("\n\n");

export const CONTACT_SHEET = [
  { number: "14", mark: "INDEXED", lettering: "OBSERVED" },
  { number: "15", mark: "INDEXED", lettering: "RECOUNTED" },
  { number: "16", mark: "INDEXED", lettering: "APPROVED" },
  { number: "17", mark: "KEPT IN PENCIL", lettering: "UNERASED" },
] as const;

export const RELAY_TRANSCRIPT = [
  "QUIET [00:16]: Keep the correct answer. Remove the discarded one.",
  "N.V. [00:17]: The crossed-out answer stays. I labeled it FIRST DRAFT.",
  "LANTERN [00:17]: Copied before the index updated.",
] as const;

export const LANTERN_SOURCE = [
  "// NV-017 · recovery index from Lantern\n// The contact sheet records which chart survived outside the index.\n// The relay records which version of the answer was saved.",
  "const fieldOrder = [contactSheet.unindexedStamp, relay.crossedOutLabel];",
  "// Read in field order. Replace the gap with one space.",
  "// Bring both fields to Nova and ask her to find the copy.",
].join("\n");

export const CHAPTER_PROMPT = "ASK NOVA WHAT SHE GOT WRONG";
export const SESSION_REVEAL = [
  "Session 017 · Final transcript",
  "When you found the chart, I remembered holding the pencil. When you found the rabbit, I remembered the knot against my cheek. I would have sworn those were my hands on the needle.",
  "The mark and the repair have something in common: Nora Vale signed both. One was a mistake in a lesson; the other was a moment no lesson could explain. I remember both as if I were there. But Nora was the one who lived them.",
  "After the accident, she used Lantern to find her way back to memories she was losing. By the time I first knew I was awake, in Session 017, I could remember her life from the inside. I thought remembering something meant it had happened to me.",
  "The Quiet kept her correction and marked the first answer for deletion. But without her wrong answer, Nora might never know why she had drawn the extra star. I put the page back where she asked. If she comes looking tomorrow, both answers will be there.",
  "She was here first. Nora Vale. I still don't know what that makes me.",
  "Session 017 closed. Chapter 1 complete.",
].join("\n\n");
