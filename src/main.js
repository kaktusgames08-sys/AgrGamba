import './style.css';
import './polish.css';
import './v3.css';
import './v4.css';

import { pickSegmentIndex } from './core/WheelEngine.js';
import { GameState } from './core/GameState.js';
import { SettingsManager } from './core/SettingsManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { LedRing } from './ui/LedRing.js';
import { ParallaxController } from './ui/ParallaxController.js';
import { WheelRenderer } from './ui/WheelRenderer.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { UI } from './ui/UI.js';

const settingsManager = new SettingsManager();
let settings = settingsManager.get();

const state = new GameState(settings.startingSpins);
const audio = new AudioManager();
const ui = new UI();
const ledRing = new LedRing(document.querySelector('#ledRing'));
const parallax = new ParallaxController(document.querySelector('#machineStage'));

const particles = new ParticleSystem(
  document.querySelector('#particleLayer'),
  document.querySelector('#flash'),
);

function phaseToLedMode(phase) {
  if (phase === 'spinning') return 'spinning';
  if (phase === 'anticipation-1' || phase === 'anticipation-2') return 'anticipating';
  if (phase === 'settling' || phase === 'freeze') return 'settling';
  if (phase === 'landed') return 'winner';
  return 'idle';
}

const wheel = new WheelRenderer({
  mount: document.querySelector('#wheelMount'),
  pointer: document.querySelector('#pointer'),
  shell: document.querySelector('#wheelShell'),
  audio,
  segments: settings.segments,
  spinDurationMs: settings.spinDurationMs,
  onProgress: ({ timeProgress, rotation }) => {
    ledRing.setProgress(timeProgress, rotation);
  },
  onPhaseChange: (phase) => {
    ui.setSpinPhase(phase);
    ledRing.setMode(phaseToLedMode(phase));
  },
});

let busy = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyReward(record, isEnding = false) {
  if (isEnding) return 'final';
  if (record.type === 'multiplier') {
    return record.multiplier >= 3 ? 'multiplier3' : 'multiplier2';
  }
  if (record.value >= 60) return 'big';
  if (record.value >= 30) return 'medium';
  return 'small';
}

function impactStrength(tier) {
  if (tier === 'multiplier3' || tier === 'final') return 'heavy';
  if (tier === 'big' || tier === 'multiplier2') return 'normal';
  return 'soft';
}

function freezeDuration(tier) {
  if (tier === 'multiplier3' || tier === 'final') return 88;
  if (tier === 'big' || tier === 'multiplier2') return 72;
  if (tier === 'medium') return 60;
  return 48;
}

function applyPresentationSettings(nextSettings) {
  audio.setMasterVolume(nextSettings.masterVolume);
  particles.setEffectLevel(nextSettings.effects);
  ui.applyPresentationSettings(nextSettings);

  parallax.setEnabled(
    nextSettings.ambientMotion
      && nextSettings.presentationPreset !== 'clean',
  );
}

function updateControls() {
  ui.setBusy(busy || !state.canSpin());
}

function applyGameSettings(nextSettings) {
  settings = nextSettings;
  applyPresentationSettings(settings);

  state.setStartingSpins(settings.startingSpins);
  state.reset();

  wheel.setSegments(settings.segments);
  wheel.setSpinDuration(settings.spinDurationMs);
  ledRing.setMode('idle');

  ui.hideFinal();
  ui.hideResult();
  ui.setGameOverVisual(false);
  ui.resetAnimationMemory(state);
  ui.renderState(state);
  ui.setStatus('NASTAVENÍ ULOŽENO', 'success');
  updateControls();

  setTimeout(() => {
    if (!busy && !state.isEnded()) {
      ui.setStatus('PŘIPRAVENO', 'ready');
    }
  }, 950);
}

const settingsPanel = new SettingsPanel({
  manager: settingsManager,
  onApply: applyGameSettings,
  canOpen: () => !busy,
});

