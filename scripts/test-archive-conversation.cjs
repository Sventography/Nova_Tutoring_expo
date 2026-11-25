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
const conversationPath = path.join(root, 'app/_lib/archiveConversation.ts');
let { resolveArchiveReply, isLegacyArchiveQuestion } = load(conversationPath);
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
  await reply('Read the Garden note.', /printed chart says sixteen/);
  await reply('Nova, what were you counting?', /Bring a lantern close/);
  await reply('Read the telescope observation.', /STAR COUNT: 17[\s\S]+PRINTED CHART: 16[\s\S]+BY HAND/);
  await reply('Who signed the chart?', /^N\.V\./);
  const earlyTheory = await reply('Were those really Nora’s memories?', /handwriting/);
  assert.equal(earlyTheory.finished, undefined);
  await reply('Who was N.V.?', /inventory label/);
  assert.equal(await state.markWhiteRabbitDiscovered(), true);
  await reply('Who really mended the rabbit’s ear?', /Focus Practice/);
  await reply('Read the Focus Practice margin.', /what i almost believed/);
  cache.clear();
  ({ resolveArchiveReply, isLegacyArchiveQuestion } = load(conversationPath));
  await reply('Continue the Nova archive', /Why would Nora save a wrong answer/);
  assert.equal(await resolveArchiveReply('I’m stuck'), null);
  assert.match((await resolveArchiveReply('I’m stuck', false, true)).text, /margin/);
  await reply('Why would Nora save a wrong answer?', /Island Library/);
  await reply('Read Nora’s notebook.', /Don't erase the first one/);
  const link = await reply('Where did Nora save her first answer?', /contact sheet and a relay transcript/);
  assert.equal(link.framed, true);
  assert.equal(link.artifact, true);
  assert.doesNotMatch(link.text, /First attempt, crossed out|ASK NOVA WHAT SHE GOT WRONG/i);
  assert.equal((await state.getArgDiscoveryState()).argAct1Complete, false);

  const missing = CONTACT_SHEET.find(frame => frame.mark !== 'INDEXED');
  const matchedLabel = RELAY_TRANSCRIPT.find(line => line.includes('crossed-out answer')).match(/labeled it ([A-Z ]+)\./)[1];
  const solution = 'Find the ' + missing.lettering + ' ' + matchedLabel;
  assert.equal((await resolveArchiveReply(solution))?.artifact, true, 'Both fragments are gated behind the recovered copy');
  await state.markArchiveFlag('copyRead');
  await reply('The stamp is UNERASED', /crossed-out page/);
  await reply('The crossed-out label is FIRST DRAFT', /unindexed frame/);
  await reply('Find the FIRST DRAFT UNERASED', /Which field comes first/);
  assert.equal(await resolveArchiveReply(CHAPTER_PROMPT), null, 'Opening field notes is not completion');
  const restored = await reply(solution, new RegExp(CHAPTER_PROMPT));
  assert.equal(restored.framed, true);
  assert.match(restored.text, /First attempt, crossed out: Seventeen/);
  assert.equal((await state.getArchiveFlags()).completed, false);
  assert.equal(await resolveArchiveReply('What did you get wrong?'), null, 'An ordinary correction remains tutoring');
  const ending = await reply('Were those really Nora’s memories?', /She was here first\. Nora Vale[\s\S]+Chapter 1 complete\./);
  assert.equal(ending.finished, true);
  assert.equal((await reply("I think those were Nora's memories, not yours.", /Chapter 1 complete/)).finished, true);
  assert.equal((await reply("You’re remembering Nora's life.", /Chapter 1 complete/)).finished, true);
  assert.equal((await reply('Continue the Nova archive', /Final transcript/)).finished, undefined);
  assert.equal((await reply('Replay Session 017', /Final transcript/)).finished, true);
  assert.equal((await reply(CHAPTER_PROMPT, /Session 017 closed/)).finished, true);
  assert.equal((await state.getArchiveFlags()).completed, true);

  for (const regular of [
    'How do telescopes count stars?',
    'Tell me about counting in base 17',
    'What do rabbits eat?',
    'What made me choose the wrong answer?',
    'My first draft of this essay is below. Can you give feedback?',
    'What did you get wrong?',
    'Help me with Focus Practice',
    'Why is the White Rabbit late in Alice in Wonderland?',
    'Where is the lantern festival held?',
    'What do the initials DNA stand for?',
  ]) {
    assert.equal(await resolveArchiveReply(regular, false, false), null, regular);
    assert.equal(isLegacyArchiveQuestion(regular, false), false, regular);
  }
  assert.equal(isLegacyArchiveQuestion('Where?', false), false);
  assert.equal(isLegacyArchiveQuestion('Where?', true), true);

  memory.clear();
  await reply('Nora’s Last Lantern', /Starlight Garden/);
  await state.markEntryNoteDiscovered();
  await reply('What was I counting?', /Bring a lantern close/);
  assert.equal(await state.markSeventeenthStarDiscovered(), true, 'Island discovery also reaches the conversation');
  await reply('Why are there 17 stars?', /^N\.V\./);
  // A second complete route uses a player's observation rather than a copied command.
  await reply('Who was N.V.?', /different memory/);
  await state.markWhiteRabbitDiscovered();
  await reply('Who really repaired the rabbit’s ear?', /Focus Practice/);
  await reply('Read the Focus Practice margin', /what i almost believed/);
  await reply('Why would Nora save a wrong answer?', /very charts/);
  await reply('Read Nora’s notebook', /filed with the marked chart/);
  await reply('Where did Nora save her first answer?', /one missing record/);
  const observation = 'The unindexed frame 17 is UNERASED and the relay says FIRST DRAFT';
  assert.equal(await resolveArchiveReply(observation, false, true), null, 'Observation cannot bypass the field notes');
  await state.markArchiveFlag('copyRead');
  assert.equal(await resolveArchiveReply(observation, false, false), null, 'Outside archive context an observation is not a command');
  assert.match((await resolveArchiveReply(observation, false, true))?.text ?? '', /First attempt, crossed out: Seventeen/);
  assert.equal((await state.getArchiveFlags()).completed, false);
  const deduction = await reply('You confused Nora’s memories with your own.', /Nora was the one who lived them/);
  assert.equal(deduction.finished, true);
  assert.match(deduction.text, /without her wrong answer[\s\S]+extra star/);

  console.log('PASS: guest clue chain, original Island/Shop gates, social recovery order, Session 017 closure, replay, and tutoring isolation.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
