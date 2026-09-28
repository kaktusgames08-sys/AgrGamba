import { GameState } from './GameState.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './SettingsManager.js';
import { HARDCORE_STARTING_SPINS, HARDCORE_MONEY_SEGMENTS, HARDCORE_MULTIPLIER_SEGMENTS } from './HardcoreConfig.js';

const KEY = 'kolo-nestesti-studio-v1';
const copy = value => JSON.parse(JSON.stringify(value));
const nameOf = value => String(value ?? '').trim().slice(0, 32) || 'Host';
const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const validNumber = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;

export function gameRulesKey(settings) {
  return JSON.stringify([settings.startingSpins, settings.segments.map(s => [s.type, s.value ?? null, s.multiplier ?? null, s.extraSpins])]);
}

export function rewardTier(record, mode = 'normal') {
  if (record.type === 'multiplier') return 'multiplier2';
  const [medium, big] = mode === 'hardcore' ? [400, 750] : [60, 75];
  return record.value >= big ? 'big' : record.value >= medium ? 'medium' : 'small';
}

function restoreState(startingSpins, history, settings = DEFAULT_SETTINGS, mode = 'normal') {
  if (!Array.isArray(history) || history.length > 10000) throw Error('Neplatná historie série.');
  const state = new GameState(startingSpins);
  for (const saved of [...history].reverse()) {
    if (!saved || !['money','multiplier'].includes(saved.type)
      || !validNumber(saved.after) || !validNumber(saved.before)
      || ![0,1].includes(saved.extraSpins)
      || (saved.type === 'money' && !validNumber(saved.value))
      || (saved.type === 'multiplier' && ![1,1.5,2,2.5].includes(saved.multiplier))
      || !state.beginSpin()) throw Error('Neplatný průběh série.');
    const allowed = mode === 'hardcore'
      ? (state.spinCount <= 2 ? HARDCORE_MONEY_SEGMENTS : HARDCORE_MULTIPLIER_SEGMENTS)
      : settings.segments;
    const segment = allowed.find(s => s.type === saved.type && (s.extraSpins ?? 0) === saved.extraSpins
      && (s.type === 'money' ? s.value === saved.value : s.multiplier === saved.multiplier));
    if (!segment) throw Error('Výsledek nepatří do uloženého kola.');
    const record = state.resolve(segment);
    if (record.before !== saved.before || record.after !== saved.after) throw Error('Částky v historii nesouhlasí.');
    Object.assign(record, {hardcore:mode === 'hardcore',hardcoreFinal:mode === 'hardcore' && state.isEnded(),remainingSpins:state.spins});
  }
  return state;
}

function validateRun(raw) {
  if (!raw || typeof raw.id !== 'string' || raw.id.length > 100
    || typeof raw.name !== 'string' || !validNumber(raw.loss)
    || !Number.isInteger(raw.streak) || raw.streak < 0 || raw.streak > 10000
    || !['normal','hardcore','custom'].includes(raw.mode)) throw Error('Záloha obsahuje neplatný výsledek.');
  const legacy = raw.legacy === true;
  const rules = normalizeSettings(raw.rules ?? DEFAULT_SETTINGS);
  if (legacy && (!/^legacy-\d+$/.test(raw.id) || raw.mode !== 'normal' || !Array.isArray(raw.history) || raw.history.length)) throw Error('Neplatný původní výsledek.');
  if (!legacy && raw.mode !== 'hardcore' && (raw.mode === 'normal') !== (gameRulesKey(rules) === gameRulesKey(DEFAULT_SETTINGS))) throw Error('Režim neodpovídá pravidlům kola.');
  const state = legacy ? null : restoreState(raw.mode === 'hardcore' ? 3 : rules.startingSpins, raw.history, rules, raw.mode);
  if (state && (!state.isEnded() || state.total !== raw.loss || state.spinCount !== raw.streak)) throw Error('Výsledek neodpovídá historii.');
  return {
    id: raw.id, name: nameOf(raw.name), loss: raw.loss, streak: raw.streak, mode: raw.mode,
    endedAt: typeof raw.endedAt === 'string' && Number.isFinite(Date.parse(raw.endedAt)) ? raw.endedAt : null,
    legacy, history: state ? state.history : [], rules,
    multipliers: state ? state.history.filter(r => r.type === 'multiplier').length : 0,
  };
}

