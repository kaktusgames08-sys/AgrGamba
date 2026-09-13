import { GameState } from './core/GameState.js';
import { SettingsManager, PRESETS } from './core/SettingsManager.js';
import { StatsManager, AGRAELUS, CHATTER } from './core/StatsManager.js';
import { spin } from './core/SpinEngine.js';
import { AudioManager } from './audio/AudioManager.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { ChatSpam } from './ui/ChatSpam.js';
import { AnimationController } from './ui/AnimationController.js';
import * as UI from './ui/UI.js';

const dom = UI.queryDom();
const settings = new SettingsManager();
const stats = new StatsManager();
const gameState = new GameState();
const audio = new AudioManager(settings);
const particles = new ParticleSystem(dom.particleLayer, settings);
const chatSpam = new ChatSpam(dom.chatLayer);
const anim = new AnimationController({
  dom,
  audio,
  particles,
  chatSpam,
  settings,
  onShake: (cls) => shakeMachine(cls),
  onFlash: (level) => flash(level),
});

// ---------- shake / flash ----------
function shakeMachine(cls) {
  const intensity = settings.get('shakeIntensity') / 100;
  document.documentElement.style.setProperty('--shake', String(intensity));
  dom.machine.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  // reflow to restart animation
  void dom.machine.offsetWidth;
  dom.machine.classList.add(cls);
  setTimeout(() => dom.machine.classList.remove(cls), 700);
}

function flash(level) {
  const setting = settings.get('flash');
  if (setting === 'off') return;
  if (setting === 'reduced' && level === 'full') level = 'reduced';
  const el = document.createElement('div');
  el.className = 'flash-pulse go' + (level === 'reduced' ? ' reduced' : '');
  dom.flashLayer.appendChild(el);
  setTimeout(() => el.remove(), 350);
}

// ---------- UI refresh ----------
function refreshStatsUI() {
  const snap = stats.snapshot();
  UI.updateScore(dom, snap);
  UI.updateStreak(dom, snap);
  UI.updateHistory(dom, snap);
  UI.renderStatsBlock(dom, snap);
  checkEasterEggs(snap);
}

function refreshSettingsUI() {
  UI.syncSettingsForm(dom, settings);
  UI.updatePureGambaBadge(dom, settings);
  applyStreamerMode();
  applyMuteIcon();
}

function applyStreamerMode() {
  dom.game.classList.toggle('streamer', settings.get('streamerMode'));
}

function applyMuteIcon() {
  dom.btnMute.textContent = settings.get('muted') ? '🔇' : '🔊';
}

// ---------- easter eggs ----------
function checkEasterEggs(snap) {
  let msg = null;
  if (snap.currentStreakWinner === AGRAELUS && snap.currentStreakCount >= 10) msg = 'TOTALLY FAIR';
  if (snap.currentStreakWinner === CHATTER && snap.currentStreakCount >= 10) msg = 'MODS CHECK THE MACHINE';
  const agraLose = settings.get('agraelusLoseChance');
  if (agraLose === 100 && snap.spins >= 3) msg = 'surely random';
  if (agraLose === 0 && snap.spins >= 3) msg = 'chat never had a chance';
  if (msg) dom.marqueeText.textContent = msg;
}

// ---------- core spin flow ----------
async function doSpin() {
  if (!gameState.canSpin()) return;
  gameState.beginSpin();
  dom.marqueeText.textContent = 'SPINNING...';

  const result = spin(settings.get('agraelusLoseChance'));
  const durationMs = settings.spinDurationMs();

  await anim.playSpin(result, durationMs);

  gameState.endSpin(result);
  const snap = stats.record(result);
  refreshStatsUI();
  syncPureGambaAfterCheck();
  void snap;
}

function syncPureGambaAfterCheck() {
  UI.updatePureGambaBadge(dom, settings);
}

// ---------- lever ----------
let leverDragging = false;
let leverStartY = 0;

function pullLever() {
  if (!gameState.canSpin()) return;
  audio.leverClick();
  dom.lever.classList.add('pulled');
  dom.machine.classList.add('squash');
  setTimeout(() => {
    dom.lever.classList.remove('pulled');
    audio.leverClack();
    dom.machine.classList.remove('squash');
    doSpin();
  }, 180);
}

