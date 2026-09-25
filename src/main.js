import './style.css';
import './polish.css';
import './v3.css';

import { pickSegmentIndex } from './core/WheelEngine.js';
import { GameState } from './core/GameState.js';
import { SettingsManager } from './core/SettingsManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { WheelRenderer } from './ui/WheelRenderer.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { UI } from './ui/UI.js';

const settingsManager = new SettingsManager();
let settings = settingsManager.get();

const state = new GameState(settings.startingSpins);
const audio = new AudioManager();
const ui = new UI();
const particles = new ParticleSystem(
  document.querySelector('#particleLayer'),
  document.querySelector('#flash'),
);

const wheel = new WheelRenderer({
  mount: document.querySelector('#wheelMount'),
  pointer: document.querySelector('#pointer'),
  shell: document.querySelector('#wheelShell'),
  audio,
  segments: settings.segments,
  spinDurationMs: settings.spinDurationMs,
});

let busy = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyPresentationSettings(nextSettings) {
  audio.setMasterVolume(nextSettings.masterVolume);
  particles.setEffectLevel(nextSettings.effects);
  ui.applyPresentationSettings(nextSettings);
}

function updateControls() {
  ui.setBusy(busy || !state.canSpin());
}

function applyGameSettings(nextSettings) {
  settings = nextSettings;

  audio.setMasterVolume(settings.masterVolume);
  particles.setEffectLevel(settings.effects);
  ui.applyPresentationSettings(settings);

  state.setStartingSpins(settings.startingSpins);
  state.reset();

  wheel.setSegments(settings.segments);
  wheel.setSpinDuration(settings.spinDurationMs);

  ui.hideFinal();
  ui.hideResult();
  ui.resetAnimationMemory(state);
  ui.renderState(state);
  ui.setStatus('NASTAVENÍ ULOŽENO', 'success');
  updateControls();

  setTimeout(() => {
    if (!busy && !state.isEnded()) ui.setStatus('PŘIPRAVENO', 'ready');
  }, 950);
}

const settingsPanel = new SettingsPanel({
  manager: settingsManager,
  onApply: applyGameSettings,
  canOpen: () => !busy,
});

async function spin() {
  if (busy || !state.canSpin() || settingsPanel.isOpen()) return;

  audio.ensure();
  busy = true;

  state.beginSpin();
  ui.renderState(state);
  ui.setStatus('ROZTÁČÍM…', 'spinning');
  updateControls();
  ui.hideResult();

  const index = pickSegmentIndex(settings.segments);
  const segment = settings.segments[index];

  await wheel.spinTo(index);

  const record = state.resolve(segment);
  ui.renderState(state, { animateTotalFrom: record.before });
  ui.showResult(record);
  ui.flyReward(record);

  if (record.type === 'multiplier') {
    audio.multiplier(record.multiplier);

    particles.burst({
      count: record.multiplier >= 3 ? 70 : 52,
      intense: true,
      variant: 'reward',
    });

    particles.screenFlash(record.multiplier >= 3 ? 'strong' : 'normal', 'reward');
    ui.shake(record.multiplier >= 3 ? 'normal' : 'soft');
  } else {
    audio.money(record.value);

    particles.burst({
      count: Math.min(48, 18 + Math.round(record.value / 4)),
      intense: record.value >= 60,
      variant: 'reward',
    });

    if (record.value >= 60) {
      particles.screenFlash(record.value >= 75 ? 'strong' : 'normal', 'reward');
      ui.shake('soft');
    }
  }

  if (record.extraSpins) {
    ui.setStatus('+SPIN · JEDEME DÁL', 'success');
    setTimeout(() => audio.extraSpin(), 200);
  } else {
    ui.setStatus('KONEC · BEZ +SPIN', 'danger');
  }

  await wait(state.isEnded() ? 900 : 980);

  if (state.isEnded()) {
    ui.hideResult();
    await wait(130);

    audio.lossFinale();
    particles.screenFlash('strong', 'loss');
    particles.burst({ count: 52, intense: true, variant: 'loss' });
    ui.shake('normal');

    await ui.showFinal(state.total);
  } else {
    ui.hideResult();
    await wait(140);
    ui.setStatus('PŘIPRAVENO', 'ready');
  }

  busy = false;
  updateControls();
}

function restart() {
  if (busy) return;

  state.reset();
  wheel.clearWinner();
  ui.hideFinal();
  ui.hideResult();
  ui.resetAnimationMemory(state);
  ui.renderState(state);
  ui.setStatus('PŘIPRAVENO', 'ready');
  updateControls();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Browser/OBS environments can deny fullscreen; gameplay should keep working.
  }
}

ui.spinButton.addEventListener('click', spin);
ui.restartButton.addEventListener('click', restart);
ui.muteButton.addEventListener('click', () => ui.setMuted(audio.toggle()));
ui.fullscreenButton.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  const key = event.key.toLowerCase();

  if (event.code === 'Space' && !settingsPanel.isOpen()) {
    event.preventDefault();
    spin();
  } else if (key === 'r' && state.isEnded() && !settingsPanel.isOpen()) {
    restart();
  } else if (key === 'm' && !settingsPanel.isOpen()) {
    ui.setMuted(audio.toggle());
  } else if (key === 'f' && !settingsPanel.isOpen()) {
    toggleFullscreen();
  } else if (key === 's' && !busy && !settingsPanel.isOpen()) {
    settingsPanel.open();
  }
});

applyPresentationSettings(settings);
ui.setMuted(audio.muted);
ui.renderState(state);
ui.setStatus('PŘIPRAVENO', 'ready');
updateControls();
