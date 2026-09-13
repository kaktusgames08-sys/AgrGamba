import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';
import { PRESETS } from '../core/SettingsManager.js';
import { agraelusWinChanceFromLoseChance, chatterWinChanceFromAgraelusWinChance } from '../core/Odds.js';

const PRESET_LABELS = {
  fair: 'FÉROVKA',
  'agra-advantage': 'VÝHODA AGRAELUS',
  'chat-advantage': 'VÝHODA CHATTER',
  'agra-propaganda': 'AGRA PROPAGANDA',
  'chat-revolution': 'CHAT REVOLUCE',
  'pure-gamba': 'PURE GAMBA',
};

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

    resultDisplay: $('resultDisplay'),
    resultPayer: $('resultPayer'),
    resultL: $('resultL'),
    resultWinner: $('resultWinner'),
    resultFlavor: $('resultFlavor'),
    continueButton: $('continueButton'),

    particleLayer: $('particleLayer'),
    chatLayer: $('chatLayer'),
    flashLayer: $('flashLayer'),
    sevenTvLayer: $('sevenTvLayer'),
    sevenTvStatus: $('sevenTvStatus'),

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
  dom.spinCounter.textContent = `SPINY: ${statsSnapshot.spins}`;
}

export function updateStreak(dom, statsSnapshot) {
  const { currentStreakWinner: w, currentStreakCount: c } = statsSnapshot;
  dom.streakAgra.classList.add('hidden');
  dom.streakChat.classList.add('hidden');
  if (!w || c < 2) return;
  const target = w === AGRAELUS ? dom.streakAgra : dom.streakChat;
  let label = `x${c}`;
  if (c >= 10) label += ' — CO TO JE';
  else if (c >= 5) label += ' — HOŘÍ';
  else if (c >= 3) label += ' — ROZJÍŽDÍ SE';
  target.querySelector('span').textContent = label;
  target.classList.remove('hidden');
}

export function updateHistory(dom, statsSnapshot) {
  dom.historyRow.innerHTML = '';
  statsSnapshot.history.forEach(({ loser, winner }) => {
    const tile = document.createElement('div');
    tile.className = 'history-tile ' + (winner === AGRAELUS ? 'win-agra' : 'win-chat');
    tile.textContent = winner === AGRAELUS ? 'A' : 'C';
    tile.title = `${loser} platí — ${winner} vyhrál`;
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
    btn.textContent = PRESET_LABELS[preset.id] ?? preset.label;
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
  const agraWin = agraelusWinChanceFromLoseChance(settings.get('agraelusLoseChance'));
  const chatWin = chatterWinChanceFromAgraelusWinChance(agraWin);
  dom.agraOddsSlider.value = agraWin;
  dom.agraOddsLabel.textContent = agraWin;
  dom.chatOddsLabel.textContent = chatWin;
  dom.agraOddsInput.value = agraWin;
  dom.chatOddsInput.value = chatWin;

  if (settings.get('showOdds')) {
    dom.oddsTranscript.classList.remove('hidden');
    dom.oddsTranscript.innerHTML =
      `Agraelus: <b>${agraWin}%</b> šance na výhru · Chatter: <b>${chatWin}%</b> šance na výhru`;
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
    Celkem spinů: <b>${s.spins}</b><br/>
    Výhry Agraelus: <b>${s.wins[AGRAELUS]}</b> &nbsp; Výhry Chatter: <b>${s.wins[CHATTER]}</b><br/>
    Prohry Agraelus: <b>${s.losses[AGRAELUS]}</b> &nbsp; Prohry Chatter: <b>${s.losses[CHATTER]}</b><br/>
    Nejlepší série Agraelus: <b>${s.bestStreak[AGRAELUS]}</b><br/>
    Nejlepší série Chatter: <b>${s.bestStreak[CHATTER]}</b>
  `;
}