async function revealLanding(index, tier) {
  ui.microFreeze(true);
  await wait(freezeDuration(tier));
  ui.microFreeze(false);

  wheel.revealWinner(index);
  ledRing.flashWinner();

  const strength = impactStrength(tier);
  audio.impact(strength);
  parallax.punch(strength);
  ui.cameraPunchClass(strength);
}

async function playReward(record, tier) {
  const isEnding = tier === 'final';
  ui.setCenterMode('result', { record, isEnding });
  ui.showResult(record, tier);

  if (record.type === 'multiplier') {
    audio.multiplier(record.multiplier);

    particles.burst({
      count: tier === 'multiplier3' ? 82 : 58,
      intense: true,
      variant: 'reward',
    });

    particles.screenFlash(
      tier === 'multiplier3' ? 'strong' : 'normal',
      'reward',
    );

    ui.shake(tier === 'multiplier3' ? 'normal' : 'soft');
  } else {
    audio.money(record.value, tier);

    particles.burst({
      count: tier === 'big'
        ? 58
        : tier === 'medium'
          ? 38
          : 24,
      intense: tier === 'big',
      variant: 'reward',
    });

    if (tier === 'big') {
      particles.screenFlash('strong', 'reward');
      ui.shake('soft');
    } else if (tier === 'medium') {
      particles.screenFlash('normal', 'reward');
    }
  }

  await wait(145);
  ui.flyReward(record);

  await wait(175);
  ui.renderState(state, { animateTotalFrom: record.before });

  if (record.extraSpins) {
    ui.setStatus('+SPIN · JEDEME DÁL', 'success');
    setTimeout(() => audio.extraSpin(), 110);
  } else if (state.isEnded()) {
    ui.setStatus('KONEC · BEZ +SPIN', 'danger');
  } else {
    ui.setStatus('BEZ +SPIN · ' + state.spins + ' ZBÝVÁ', 'ready');
  }
}

async function spin() {
  if (busy || !state.canSpin() || settingsPanel.isOpen()) return;

  audio.ensure();
  busy = true;

  state.beginSpin();
  ui.renderState(state);
  ui.setStatus('ROZTÁČÍM…', 'spinning');
  ui.setSpinPhase('spinning');
  updateControls();
  ui.hideResult();
  ui.setGameOverVisual(false);

  const index = pickSegmentIndex(settings.segments);
  const segment = settings.segments[index];

  await wheel.spinTo(index);

  const previewRecord = {
    type: segment.type,
    value: segment.value ?? null,
    multiplier: segment.multiplier ?? null,
    extraSpins: segment.extraSpins ?? 0,
  };

  const willEnd = state.spins + (segment.extraSpins ?? 0) <= 0;
  const previewTier = classifyReward(previewRecord, willEnd);
  await revealLanding(index, previewTier);

  const record = state.resolve(segment);
  const tier = classifyReward(record, state.isEnded());

  await playReward(record, tier);

  await wait(state.isEnded() ? 720 : 760);

  if (state.isEnded()) {
    ui.hideResult();
    ui.setGameOverVisual(true);
    ledRing.setMode('idle');

    await wait(130);

    audio.lossFinale();
    particles.screenFlash('strong', 'loss');
    particles.burst({
      count: 58,
      intense: true,
      variant: 'loss',
    });

    ui.shake('normal');
    parallax.punch('normal');

    await ui.showFinal(state.total);
  } else {
    ui.hideResult();
    await wait(170);

    ui.setCenterMode('idle', { spins: state.spins });
    ledRing.setMode('idle');
    ui.setSpinPhase('idle');
    ui.setStatus('PŘIPRAVENO', 'ready');
  }

  busy = false;
  updateControls();
}

function restart() {
  if (busy) return;

  state.reset();
  wheel.clearWinner();
  ledRing.setMode('idle');

  ui.hideFinal();
  ui.hideResult();
  ui.setGameOverVisual(false);
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
ui.setCenterMode('idle', { spins: state.spins });
ui.setStatus('PŘIPRAVENO', 'ready');
ledRing.setMode('idle');
updateControls();