export class SessionManager {
  constructor(settings = DEFAULT_SETTINGS, storage = null, seedEntries = []) {
    this.storage = storage;
    this.storageAvailable = !!storage;
    this.saveBlocked = false;
    this.settings = normalizeSettings(settings);
    this.mode = 'normal';
    this.player = 'Host';
    this.queue = [];
    this.runs = [];
    this.profiles = [];
    this.resumed = false;
    this.runId = uid();
    this.startedAt = new Date().toISOString();
    this.state = new GameState(this.settings.startingSpins);
    try {
      const data = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (data && data.version !== 1) throw Error('Nepodporovaná verze uložené hry.');
      if (data?.version === 1) {
        const parsed = this.validateBackup(data);
        this.runs = parsed.runs;
        this.profiles = parsed.profiles;
        this.player = nameOf(data.player);
        this.queue = Array.isArray(data.queue) ? data.queue.slice(0,100).map(nameOf) : [];
        if (data.current) {
          const current = data.current;
          if (!['normal','hardcore'].includes(current.mode) || typeof current.id !== 'string') throw Error('Neplatná série');
          this.mode = current.mode;
          const rules = normalizeSettings(current.settings);
          this.settings = {...this.settings, segments:rules.segments, startingSpins:rules.startingSpins};
          this.state = restoreState(this.mode === 'hardcore' ? 3 : this.settings.startingSpins, current.history, this.settings, this.mode);
          this.runId = current.id;
          this.startedAt = current.startedAt;
          this.resumed = this.state.spinCount > 0;
        }
      } else {
        this.migrate(seedEntries);
      }
    } catch {
      // Do not overwrite an unreadable save. New play remains available in memory.
      this.storageAvailable = false;
      this.saveBlocked = true;
      this.state = new GameState(this.settings.startingSpins);
      this.mode = 'normal';
      if (!this.runs.length) this.migrate(seedEntries);
    }
  }

  migrate(entries) {
    this.runs = entries.filter(e => validNumber(Number(e.loss))).map((e,index) => ({
      id:'legacy-' + index, name:nameOf(e.name), loss:Number(e.loss), streak:Math.max(0,Math.round(Number(e.streak)||0)),
      mode:'normal', legacy:true, history:[], rules:copy(DEFAULT_SETTINGS), endedAt:null, multipliers:0,
    }));
  }

  active() { return this.state.spinCount > 0 && !this.state.isEnded(); }
  category() { return this.mode === 'hardcore' ? 'hardcore' : gameRulesKey(this.settings) === gameRulesKey(DEFAULT_SETTINGS) ? 'normal' : 'custom'; }
  segments() {
    return this.mode === 'hardcore'
      ? (this.state.spinCount >= 2 ? HARDCORE_MULTIPLIER_SEGMENTS : HARDCORE_MONEY_SEGMENTS)
      : this.settings.segments;
  }

  play(index) {
    const segments = this.segments();
    if (!Number.isInteger(index) || !segments[index] || !this.state.canSpin()) throw Error('Tento spin nelze odehrát.');
    const segment = segments[index];
    const nextTotal = segment.type === 'money' ? this.state.total + segment.value : this.state.total * segment.multiplier;
    if (!Number.isSafeInteger(nextTotal)) throw Error('Částka překročila podporovaný rozsah.');
    this.state.beginSpin();
    const record = this.state.resolve(segment);
    Object.assign(record, {hardcore:this.mode === 'hardcore',hardcoreFinal:this.mode === 'hardcore' && this.state.isEnded(),remainingSpins:this.state.spins});
    if (this.state.isEnded() && !this.runs.some(r => r.id === this.runId)) {
      this.runs.push({
        id:this.runId,name:this.player,loss:this.state.total,streak:this.state.spinCount,
        mode:this.category(),endedAt:new Date().toISOString(),legacy:false,
        history:copy(this.state.history),rules:copy(this.settings),
        multipliers:this.state.history.filter(r => r.type === 'multiplier').length,
      });
    }
    this.persist();
    return record;
  }

