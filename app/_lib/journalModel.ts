import type { ArchiveFlags, ArgDiscoveryState } from "../utils/argState";
import { ARG_ACT1_FINALE_REPLY } from "../utils/argState";
import { GARDEN_NOTE, TELESCOPE, RABBIT_LABEL, FOCUS_MARGIN, NORA_NOTEBOOK, CONTACT_SHEET, RELAY_TRANSCRIPT, LANTERN_SOURCE, SESSION_REVEAL, PENCIL_TRACE, LANTERN_TRACE } from "./archiveArtifacts";

export type JournalNote = {
  id: string; title: string; subject: string; body: string; pinned: boolean;
  createdAt: string; updatedAt: string;
};
export type RecoveredNote = { id: string; title: string; body: string };
export type JournalScope = string | null;
export const journalStorageKey = (owner: JournalScope) =>
  "@nova/journal/v1/" + (owner ? "user/" + encodeURIComponent(owner) : "guest");
export const journalDraftKey = (owner: JournalScope) => journalStorageKey(owner) + "/draft";

export function recoveredNotes(state: ArgDiscoveryState, flags: ArchiveFlags): RecoveredNote[] {
  const rows: RecoveredNote[] = [];
  const add = (id: string, title: string, body: string) => rows.push({ id, title, body });
  if (flags.pencilTraceRead) add("pencil", "Pencil marks", PENCIL_TRACE);
  if (flags.lanternTraceRead) add("lantern-trace", "A light", LANTERN_TRACE);
  if (flags.introduced) add("opening", "Loose fragment", "She was here first.");
  if (!state.entryNoteDiscovered) return rows;
  add("garden", "Garden note", GARDEN_NOTE);
  if (!state.seventeenthStarDiscovered) return rows;
  add("chart", "Telescope observation", [TELESCOPE.count, TELESCOPE.chart, TELESCOPE.note].join("\n\n"));
  if (!state.nvDiscovered) return rows;
  add("signature", "The signature", "N.V. — written beneath the pencil mark.");
  if (!state.whiteRabbitDiscovered) return rows;
  add("rabbit", "Old inventory label", RABBIT_LABEL);
  if (!state.focusPracticeNoteDiscovered) return rows;
  add("margin", "Practice margin", FOCUS_MARGIN);
  if (!state.libraryNotebookDiscovered) return rows;
  add("notebook", "Notebook page", NORA_NOTEBOOK);
  if (!state.lanternFolderDiscovered || !flags.copyUnlocked) return rows;
  add("folder", "Copy reference", "Lantern — the missing page was copied before the index updated.");
  if (!flags.copyRead) return rows;
  add("contact", "Contact sheet", CONTACT_SHEET.map(row => [row.number, row.mark, row.lettering].join(" / ")).join("\n"));
  add("relay", "Relay transcript", RELAY_TRANSCRIPT.join("\n"));
  add("source", "Recovery order", LANTERN_SOURCE);
  if (!flags.draftRestored) return rows;
  add("draft", "Recovered page", ARG_ACT1_FINALE_REPLY);
  if (!flags.completed || !state.argAct1Complete) return rows;
  add("handwriting", "Unfiled note", "I don't remember writing this.\nBut I remember the handwriting.");
  add("session", "Session 017", SESSION_REVEAL);
  return rows;
}
export function recoveredHeading(notes: RecoveredNote[]): string {
  return notes.some(note => note.id === "session") ? "Nora’s Notes" : "Retained Notes";
}
export function matchingNotes(notes: JournalNote[], query: string): JournalNote[] {
  const q = query.trim().toLocaleLowerCase();
  return notes.filter(n => !q || [n.title,n.subject,n.body].some(s => s.toLocaleLowerCase().includes(q)))
    .sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}
export function noteText(note: Pick<JournalNote, "title" | "body">): string {
  return note.title + "\n\n" + note.body;
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
}
export function noteHtml(note: Pick<JournalNote, "title" | "body">): string {
  return '<!doctype html><html><head><meta charset="UTF-8"><style>body{font:16px system-ui,sans-serif;color:#222;margin:42px}h1{font-size:25px}article{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}</style></head><body><h1>' +
    escapeHtml(note.title) + '</h1><article>' + escapeHtml(note.body) + '</article></body></html>';
}
