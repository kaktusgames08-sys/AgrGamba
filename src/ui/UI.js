import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';
import { PRESETS } from '../core/SettingsManager.js';

export function queryDom() {
  const $ = (id) => document.getElementById(id);
  return {
    splash: $('splash'),
    pullStart: $('pullStart'),
    game: $('game'),

    btnMute: $('btnMute'),
    btnFullscreen: $('btnFullscreen'),
    btnSettings: $('btnSettings'),

    scoreAgra: $('scoreAgra'),
    scoreChat: $('scoreChat'),
    spinCounter: $('spinCounter'),
    pureGambaBadge: $('pureGambaBadge'),

    machine: $('machine'),
    lights: $('lights'),
    rareLabel: $('rareLabel'),
    reelTrack: $('reelTrack'),
    nearMissText: $('nearMissText'),
    marqueeText: $('marqueeText'),
    ribbonTrack: $('ribbonTrack'),

    lever: $('lever'),

    streakAgra: $('streakAgra'),
    streakChat: $('streakChat'),
    historyRow: $('historyRow'),

    revealOverlay: $('revealOverlay'),
    revealLoserName: $('revealLoserName'),
    revealL: $('revealL'),
    revealLoseText: $('revealLoseText'),
    revealWinner: $('revealWinner'),
    revealRandomText: $('revealRandomText'),
    continueButton: $('continueButton'),

    particleLayer: $('particleLayer'),
    chatLayer: $('chatLayer'),
    flashLayer: $('flashLayer'),

    settingsPanel: $('settingsPanel'),
    btnCloseSettings: $('btnCloseSettings'),
    agraOddsSlider: $('agraOddsSlider'),
    agraOddsLabel: $('agraOddsLabel'),
    chatOddsLabel: $('chatOddsLabel'),
    agraOddsInput: $('agraOddsInput'),
    chatOddsInput: $('chatOddsInput'),
    oddsTranscript: $('oddsTranscript'),
    presetGrid: $('presetGrid'),
    turboToggle: $('turboToggle'),
    degenToggle: $('degenToggle'),
    volMaster: $('volMaster'),
    volMusic: $('volMusic'),
    volSfx: $('volSfx'),
    muteToggle: $('muteToggle'),
    showOddsToggle: $('showOddsToggle'),
    streamerToggle: $('streamerToggle'),
    flashSelect: $('flashSelect'),
    particleSelect: $('particleSelect'),
    shakeIntensity: $('shakeIntensity'),
    statsBlock: $('statsBlock'),
    btnResetStats: $('btnResetStats'),
  };
}

export function updateScore(dom, statsSnapshot) {
  dom.scoreAgra.textContent = statsSnapshot.wins[AGRAELUS];
  dom.scoreChat.textContent = statsSnapshot.wins[CHATTER];
  dom.spinCounter.textContent = `SPINS: ${statsSnapshot.spins}`;
}

export function updateStreak(dom, statsSnapshot) {
  const { currentStreakWinner: w, currentStreakCount: c } = statsSnapshot;
  dom.streakAgra.classList.add('hidden');
  dom.streakChat.classList.add('hidden');
  if (!w || c < 2) return;
  const target = w === AGRAELUS ? dom.streakAgra : dom.streakChat;
  let label = `x${c}`;
  if (c >= 10) label += ' — WHAT THE FUCK';
  else if (c >= 5) label += ' — ON FIRE';
  else if (c >= 3) label += ' — HEATING UP';
  target.querySelector('span').textContent = label;
  target.classList.remove('hidden');
}

export function updateHistory(dom, statsSnapshot) {
  dom.historyRow.innerHTML = '';
  statsSnapshot.history.forEach(({ loser, winner }) => {
    const tile = document.createElement('div');
    tile.className = 'history-tile ' + (winner === AGRAELUS ? 'win-agra' : 'win-chat');
    tile.textContent = winner === AGRAELUS ? 'A' : 'C';
    tile.title = `${loser} took the L — ${winner} won`;
    dom.historyRow.appendChild(tile);
  });
}

export function updatePureGambaBadge(dom, settings) {
  dom.pureGambaBadge.classList.toggle('hidden', !settings.isPureGamba());
}

export function renderPresets(dom, settings, onPick) {
  dom.presetGrid.innerHTML = '';
  PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => onPick(preset));
    dom.presetGrid.appendChild(btn);
  });
  syncPresetActive(dom, settings);
}

export function syncPresetActive(dom, settings) {
  const val = settings.get('agraelusLoseChance');
  [...dom.presetGrid.children].forEach((btn, i) => {
    btn.classList.toggle('active', PRESETS[i].agraelusLoseChance === val);
  });
}

export function syncOddsUI(dom, settings) {
  const agra = settings.get('agraelusLoseChance');
  const chat = settings.chatterLoseChance;
  dom.agraOddsSlider.value = agra;
  dom.agraOddsLabel.textContent = agra;
  dom.chatOddsLabel.textContent = chat;
  dom.agraOddsInput.value = agra;
  dom.chatOddsInput.value = chat;

  if (settings.get('showOdds')) {
    dom.oddsTranscript.classList.remove('hidden');
    dom.oddsTranscript.innerHTML =
      `Agraelus chance to lose: ${agra}% · Chatter chance to lose: ${chat}%<br/>` +
      `Agraelus win chance: ${chat}% · Chatter win chance: ${agra}%`;
  } else {
    dom.oddsTranscript.classList.add('hidden');
  }
}

export function syncSettingsForm(dom, settings) {
  dom.turboToggle.checked = settings.get('turbo');
  dom.degenToggle.checked = settings.get('degenerate');
  dom.volMaster.value = settings.get('masterVolume');
  dom.volMusic.value = settings.get('musicVolume');
  dom.volSfx.value = settings.get('sfxVolume');
  dom.muteToggle.checked = settings.get('muted');
  dom.showOddsToggle.checked = settings.get('showOdds');
  dom.streamerToggle.checked = settings.get('streamerMode');
  dom.flashSelect.value = settings.get('flash');
  dom.particleSelect.value = settings.get('particles');
  dom.shakeIntensity.value = settings.get('shakeIntensity');
  syncOddsUI(dom, settings);
  syncPresetActive(dom, settings);
}

export function renderStatsBlock(dom, statsSnapshot) {
  const s = statsSnapshot;
  dom.statsBlock.innerHTML = `
    Total spins: <b>${s.spins}</b><br/>
    Agraelus wins: <b>${s.wins[AGRAELUS]}</b> &nbsp; Chatter wins: <b>${s.wins[CHATTER]}</b><br/>
    Agraelus L's: <b>${s.losses[AGRAELUS]}</b> &nbsp; Chatter L's: <b>${s.losses[CHATTER]}</b><br/>
    Best Agraelus streak: <b>${s.bestStreak[AGRAELUS]}</b><br/>
    Best Chatter streak: <b>${s.bestStreak[CHATTER]}</b>
  `;
}