  restart() {
    if (this.active()) return false;
    this.state.setStartingSpins(this.mode === 'hardcore' ? HARDCORE_STARTING_SPINS : this.settings.startingSpins);
    this.state.reset();
    this.runId = uid();
    this.startedAt = new Date().toISOString();
    this.resumed = false;
    this.persist();
    return true;
  }

  setMode(mode) {
    if (!['normal','hardcore'].includes(mode) || this.active()) return false;
    this.mode = mode;
    return this.restart();
  }

  applySettings(next) {
    const normalized = normalizeSettings(next);
    const ruleChange = gameRulesKey(normalized) !== gameRulesKey(this.settings);
    if (ruleChange && this.active()) return false;
    this.settings = normalized;
    if (ruleChange && this.state.isEnded()) return this.restart();
    if (ruleChange && !this.state.spinCount) this.state.setStartingSpins(this.mode === 'hardcore' ? HARDCORE_STARTING_SPINS : normalized.startingSpins);
    if (ruleChange && !this.state.spinCount) this.state.reset();
    this.persist();
    return true;
  }

  setPlayer(name) {
    if (this.active() || this.state.isEnded()) return false;
    this.player = nameOf(name);
    this.persist();
    return true;
  }
  setQueue(names) {
    this.queue = names.filter(n => typeof n === 'string' && n.trim()).slice(0,100).map(nameOf);
    this.persist();
  }
  nextPlayer() {
    if (this.active() || !this.queue.length) return false;
    this.player = this.queue.shift();
    return this.restart();
  }

  board(mode = this.category()) { return this.runs.filter(r => r.mode === mode).sort((a,b) => b.loss - a.loss || b.streak - a.streak); }
  result() { return this.runs.find(r => r.id === this.runId) ?? null; }
  rank(run = this.result()) { return run ? this.board(run.mode).findIndex(r => r.id === run.id) + 1 : 0; }
  summary() {
    const segments = this.segments();
    const endCount = segments.filter(s => !s.extraSpins).length;
    return {count:segments.length,endCount,endChance:endCount/segments.length,meanSpins:this.mode === 'hardcore' ? 3 : this.settings.startingSpins * segments.length/endCount};
  }

  saveProfile(name) {
    const title = String(name ?? '').trim().slice(0,40);
    if (!title) throw Error('Napiš název profilu.');
    const existing = this.profiles.find(p => p.name === title);
    const profile = {id:existing?.id ?? uid(),name:title,settings:copy(this.settings)};
    this.profiles = [...this.profiles.filter(p => p.id !== profile.id),profile].slice(-30);
    this.persist();
    return profile;
  }

  exportData() { return {version:1,runs:copy(this.runs),profiles:copy(this.profiles)}; }
  validateBackup(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.runs)
      || !Array.isArray(data.profiles) || data.profiles.length > 30) throw Error('Tohle není platná záloha Kola neštěstí.');
    const runs = data.runs.map(validateRun);
    const profiles = data.profiles.map(p => {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.settings
        || !Array.isArray(p.settings.segments) || p.settings.segments.length < 6 || p.settings.segments.length > 24) throw Error('Neplatný profil kola.');
      return {id:p.id.slice(0,100),name:p.name.slice(0,40),settings:normalizeSettings(p.settings)};
    });
    return {runs,profiles};
  }
  importData(data) {
    const parsed = this.validateBackup(data);
    const runs = new Map(this.runs.map(r => [r.id,r]));
    for (const run of parsed.runs) if (!runs.has(run.id)) runs.set(run.id,run);
    this.runs = [...runs.values()];
    this.profiles = [...new Map([...this.profiles,...parsed.profiles].map(p => [p.id,p])).values()].slice(-30);
    this.persist();
  }

  persist() {
    if (this.saveBlocked) return false;
    try {
      this.storage?.setItem(KEY, JSON.stringify({...this.exportData(),player:this.player,queue:this.queue,current:{
        id:this.runId,startedAt:this.startedAt,mode:this.mode,settings:this.settings,history:this.state.history,
      }}));
      this.storageAvailable = !!this.storage;
    } catch { this.storageAvailable = false; }
    return this.storageAvailable;
  }
}
