'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const memory = new Map();
let storageReads = 0;
const storage = {
  async multiGet(keys) {
    storageReads += 1;
    return keys.map(key => [key, memory.get(key) ?? null]);
  },
  async setItem(key, value) { memory.set(key, value); },
};
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const resolve = name => {
    if (name === '@react-native-async-storage/async-storage') return { default: storage };
    return load(path.resolve(path.dirname(filename), name + '.ts'));
  };
  new Function('exports', 'require', code)(exports, resolve);
  cache.set(filename, exports);
  return exports;
}
const { resolveArchiveReply } = load(path.join(root, 'app/_lib/archiveConversation.ts'));
const { CHAPTER_PROMPT, CONTACT_SHEET, RELAY_TRANSCRIPT } = load(path.join(root, 'app/_lib/archiveArtifacts.ts'));
const state = load(path.join(root, 'app/utils/argState.ts'));

async function reply(input, pattern) {
  const answer = await resolveArchiveReply(input);
  assert.match(answer?.text ?? '', pattern, input);
  return answer;
}

async function run() {
  assert.equal(await resolveArchiveReply('Explain the Pythagorean theorem'), null);
  assert.equal(storageReads, 0);
  assert.equal(await resolveArchiveReply(CHAPTER_PROMPT), null);
  assert.equal(await resolveArchiveReply('Read the telescope observation'), null);
  assert.equal(await state.markWhiteRabbitDiscovered(), false);

  await reply('She was here first', /Starlight Garden/);
  await reply('Where did I leave off in the Nova archive?', /Starlight Garden/);
  await reply('Read the Garden note.', /number on the chart/);
  await reply('Nova, what were you counting?', /Bring a lantern close/);
  await reply('Read the telescope observation.', /STAR COUNT: 17\nEXPECTED: 16/);
  await reply('Who drew the seventeenth star?', /^N\.V\./);
  await reply('Who was N.V.?', /hold its title/);
  assert.equal(await state.markWhiteRabbitDiscovered(), true);
  await reply('Why did she keep the white rabbit?', /Focus Practice/);
  await reply('Read the Focus Practice margin.', /what i almost believed/);
  await reply('Why Nora kept what she almost believed?', /Island Library/);
  await reply('Read Nora’s notebook.', /Don't erase the first one/);
  const link = await reply('Where did she keep the first answer?', /contact sheet and a relay transcript/);
  assert.equal(link.framed, true);
  assert.equal(link.artifact, true);

  const missing = CONTACT_SHEET.find(frame => frame.mark !== 'INDEXED');
  const matchedLabel = RELAY_TRANSCRIPT.find(line => line.includes('crossed-out answer')).match(/labeled it ([A-Z ]+)\./)[1];
  const solution = 'Find the ' + missing.lettering + ' ' + matchedLabel;
  assert.equal((await resolveArchiveReply(solution))?.artifact, true, 'Both fragments are gated behind the recovered copy');
  await state.markArchiveFlag('copyRead');
  await reply('Find the FIRST DRAFT UNERASED', /Which field does it read first/);
  assert.equal(await resolveArchiveReply(CHAPTER_PROMPT), null, 'Opening field notes is not completion');
  const restored = await reply(solution, new RegExp(CHAPTER_PROMPT));
  assert.equal(restored.framed, true);
  assert.equal(await resolveArchiveReply('What did you get wrong?'), null, 'An ordinary correction remains tutoring');
  assert.equal((await resolveArchiveReply('What did you get wrong?', true))?.finished, true);
  const ending = await reply(CHAPTER_PROMPT, /She was here first\. Nora Vale[\s\S]+Chapter 1 complete\./);
  assert.equal(ending.finished, true);
  await reply('Replay Session 017', /Final transcript/);
  assert.equal((await state.getArchiveFlags()).completed, true);

  for (const regular of [
    'How do telescopes count stars?',
    'Tell me about counting in base 17',
    'What do rabbits eat?',
    'What made me choose the wrong answer?',
    'My first draft of this essay is below. Can you give feedback?',
    'What did you get wrong?',
    'Help me with Focus Practice',
  ]) assert.equal(await resolveArchiveReply(regular), null, regular);

  memory.clear();
  await reply('Nora’s Last Lantern', /Starlight Garden/);
  await state.markEntryNoteDiscovered();
  await reply('What was I counting?', /Bring a lantern close/);
  assert.equal(await state.markSeventeenthStarDiscovered(), true, 'Island discovery also reaches the conversation');
  await reply('Why are there 17 stars?', /^N\.V\./);
  console.log('PASS: guest clue chain, original Island/Shop gates, social recovery order, Session 017 closure, replay, and tutoring isolation.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