dom.lever.addEventListener('click', pullLever);
dom.lever.addEventListener('mousedown', (e) => {
  leverDragging = true;
  leverStartY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
  if (!leverDragging) return;
  const dy = Math.max(0, e.clientY - leverStartY);
  if (dy > 40) {
    leverDragging = false;
    pullLever();
  }
});
window.addEventListener('mouseup', () => { leverDragging = false; });

// ---------- splash ----------
dom.pullStart.addEventListener('click', enterGame);
function enterGame() {
  dom.splash.classList.add('hidden');
  dom.game.classList.remove('hidden');
  refreshStatsUI();
  refreshSettingsUI();
}

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!dom.splash.classList.contains('hidden')) {
      enterGame();
    } else if (dom.settingsPanel.classList.contains('hidden')) {
      pullLever();
    }
  } else if (e.key === 'r' || e.key === 'R') {
    if (dom.settingsPanel.classList.contains('hidden')) pullLever();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMute();
  } else if (e.key === 'Escape') {
    toggleSettings();
  }
});

// ---------- top bar buttons ----------
dom.btnMute.addEventListener('click', toggleMute);
dom.btnFullscreen.addEventListener('click', toggleFullscreen);
dom.btnSettings.addEventListener('click', toggleSettings);
dom.btnCloseSettings.addEventListener('click', toggleSettings);

function toggleMute() {
  settings.set('muted', !settings.get('muted'));
  applyMuteIcon();
  dom.muteToggle.checked = settings.get('muted');
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function toggleSettings() {
  dom.settingsPanel.classList.toggle('hidden');
}

// ---------- settings bindings ----------
function setOdds(agraLoseChance) {
  const clamped = Math.min(100, Math.max(0, Math.round(agraLoseChance)));
  settings.set('agraelusLoseChance', clamped);
  UI.syncOddsUI(dom, settings);
  UI.syncPresetActive(dom, settings);
  UI.updatePureGambaBadge(dom, settings);
}

dom.agraOddsSlider.addEventListener('input', (e) => setOdds(Number(e.target.value)));
dom.agraOddsInput.addEventListener('change', (e) => setOdds(Number(e.target.value)));
dom.chatOddsInput.addEventListener('change', (e) => setOdds(100 - Number(e.target.value)));

UI.renderPresets(dom, settings, (preset) => setOdds(preset.agraelusLoseChance));

dom.turboToggle.addEventListener('change', (e) => settings.set('turbo', e.target.checked));
dom.degenToggle.addEventListener('change', (e) => settings.set('degenerate', e.target.checked));
dom.volMaster.addEventListener('input', (e) => settings.set('masterVolume', Number(e.target.value)));
dom.volMusic.addEventListener('input', (e) => settings.set('musicVolume', Number(e.target.value)));
dom.volSfx.addEventListener('input', (e) => settings.set('sfxVolume', Number(e.target.value)));
dom.muteToggle.addEventListener('change', (e) => { settings.set('muted', e.target.checked); applyMuteIcon(); });
dom.showOddsToggle.addEventListener('change', (e) => { settings.set('showOdds', e.target.checked); UI.syncOddsUI(dom, settings); });
dom.streamerToggle.addEventListener('change', (e) => { settings.set('streamerMode', e.target.checked); applyStreamerMode(); });
dom.flashSelect.addEventListener('change', (e) => settings.set('flash', e.target.value));
dom.particleSelect.addEventListener('change', (e) => settings.set('particles', e.target.value));
dom.shakeIntensity.addEventListener('input', (e) => settings.set('shakeIntensity', Number(e.target.value)));

dom.btnResetStats.addEventListener('click', () => {
  stats.reset();
  refreshStatsUI();
});

// hover/click UI feedback sounds
[dom.btnMute, dom.btnFullscreen, dom.btnSettings, dom.btnCloseSettings, dom.btnResetStats, ...document.querySelectorAll('.preset-btn')]
  .forEach((el) => {
    el?.addEventListener('mouseenter', () => audio.uiHover());
    el?.addEventListener('click', () => audio.uiClick());
  });

// ---------- boot ----------
refreshSettingsUI();
if (settings.get('streamerMode')) applyStreamerMode();
