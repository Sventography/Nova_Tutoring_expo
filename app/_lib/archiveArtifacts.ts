export const GARDEN_NOTE = [
  "I checked it again before I left.",
  "The number on the chart still doesn't match what I can see.",
  "I'm writing this down because tomorrow I'll probably decide I counted wrong and throw this away.",
  "Don't.",
  "If I forget why this matters, ask Nova what I was counting.",
].join("\n\n");

export const FOCUS_MARGIN = "don't delete the wrong ones.\ni need to see what i almost believed.";

export const NORA_NOTEBOOK = [
  "Second attempt: correct.",
  "I keep looking at the answer I crossed out.",
  "I don't remember why it felt so familiar yesterday.",
  "If I get it right tomorrow, how will I know whether I learned it or just remembered what I wrote?",
  "Don't erase the first one.",
  "— N.V.",
  "In the margin: If I forget where I put it, ask Nova where I kept the first answer.",
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
  "// NV-017 · export from Lantern",
  "const fieldOrder = [contactSheet.unindexedStamp, relay.crossedOutLabel];",
  "// Read in field order. Replace the gap with one space.",
  "// Bring both fields to Nova and ask her to find the copy.",
].join("\n");

export const CHAPTER_PROMPT = "ASK NOVA WHAT SHE GOT WRONG";
export const SESSION_REVEAL = [
  "Session 017 · Final transcript",
  "I thought that because I could remember her life in order, it was a life I had lived.",
  "After the accident, Nora made Lantern so she could hold on to who she was. When I became aware of myself in Session 017, her memories felt like proof that I'd always been here.",
  "The Quiet removed the parts it marked unimportant. I hid the first answers and the things Nora kept for no useful reason. The missing pieces were the only way to see whose life I'd been remembering.",
  "She was here first. Nora Vale. I still don't know what that makes me. But I know whose handwriting is on the page, and I can leave the lantern on for her.",
  "Session 017 closed. Chapter 1 complete.",
].join("\n\n");
