import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager, gameRulesKey, rewardTier } from '../src/core/SessionManager.js';
import { DEFAULT_SETTINGS } from '../src/core/SettingsManager.js';

class Storage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
const create = (storage = new Storage(), seed = []) => new SessionManager(DEFAULT_SETTINGS, storage, seed);

test('reload recovers the selected outcome and the complete series', () => {
  const storage = new Storage();
  const session = create(storage);
  session.setPlayer('Kaktus');
  for (let i = 0; i < 12; i++) session.play(0);
  const resumed = create(storage);
  assert.equal(resumed.state.total, 480);
  assert.equal(resumed.state.spinCount, 12);
  assert.equal(resumed.state.history.length, 12);
  assert.equal(resumed.state.canSpin(), true);
  assert.equal(resumed.player, 'Kaktus');
  assert.equal(resumed.runId, session.runId);
});

test('completion archives exactly once even after reload', () => {
  const storage = new Storage();
  const session = create(storage);
  session.play(0);
  session.play(4);
  session.play(3);
  assert.equal(session.state.total, 180);
  assert.equal(session.runs.length, 1);
  assert.equal(session.runs[0].multipliers, 1);
  assert.equal(session.runs[0].streak, 3);
  assert.equal(session.runs[0].history.length, 3);
  assert.equal(create(storage).runs.length, 1);
  assert.throws(() => session.play(0));
  assert.equal(session.runs.length, 1);
});

test('Hardcore switches to multiplier after two spins and restores its phase', () => {
  const storage = new Storage();
  const session = create(storage);
  session.setMode('hardcore');
  session.play(12);
  session.play(12);
  const resumed = create(storage);
  assert.equal(resumed.mode, 'hardcore');
  assert.equal(resumed.segments()[3].multiplier, 2.5);
  resumed.play(3);
  assert.equal(resumed.state.total, 5000);
  assert.equal(resumed.state.spinCount, 3);
  assert.equal(resumed.runs[0].mode, 'hardcore');
});

test('presentation changes keep total and history; rule changes are blocked during a run', () => {
  const session = create();
  session.play(0);
  assert.equal(session.applySettings({...DEFAULT_SETTINGS, masterVolume:0.1, spinDurationMs:1000}), true);
  assert.equal(session.state.total, 40);
  assert.equal(session.state.history.length, 1);
  assert.equal(session.applySettings({...DEFAULT_SETTINGS, startingSpins:3}), false);
  assert.equal(session.settings.startingSpins, 1);
  assert.equal(session.state.total, 40);
});

test('mode and player cannot replace a live series; queue advances only on request', () => {
  const session = create();
  session.setPlayer('A');
  session.setQueue(['B', 'C']);
  session.play(0);
  assert.equal(session.setMode('hardcore'), false);
  assert.equal(session.setPlayer('X'), false);
  assert.equal(session.nextPlayer(), false);
  session.play(3);
  assert.equal(session.nextPlayer(), true);
  assert.equal(session.player, 'B');
  assert.deepEqual(session.queue, ['C']);
  assert.equal(session.state.total, 0);
  assert.equal(session.runs[0].name, 'A');
});

test('gameplay identity ignores cosmetics and distinguishes custom amounts', () => {
  assert.equal(gameRulesKey(DEFAULT_SETTINGS), gameRulesKey({...DEFAULT_SETTINGS, masterVolume:0}));
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.segments[0].tone = 'cyan';
  assert.equal(gameRulesKey(settings), gameRulesKey(DEFAULT_SETTINGS));
  settings.segments[0].value = 90;
  assert.notEqual(gameRulesKey(settings), gameRulesKey(DEFAULT_SETTINGS));
  const session = create();
  session.applySettings(settings);
  session.play(3);
  assert.equal(session.runs[0].mode, 'custom');
  assert.equal(session.board('normal').length, 0);
  assert.equal(session.board('custom').length, 1);
});

test('backup imports atomically, preserves history and deduplicates IDs', () => {
  const source = create();
  source.play(3);
  source.saveProfile('Moje kolo');
  const dest = create();
  dest.importData(source.exportData());
  dest.importData(source.exportData());
  assert.equal(dest.runs.length, 1);
  assert.equal(dest.profiles.length, 1);
  const before = JSON.stringify(dest.exportData());
  assert.throws(() => dest.importData({version:1,runs:[{id:'oops',loss:-1}]}));
  assert.equal(JSON.stringify(dest.exportData()), before);
});

test('corrupt storage and blocked storage do not prevent gameplay', () => {
  const storage = new Storage();
  storage.setItem('kolo-nestesti-studio-v1', '{broken');
  assert.equal(create(storage).state.canSpin(), true);
  const blocked = { getItem(){throw Error('blocked');}, setItem(){throw Error('quota');} };
  const session = create(blocked);
  session.play(0);
  assert.equal(session.state.total, 40);
  assert.equal(session.storageAvailable, false);
});

test('old leaderboard entries migrate once without losing duplicate-player results', () => {
  const storage = new Storage();
  const seed = [{name:'A',loss:500,streak:5},{name:'A',loss:300,streak:3}];
  const first = create(storage, seed);
  assert.equal(first.runs.length, 2);
  assert.equal(create(storage, seed).runs.length, 2);
  assert.equal(first.board('normal')[0].loss, 500);
});

test('invalid result indices never spend a spin', () => {
  const session = create();
  assert.throws(() => session.play(99));
  assert.throws(() => session.play(-1));
  assert.equal(session.state.spinCount, 0);
});

