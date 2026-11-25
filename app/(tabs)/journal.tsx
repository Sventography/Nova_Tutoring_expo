import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import * as Print from "expo-print";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { supabase } from "../lib/supabase";
import { canImportGuestDiscoveries, importGuestDiscoveries, getArchiveFlags, getArgDiscoveryState } from "../utils/argState";
import { makeJournalNote, matchingNotes, noteHtml, noteText, recoveredHeading, recoveredNotes, type JournalNote, type JournalScope, type RecoveredNote } from "../_lib/journalModel";
import { deleteJournalNote, loadJournalLocal, readJournalDraft, saveJournalNote, syncJournal, writeJournalDraft, type JournalResult } from "../_lib/journalStorage";

export default function JournalScreen() {
  const { ready, session } = useUser();
  if (!ready) return <ActivityIndicator />;
  const owner = session?.user?.id ?? null;
  return <JournalBody key={owner ?? "guest"} owner={owner} />;
}
function JournalBody({ owner }: { owner: JournalScope }) {
  const { tokens } = useTheme();
  const [fontLoaded] = useFonts({ NoraHand: require("../../assets/fonts/ReenieBeanie.ttf") });
  const [notes, setNotes] = useState<JournalNote[]>([]);
  const [recovered, setRecovered] = useState<RecoveredNote[]>([]);
  const [draft, setDraft] = useState<JournalNote | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [guestImportAvailable, setGuestImportAvailable] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copyText, setCopyText] = useState<string | null>(null);
  const active = useRef(true);
  const refreshVersion = useRef(0);
  const editing = useRef(false);
  const showResult = (r: JournalResult) => {
    if (!active.current) return;
    setNotes(r.notes);
    setStatus(r.syncFailed ? "Saved notes are available on this device. Account sync will retry." :
      r.pending ? "Saved on this device. Sync pending." : "");
  };
  useEffect(() => {
    active.current = true;
    let live = true;
    void readJournalDraft(owner).then(n => {
      if (live && !editing.current) setDraft(n);
    }).catch(() => { if (live) setStatus("Could not recover your saved draft."); });
    return () => { live = false; active.current = false; };
  }, [owner]);
  useFocusEffect(useCallback(() => {
    let live = true;
    const version = ++refreshVersion.current;
    setLoading(true);
    void loadJournalLocal(owner).then(r => {
      if (live && version === refreshVersion.current) showResult(r);
    }).catch(() => { if (live) setStatus("Could not load your saved notes."); })
      .finally(() => { if (live) setLoading(false); });
    void Promise.all([getArgDiscoveryState(owner), getArchiveFlags(owner)]).then(([state, flags]) => {
      if (live) setRecovered(recoveredNotes(state, flags));
    }).catch(() => { /* Leave ordinary notes usable; retry on next focus. */ });
    if (owner) void canImportGuestDiscoveries(owner).then(available => {
      if (live) setGuestImportAvailable(available);
    }).catch(() => undefined);
    if (owner) void syncJournal(owner).then(r => {
      if (live && version === refreshVersion.current) showResult(r);
    }).catch(() => { if (live) setStatus("Account sync is unavailable. Try again later."); });
    return () => { live = false; refreshVersion.current += 1; };
  }, [owner]));
  const palette = { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.card };
  const action = (title: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[s.button, { borderColor: tokens.border, backgroundColor: tokens.card, opacity: disabled ? .5 : 1 }]}>
      <Text style={{ color: tokens.text, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
  function offerGuestImport() {
    if (!owner || importing || !active.current) return;
    const run = async () => {
      if (!active.current) return;
      setImporting(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || data.session?.user.id !== owner || !active.current) return;
        const imported = await importGuestDiscoveries(owner);
        const [state, flags] = await Promise.all([getArgDiscoveryState(owner), getArchiveFlags(owner)]);
        if (active.current) {
          setRecovered(recoveredNotes(state, flags));
          setGuestImportAvailable(await canImportGuestDiscoveries(owner));
          setStatus(imported ? "Your retained discoveries have been copied to this account on this device. No rewards were issued." : "No guest discoveries are available to import.");
        }
      } catch {
        if (active.current) setStatus("Could not finish importing. You can retry on this account.");
      } finally { if (active.current) setImporting(false); }
    };
    const explanation = "Only continue if the guest discoveries on this device are yours. This copies retained discoveries into this account without changing personal notes or granting rewards. Guest discoveries can be imported once on this device.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(explanation)) void run();
    } else Alert.alert("Import your guest discoveries?", explanation, [
      { text: "Cancel", style: "cancel" }, { text: "Import", onPress: () => void run() },
    ]);
  }
  function change(next: JournalNote | null) {
    editing.current = true;
    setDraft(next);
    void writeJournalDraft(owner, next).catch(() => { if (active.current) setStatus("Draft could not be saved on this device."); });
  }
  function patch(p: Partial<JournalNote>) {
    if (!draft) return;
    change({ ...draft, ...p, updatedAt: new Date().toISOString() });
  }
  async function refreshCloud() {
    const version = ++refreshVersion.current;
    try {
      const r = await syncJournal(owner);
      if (active.current && version === refreshVersion.current) showResult(r);
    } catch { if (active.current) setStatus("Could not sync; your local notes remain available."); }
  }
  async function save() {
    if (!draft || saving || (!draft.body.trim() && !draft.title.trim())) return;
    setSaving(true);
    ++refreshVersion.current;
    try {
      const next = { ...draft, title: draft.title.trim() || "Untitled note", updatedAt: new Date().toISOString() };
      const r = await saveJournalNote(owner, next);
      await writeJournalDraft(owner, null);
      if (active.current) { setDraft(null); showResult(r); }
      if (owner) void refreshCloud();
    } catch { if (active.current) setStatus("Could not save your note. Your editor remains open."); }
    finally { if (active.current) setSaving(false); }
  }
  function remove(note: JournalNote) {
    const run = async () => {
      ++refreshVersion.current;
      try {
        const r = await deleteJournalNote(owner, note.id);
        showResult(r);
        if (draft?.id === note.id) change(null);
        if (owner) void refreshCloud();
      } catch { if (active.current) setStatus("Could not delete the note."); }
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Delete this note?")) void run();
    } else Alert.alert("Delete note?", "This removes your saved note.", [
      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void run() }
    ]);
  }
  async function copy(note: Pick<JournalNote,"title"|"body">) {
    const value = noteText(note);
    try {
      if (await Clipboard.setStringAsync(value)) {
        if (active.current) setStatus("Copied.");
        return;
      }
    } catch { /* A selectable field is available on every platform. */ }
    if (active.current) setCopyText(value);
  }
  async function share(note: Pick<JournalNote,"title"|"body">) {
    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          await navigator.share({ title: note.title, text: noteText(note) });
        } else await copy(note);
      } else await Share.share({ title: note.title, message: noteText(note) });
    } catch { if (active.current) setStatus("Sharing was cancelled or unavailable."); }
  }
  async function print(note: Pick<JournalNote,"title"|"body">, pdf: boolean) {
    try {
      const html = noteHtml(note);
      if (pdf && Platform.OS !== "web") {
        const file = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
        else if (active.current) setStatus("PDF sharing is unavailable on this device.");
      } else if (Platform.OS === "web") {
        // Expo Print on web prints the whole current page. Use an isolated document
        // so unrelated notes, clues or personal information cannot leak into an export.
        if (typeof window === "undefined") return;
        const popup = window.open("", "_blank");
        if (!popup) { setStatus("Allow pop-ups to print or save this note as PDF."); return; }
        popup.opener = null;
        popup.document.write(html);
        popup.document.close();
        popup.focus();
        popup.print();
      } else await Print.printAsync({ html });
    } catch { if (active.current) setStatus("Printing or PDF export was unavailable."); }
  }
  function tools(note: Pick<JournalNote,"title"|"body">) {
    return <View style={s.actions}>
      {action("Copy", () => void copy(note))}
      {action("Share", () => void share(note))}
      {action("Print", () => void print(note, false))}
      {action("PDF", () => void print(note, true))}
    </View>;
  }
  const visible = matchingNotes(notes, query);
  const ink = "#9f2539";
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: tokens.card }} contentContainerStyle={s.page}>
      <Text accessibilityRole="header" style={[s.title, { color: tokens.text }]}>My Journal</Text>
      <Text style={{ color: tokens.text, opacity: .8 }}>A place for study notes, questions and ideas.</Text>
      <Text style={{ color: tokens.text, opacity: .7 }}>{owner ? "Private to your account. Saved notes sync when connected." : "Guest notes stay on this device."}</Text>
      <View style={s.actions}>
        {action("New note", () => change(makeJournalNote()), !!draft)}
        {owner ? action("Sync", () => void refreshCloud(), saving) : null}
        {owner && guestImportAvailable ? action(importing ? "Importing…" : "Import my guest discoveries", offerGuestImport, importing) : null}
      </View>
      {status ? <Text accessibilityLiveRegion="polite" style={{ color: tokens.text }}>{status}</Text> : null}
      {copyText !== null ? <View style={[s.card, palette]}>
        <Text style={{ color: tokens.text }}>Select the text to copy using your device’s menu.</Text>
        <TextInput accessibilityLabel="Text to copy" value={copyText} multiline editable={false} selectTextOnFocus style={[s.input, palette, { minHeight: 90 }]} />
        {action("Close", () => setCopyText(null))}
      </View> : null}
      {draft ? <View style={[s.card, palette]}>
        <Text accessibilityRole="header" style={[s.heading, { color: tokens.text }]}>Edit note</Text>
        <TextInput accessibilityLabel="Note title" placeholder="Title" placeholderTextColor={tokens.text} value={draft.title} onChangeText={title => patch({ title })} maxLength={160} style={[s.input, palette]} editable={!saving} />
        <TextInput accessibilityLabel="Note subject" placeholder="Subject (optional)" placeholderTextColor={tokens.text} value={draft.subject} onChangeText={subject => patch({ subject })} maxLength={80} style={[s.input, palette]} editable={!saving} />
        <TextInput accessibilityLabel="Note body" placeholder="Write or paste your notes…" placeholderTextColor={tokens.text} value={draft.body} onChangeText={body => patch({ body })} multiline maxLength={60000} textAlignVertical="top" style={[s.input, palette, { minHeight: 180 }]} editable={!saving} />
        <View style={s.actions}>
          {action("Paste", () => void Clipboard.getStringAsync().then(value => {
            if (active.current && value) {
              // Use current editor state, not a stale closure from the permission prompt.
              setDraft(current => {
                if (!current || current.id !== draft.id) return current;
                const next = { ...current, body: (current.body + (current.body ? "\n" : "") + value).slice(0,60000), updatedAt: new Date().toISOString() };
                void writeJournalDraft(owner,next).catch(() => { if (active.current) setStatus("Could not save the pasted draft."); });
                return next;
              });
            }
          }).catch(() => { if (active.current) setStatus("Paste is unavailable; use the system edit menu."); }), saving)}
          {action("Heading", () => patch({ body: (draft.body + "\n## ").slice(0,60000) }), saving)}
          {action("Checklist", () => patch({ body: (draft.body + "\n☐ ").slice(0,60000) }), saving)}
          {action("Bullet", () => patch({ body: (draft.body + "\n• ").slice(0,60000) }), saving)}
          {action(draft.pinned ? "Unpin" : "Pin", () => patch({ pinned: !draft.pinned }), saving)}
        </View>
        <Text style={{ color: tokens.text, opacity: .7 }}>Draft is saved on this device as you type.</Text>
        <View style={s.actions}>
          {action(saving ? "Saving…" : "Save note", () => void save(), saving || (!draft.title.trim() && !draft.body.trim()))}
          {action("Discard draft", () => change(null), saving)}
        </View>
        {tools({ title: draft.title || "Untitled note", body: draft.body })}
      </View> : null}
      <TextInput accessibilityLabel="Search personal notes" placeholder="Search your notes" placeholderTextColor={tokens.text} value={query} onChangeText={setQuery} style={[s.input, palette]} />
      {loading ? <ActivityIndicator color={tokens.accent} /> : null}
      {!loading && !visible.length ? <Text style={{ color: tokens.text, opacity: .75 }}>{query ? "No matching notes." : "Your notes will appear here."}</Text> : null}
      {visible.map(note => <View key={note.id} style={[s.card, palette]}>
        <Text style={[s.heading,{ color: tokens.text }]}>{note.pinned ? "★ " : ""}{note.title}</Text>
        <Text style={{ color: tokens.text, opacity: .65 }}>{[note.subject, new Date(note.updatedAt).toLocaleDateString()].filter(Boolean).join(" · ")}</Text>
        <Text selectable style={[s.body, { color: tokens.text }]}>{note.body}</Text>
        <View style={s.actions}>
          {action("Edit", () => change(note), !!draft)}
          {action("Delete", () => remove(note), !!draft)}
        </View>
        {tools(note)}
      </View>)}
      {recovered.length ? <View style={s.retained}>
        <Text accessibilityRole="header" style={[s.title, { color: tokens.isDark ? "#f4a4ad" : ink, fontFamily: fontLoaded ? "NoraHand" : undefined }]}>{recoveredHeading(recovered)}</Text>
        {recovered.map(note => <View key={note.id} style={s.paper}>
          <Text style={{ color: ink, fontSize: 29, fontFamily: fontLoaded ? "NoraHand" : undefined }}>{note.title}</Text>
          <Text selectable style={{ color: ink, fontSize: 27, lineHeight: 35, fontFamily: fontLoaded ? "NoraHand" : undefined }}>{note.body}</Text>
          <Text style={{ color: "#754e51", fontSize: 12 }}>Retained · Read-only</Text>
          {tools(note)}
          {action("Write a note", () => change(makeJournalNote("Thoughts on " + note.title)), !!draft)}
        </View>)}
      </View> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { width: "100%", maxWidth: 820, alignSelf: "center", padding: 18, paddingBottom: 44, gap: 12 },
  title: { fontSize: 29, fontWeight: "700" }, heading: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 9, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 7 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  retained: { marginTop: 22, gap: 12 },
  paper: { backgroundColor: "#fff5e6", borderColor: "#b66c67", borderWidth: 1, borderLeftWidth: 4, borderRadius: 6, padding: 15, gap: 12 },
});
