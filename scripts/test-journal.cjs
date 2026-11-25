'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const values = new Map();
const storage = {
  getItem: async k => values.get(k) ?? null,
  multiGet: async keys => keys.map(k => [k, values.get(k) ?? null]),
  setItem: async (k,v) => { values.set(k,v); },
  removeItem: async k => { values.delete(k); },
  multiRemove: async keys => { keys.forEach(k => values.delete(k)); },
};
let owner = 'a', offline = false, calls = 0;
const remote = new Map();
const supabase = {
  auth: { getSession: async () => ({data:{session:{user:{id:owner}}},error:null}) },
  from(table) {
    assert.equal(table,'journal_notes');
    calls++;
    const fail = () => offline ? {error:Error('offline')} : null;
    return {
      async upsert(row) {
        if (fail()) return fail();
        assert.equal(row.user_id,owner);
        remote.set(row.user_id+'/'+row.id,row);
        return {error:null};
      },
      delete() {
        return {eq(field,uid) { assert.equal(field,'user_id'); assert.equal(uid,owner);
          return {async eq(field,id) { assert.equal(field,'id'); if(fail()) return fail(); remote.delete(uid+'/'+id); return {error:null}; }};
        }};
      },
      select() {
        return {eq(field,uid) { assert.equal(field,'user_id'); assert.equal(uid,owner);
          return {order(){return {async range(start,end) { if(fail())return fail(); return {data:[...remote.values()].filter(r=>r.user_id===uid).slice(start,end+1),error:null}; }};}};
        }};
      },
    };
  }
};
const cache = new Map();
function load(filename) {
  if(cache.has(filename))return cache.get(filename);
  const m = {};
  const source=fs.readFileSync(filename,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(compiled.diagnostics.length,0,filename);
  new Function('exports','require',compiled.outputText)(m,name=>{
    if(name==='@react-native-async-storage/async-storage')return {default:storage};
    if(name==='../lib/supabase')return {supabase};
    return load(path.resolve(path.dirname(filename),name+'.ts'));
  });
  cache.set(filename,m);
  return m;
}
const model=load(path.join(root,'app/_lib/journalModel.ts'));
const store=load(path.join(root,'app/_lib/journalStorage.ts'));
const args=load(path.join(root,'app/utils/argState.ts'));
(async()=>{
  const found=async()=>model.recoveredNotes(await args.getArgDiscoveryState(),await args.getArchiveFlags());
  assert.deepEqual(await found(),[]);
  await args.markArchiveFlag('glowDescriptionRead');
  assert.deepEqual((await found()).map(n=>n.id),['glow-description']);
  assert.match((await found())[0].body,/Some halos endure/);
  assert.equal(model.recoveredHeading(await found()),'Retained Notes');
  await args.markArchiveFlag('pencilTraceRead');
  await args.markArchiveFlag('introduced');
  await args.markEntryNoteDiscovered();
  assert.equal((await found()).at(-1).id,'garden');
  await args.markTelescopeClueUnlocked();
  assert.equal((await found()).at(-1).id,'garden','unlock is not discovery');
  await args.markSeventeenthStarDiscovered();
  assert.equal((await found()).at(-1).id,'chart');
  await args.markNvDiscovered();
  await args.markWhiteRabbitClueUnlocked();
  await args.markWhiteRabbitDiscovered();
  await args.markFocusPracticeUnlocked();
  await args.markFocusPracticeNoteDiscovered();
  await args.markLibraryNotebookUnlocked();
  await args.markLibraryNotebookDiscovered();
  await args.markLanternCopyDiscovered();
  await args.markLanternFolderDiscovered();
  await args.markArchiveFlag('copyUnlocked');
  assert.equal((await found()).at(-1).id,'folder');
  assert.ok(!(await found()).some(n=>n.id==='draft'));
  await args.markArchiveFlag('copyRead');
  assert.equal((await found()).at(-1).id,'source');
  await args.markArchiveFlag('draftRestored');
  assert.equal((await found()).at(-1).id,'draft');
  assert.equal(model.recoveredHeading(await found()),'Retained Notes');
  await args.markArgAct1Complete();
  await args.markArchiveFlag('completed');
  assert.equal((await found()).at(-1).id,'session');
  assert.equal(model.recoveredHeading(await found()),'Nora’s Notes');
  assert.equal(new Set((await found()).map(n=>n.id)).size,(await found()).length);
  assert.deepEqual(await found(),await found(),'reopening does not duplicate recovered records');

  // Completing the story as a guest cannot expose clues in a new account.
  assert.deepEqual(model.recoveredNotes(await args.getArgDiscoveryState('a'),await args.getArchiveFlags('a')),[]);
  await args.markArchiveFlag('glowDescriptionRead','a');
  await args.markEntryNoteDiscovered('a');
  await args.markTelescopeClueUnlocked('a');
  await args.markSeventeenthStarDiscovered('a');
  const aClues=model.recoveredNotes(await args.getArgDiscoveryState('a'),await args.getArchiveFlags('a'));
  assert.deepEqual(aClues.map(n=>n.id),['glow-description','garden','chart']);
  assert.equal(model.recoveredHeading(aClues),'Retained Notes');
  assert.deepEqual(model.recoveredNotes(await args.getArgDiscoveryState('b'),await args.getArchiveFlags('b')),[]);
  assert.equal(await args.markNvDiscovered('b'),false);
  // Old unowned progress must never be inherited by a new account.
  values.set(args.ARG_ENTRY_NOTE_DISCOVERED_KEY,'1');
  assert.equal((await args.getArgDiscoveryState('b')).entryNoteDiscovered,false);
  assert.equal(model.recoveredHeading(await found()),'Nora’s Notes');
  const conversation=load(path.join(root,'app/_lib/archiveConversation.ts'));
  assert.equal(await conversation.resolveArchiveReply('Read the telescope observation',false,false,'b'),null);
  assert.match((await conversation.resolveArchiveReply('Who signed the chart?',false,false,'a'))?.text??'',/^N\.V\./);
  assert.equal((await args.getArgDiscoveryState('b')).nvDiscovered,false);
  await args.clearArgOwner('a');
  assert.deepEqual(model.recoveredNotes(await args.getArgDiscoveryState('a'),await args.getArchiveFlags('a')),[]);
  assert.equal(model.recoveredHeading(await found()),'Nora’s Notes');

  // Explicit local import: no transfer to another account, no duplicate credit or note upload.
  assert.equal(await args.canImportGuestDiscoveries('b'),true);
  const rewards=load(path.join(root,'app/_lib/archiveReward.ts'));
  assert.deepEqual(await rewards.completeArchive('https://example.invalid','fixture-token'),{status:'closed'});
  const callsBeforeImport=calls;
  assert.equal(await args.importGuestDiscoveries('b'),true);
  const imported=model.recoveredNotes(await args.getArgDiscoveryState('b'),await args.getArchiveFlags('b'));
  assert.deepEqual(imported.map(n=>n.id),(await found()).map(n=>n.id));
  assert.equal(model.recoveredHeading(imported),'Nora’s Notes');
  assert.equal(await args.importGuestDiscoveries('b'),false);
  assert.equal(await args.importGuestDiscoveries('a'),false);
  assert.equal(calls,callsBeforeImport,'import cannot call database reward RPC or upload notes');
  assert.deepEqual(model.recoveredNotes(await args.getArgDiscoveryState('a'),await args.getArchiveFlags('a')),[]);
  assert.equal(model.recoveredHeading(await found()),'Nora’s Notes','guest record remains intact');

  const note={...model.makeJournalNote('Biology','<script>bad</script>','science'),id:'same-id'};
  const guest={...note,title:'Guest'};
  await store.saveJournalNote(null,guest);
  assert.equal((await store.loadJournalLocal(null)).notes[0].title,'Guest');
  assert.equal(calls,0,'guest content never sent to database');
  await store.saveJournalNote('a',note);
  offline=true;
  assert.equal((await store.syncJournal('a')).syncFailed,true);
  assert.equal((await store.loadJournalLocal('a')).pending,1);
  assert.equal((await store.loadJournalLocal('b')).notes.length,0);
  await store.writeJournalDraft('a',note);
  assert.equal(await store.readJournalDraft('b'),null);
  offline=false;
  assert.equal((await store.syncJournal('a')).pending,0);
  owner='b';
  await store.saveJournalNote('b',{...note,title:'B'});
  assert.equal((await store.syncJournal('b')).notes[0].title,'B');
  assert.equal((await store.syncJournal('a')).syncFailed,true,'wrong authenticated user cannot sync');
  owner='a';
  assert.equal((await store.syncJournal('a')).notes[0].title,'Biology');
  await store.deleteJournalNote('a',note.id);
  assert.equal((await store.syncJournal('a')).notes.length,0);
  assert.equal(remote.get('b/same-id').title,'B');
  await store.clearJournalOwner('a');
  assert.equal(await store.readJournalDraft('a'),null);
  assert.equal((await store.loadJournalLocal(null)).notes[0].title,'Guest');
  assert.equal(model.matchingNotes([note],'SCIENCE').length,1);
  assert.doesNotMatch(model.noteHtml(note),/<script>/);
  assert.match(model.noteHtml(note),/&lt;script&gt;/);
  console.log('PASS: progressive clue visibility, duplicate-free recovery, scoped drafts and notes, offline retries, account sync, deletion, and HTML escaping.');
})().catch(e=>{console.error(e);process.exitCode=1;});