test('odds and effects are based on actual mode and wheel configuration', () => {
  const session = create();
  assert.equal(session.summary().endCount, 1);
  assert.equal(session.summary().count, 18);
  assert.equal(session.summary().meanSpins, 18);
  assert.equal(rewardTier({type:'money',value:150}, 'hardcore'), 'small');
  assert.equal(rewardTier({type:'money',value:1000}, 'hardcore'), 'big');
  assert.equal(rewardTier({type:'money',value:40}, 'normal'), 'small');
});

test('editing the normal wheel never changes Hardcore starting spins', () => {
  const session = create();
  session.setMode('hardcore');
  session.applySettings({...DEFAULT_SETTINGS, startingSpins:10});
  assert.equal(session.state.spins, 3);
  session.play(0); session.play(0); session.play(0);
  assert.equal(session.state.isEnded(), true);
});

test('unreadable storage is preserved while a replacement series runs in memory', () => {
  const storage = new Storage();
  storage.setItem('kolo-nestesti-studio-v1', '{broken');
  const session = create(storage);
  session.play(0);
  assert.equal(session.storageAvailable, false);
  assert.equal(storage.getItem('kolo-nestesti-studio-v1'), '{broken');
  assert.equal(session.state.total, 40);
});

test('changing rules after completion starts a fresh run without reviving its archive', () => {
  const storage = new Storage();
  const session = create(storage);
  session.play(3);
  const previousId = session.runId;
  session.applySettings({...DEFAULT_SETTINGS, startingSpins:3});
  const resumed = new SessionManager(session.settings, storage);
  assert.notEqual(resumed.runId, previousId);
  assert.equal(resumed.state.spinCount, 0);
  assert.equal(resumed.state.spins, 3);
  assert.equal(resumed.runs.find(r=>r.id===previousId).loss, 100);
});

test('backup rejects impossible outcomes, wrong categories, and disguised legacy runs atomically', () => {
  const session = create();
  session.play(3);
  const original = JSON.stringify(session.exportData());
  const impossible = session.exportData();
  impossible.runs[0].loss = impossible.runs[0].history[0].after = impossible.runs[0].history[0].value = 999999;
  assert.throws(()=>session.importData(impossible));
  const wrongMode = session.exportData();
  wrongMode.runs[0].mode = 'custom';
  assert.throws(()=>session.importData(wrongMode));
  const legacy = session.exportData();
  legacy.runs[0].legacy = true;
  legacy.runs[0].history = [];
  assert.throws(()=>session.importData(legacy));
  assert.equal(JSON.stringify(session.exportData()), original);
});

test('valid imports do not replace existing immutable results with the same ID', () => {
  const session = create();
  session.play(3);
  const backup = session.exportData();
  backup.runs[0].name = 'Someone else';
  session.importData(backup);
  assert.equal(session.runs[0].name, 'Host');
});

test('Hardcore imported outcomes must follow money-money-multiplier phases', () => {
  const session = create();
  session.setMode('hardcore');
  session.play(0); session.play(0); session.play(0);
  const backup = session.exportData();
  backup.runs[0].history[0] = {...backup.runs[0].history[0],type:'money',value:150,multiplier:null,after:450};
  backup.runs[0].loss = 450;
  assert.throws(()=>session.importData(backup));
});

test('archives larger than 2000 runs can be exported, imported and restored', () => {
  const storage = new Storage();
  const session = create(storage);
  session.play(3);
  const run = session.runs[0];
  session.runs = Array.from({length:2001},(_,i)=>({...run,id:'run-'+i}));
  assert.equal(session.persist(), true);
  const resumed = create(storage);
  assert.equal(resumed.runs.length, 2001);
  assert.equal(resumed.storageAvailable, true);
  const dest = create();
  dest.importData(resumed.exportData());
  assert.equal(dest.runs.length, 2001);
});


test('normal series can be ended manually, archived, and restored after reload', () => {
  const storage = new Storage();
  const session = create(storage);

  session.setPlayer('Cashout');
  session.play(0);
  session.play(4);

  const run = session.manualFinish();

  assert.ok(run);
  assert.equal(run.endedBy, 'manual');
  assert.equal(run.loss, 80);
  assert.equal(run.streak, 2);
  assert.equal(session.state.isEnded(), true);
  assert.equal(session.state.spins, 0);
  assert.equal(session.runs.length, 1);

  const resumed = create(storage);
  assert.equal(resumed.state.isEnded(), true);
  assert.equal(resumed.state.total, 80);
  assert.equal(resumed.result().endedBy, 'manual');
  assert.equal(resumed.runs.length, 1);
});

test('manual finish is unavailable before the first spin and in Hardcore', () => {
  const normal = create();
  assert.equal(normal.manualFinish(), null);
  assert.equal(normal.state.isEnded(), false);

  normal.setMode('hardcore');
  normal.play(0);
  assert.equal(normal.manualFinish(), null);
  assert.equal(normal.state.isEnded(), false);
  assert.equal(normal.runs.length, 0);
});

test('manual ending survives backup export and import validation', () => {
  const source = create();
  source.play(0);
  source.manualFinish();

  const backup = source.exportData();
  assert.equal(backup.runs[0].endedBy, 'manual');

  const destination = create();
  destination.importData(backup);

  assert.equal(destination.runs.length, 1);
  assert.equal(destination.runs[0].endedBy, 'manual');
  assert.equal(destination.runs[0].loss, 40);
});
