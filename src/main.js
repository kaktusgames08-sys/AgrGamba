import './style.css';
import './polish.css';
import './v3.css';
import './v4.css';
import './piggy.css';

import { GameState } from './core/GameState.js';
import { SettingsManager } from './core/SettingsManager.js';
import {
  HARDCORE_STARTING_SPINS,
  HARDCORE_MAX_PAYOUT,
  HARDCORE_MONEY_SEGMENTS,
  HARDCORE_MULTIPLIER_SEGMENTS,
} from './core/HardcoreConfig.js';
import { AudioManager } from './audio/AudioManager.js';
import { LedRing } from './ui/LedRing.js';
import { ParallaxController } from './ui/ParallaxController.js';
import { WheelRenderer } from './ui/WheelRenderer.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { UI } from './ui/UI.js';
import { PiggyBank } from './ui/PiggyBank.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { ViewportScaler } from './ui/ViewportScaler.js';

const settingsManager = new SettingsManager();
let settings = settingsManager.get();
let gameMode = 'normal';
let activeSegments = settings.segments;

const state = new GameState(settings.startingSpins);
const audio = new AudioManager();
const ui = new UI();
const ledRing = new LedRing(document.querySelector('#ledRing'));
const parallax = new ParallaxController(document.querySelector('#machineStage'));
const piggy = new PiggyBank();
const leaderboard = new Leaderboard();
const viewportScaler = new ViewportScaler();

const app = document.querySelector('#app');
const hardcoreButton = document.querySelector('#hardcoreButton');
const hardcoreRule = document.querySelector('#hardcoreRule');
const hardcoreButtonTitle = hardcoreButton?.querySelector('strong');
const hardcoreButtonSub = hardcoreButton?.querySelector('small');

const amountEmote = document.querySelector('#amountEmote');
amountEmote?.addEventListener('error', () => {
  amountEmote.closest('.hud-card__emote')?.classList.add('is-fallback');
}, { once: true });

const particles = new ParticleSystem(
  document.querySelector('#particleLayer'),
  document.querySelector('#flash'),
);

function isHardcore() {
  return gameMode === 'hardcore';
}

function phaseToLedMode(phase) {
  if (phase === 'spinning') return 'spinning';
  if (phase?.startsWith('anticipation-')) return 'anticipating';
  if (phase === 'settling' || phase === 'freeze') return 'settling';
  if (phase === 'landed') return 'winner';
  return 'idle';
}

const wheel = new WheelRenderer({
  mount: document.querySelector('#wheelMount'),
  pointer: document.querySelector('#pointer'),
  shell: document.querySelector('#wheelShell'),
  audio,
  segments: activeSegments,
  spinDurationMs: settings.spinDurationMs,
  onProgress: ({ timeProgress, rotation }) => {
    ledRing.setProgress(timeProgress, rotation);
  },
  onPhaseChange: (phase) => {
    ui.setSpinPhase(phase);
    ledRing.setMode(phaseToLedMode(phase));
    ui.microFreeze(phase === 'freeze');
  },
});

void leaderboard;
void viewportScaler;

let busy = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyReward(record, isEnding = false) {
  if (isEnding) return 'final';
  if (record.type === 'multiplier') return 'multiplier2';
  if (record.value >= 60) return 'big';
  if (record.value >= 40) return 'medium';
  return 'small';
}

function impactStrength(tier) {
  if (tier === 'final') return 'heavy';
  if (tier === 'big' || tier === 'multiplier2') return 'normal';
  return 'soft';
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

function syncModeUi() {
  const hardcore = isHardcore();

  app.dataset.gameMode = hardcore ? 'hardcore' : 'normal';
  hardcoreButton?.classList.toggle('is-active', hardcore);
  hardcoreButton?.setAttribute('aria-pressed', hardcore ? 'true' : 'false');

  if (hardcoreRule) hardcoreRule.hidden = !hardcore;

  if (hardcoreButtonTitle) {
    hardcoreButtonTitle.textContent = hardcore
      ? 'ZPĚT NA NORMAL'
      : 'HARDCORE TOČKA';
  }

  if (hardcoreButtonSub) {
    hardcoreButtonSub.textContent = hardcore
      ? 'HARDCORE AKTIVNÍ · RESET NA KLASIKU'
      : '3 SPINY · 150 Kč+ · POSLEDNÍ = NÁSOBIČ';
  }
}

function updateControls() {
  ui.setBusy(busy || !state.canSpin());
  if (hardcoreButton) hardcoreButton.disabled = busy;
}

function setActiveSegments(segments) {
  activeSegments = segments;
  wheel.setSegments(segments);
}

async function swapWheelSegments(segments) {
  app.classList.add('is-wheel-switching');
  await wait(150);
  setActiveSegments(segments);
  await wait(80);
  app.classList.remove('is-wheel-switching');
}

function resetCurrentMode({ announce = true } = {}) {
  const hardcore = isHardcore();

  state.setStartingSpins(
    hardcore ? HARDCORE_STARTING_SPINS : settings.startingSpins,
  );
  state.reset();

  setActiveSegments(
    hardcore ? HARDCORE_MONEY_SEGMENTS : settings.segments,
  );
  wheel.setSpinDuration(settings.spinDurationMs);
  ledRing.setMode('idle');

  ui.hideFinal();
  ui.hideResult();
  ui.setGameOverVisual(false);
  piggy.reset();
  ui.resetAnimationMemory(state);
  ui.renderState(state);
  ui.setCenterMode('idle', { spins: state.spins });

  if (announce) {
    ui.setStatus(
      hardcore
        ? 'HARDCORE · 3 SPINY · BEZ RESPINU'
        : 'PŘIPRAVENO',
      hardcore ? 'hardcore' : 'ready',
    );
  }

  syncModeUi();
  updateControls();
}

function applyGameSettings(nextSettings) {
  settings = nextSettings;
  applyPresentationSettings(settings);
  resetCurrentMode({ announce: false });

  ui.setStatus(
    isHardcore()
      ? 'NASTAVENÍ ULOŽENO · HARDCORE RESET'
      : 'NASTAVENÍ ULOŽENO',
    'success',
  );

  setTimeout(() => {
    if (!busy && !state.isEnded()) {
      ui.setStatus(
        isHardcore()
          ? 'HARDCORE · 3 SPINY · BEZ RESPINU'
          : 'PŘIPRAVENO',
        isHardcore() ? 'hardcore' : 'ready',
      );
    }
  }, 950);
}

const settingsPanel = new SettingsPanel({
  manager: settingsManager,
  onApply: applyGameSettings,
  canOpen: () => !busy,
});

async function revealLanding(index, tier) {
  wheel.revealWinner(index);
  ledRing.flashWinner();

  const strength = impactStrength(tier);
  audio.impact(strength);
  parallax.punch(strength);
  ui.cameraPunchClass(strength);
}

async function playReward(record, tier) {
  const isEnding = tier === 'final';
  let piggyAnimation = Promise.resolve();

  ui.setCenterMode('result', { record, isEnding });
  ui.showResult(record, tier);

  if (record.type === 'multiplier') {
    audio.multiplier(record.multiplier);

    particles.burst({
      count: 58,
      intense: true,
      variant: 'reward',
    });

    particles.screenFlash('normal', 'reward');
    ui.shake('soft');
  } else {
    audio.money(record.value, tier);
    piggyAnimation = piggy.feed(record.value, record.after);

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

  if (record.type === 'multiplier') {
    piggy.pulseMultiplier(record.after);
  }

  await wait(145);
  ui.flyReward(record);

  await wait(175);
  ui.renderState(state, { animateTotalFrom: record.before });
  await piggyAnimation;

  if (record.hardcore) {
    if (state.isEnded()) {
      ui.setStatus('HARDCORE HOTOVO · ' + state.total + ' Kč', 'success');
    } else if (state.spins === 1) {
      ui.setStatus('POSLEDNÍ SPIN · NÁSOBIČE', 'hardcore');
    } else {
      ui.setStatus('HARDCORE · ' + state.spins + ' SPINY ZBÝVAJÍ', 'hardcore');
    }
    return;
  }

  if (record.extraSpins) {
    ui.setStatus('+SPIN · JEDEME DÁL', 'success');
    setTimeout(() => audio.extraSpin(), 110);
  } else if (state.isEnded()) {
    ui.setStatus('KONEC · BEZ +SPIN', 'danger');
  } else {
    ui.setStatus('BEZ +SPIN · ' + state.spins + ' ZBÝVÁ', 'ready');
  }
}

function capHardcoreRecord(record) {
  if (!isHardcore()) return record;

  const capped = Math.min(HARDCORE_MAX_PAYOUT, state.total);

  if (capped !== state.total) {
    state.total = capped;
    record.after = capped;
    if (state.history[0]) state.history[0].after = capped;
  }

  record.hardcore = true;
  record.hardcoreFinal = state.isEnded();
  record.remainingSpins = state.spins;
  return record;
}

async function spin() {
  if (busy || !state.canSpin() || settingsPanel.isOpen()) return;

  audio.ensure();
  busy = true;

  state.beginSpin();
  ui.renderState(state);
  ui.setStatus(
    isHardcore() ? 'HARDCORE · ROZTÁČÍM…' : 'ROZTÁČÍM…',
    'spinning',
  );
  ui.setSpinPhase('spinning');
  updateControls();
  ui.hideResult();
  ui.setGameOverVisual(false);

  const landing = await wheel.spinRandom();
  const index = landing.index;
  const segment = activeSegments[index];

  const previewRecord = {
    type: segment.type,
    value: segment.value ?? null,
    multiplier: segment.multiplier ?? null,
    extraSpins: segment.extraSpins ?? 0,
    hardcore: isHardcore(),
  };

  const willEnd = state.spins + (segment.extraSpins ?? 0) <= 0;
  const previewTier = classifyReward(previewRecord, willEnd);
  await revealLanding(index, previewTier);

  const record = capHardcoreRecord(state.resolve(segment));
  const tier = classifyReward(record, state.isEnded());

  await playReward(record, tier);

  await wait(state.isEnded() ? 540 : 520);

  if (state.isEnded()) {
    ui.hideResult();
    ledRing.setMode('idle');

    await wait(90);

    if (isHardcore()) {
      particles.screenFlash('strong', 'reward');
      particles.burst({
        count: 78,
        intense: true,
        variant: 'reward',
      });
      ui.shake('normal');
      parallax.punch('normal');
      ui.setStatus(
        'HARDCORE FINÁLE · ' + state.total + ' / ' + HARDCORE_MAX_PAYOUT + ' Kč',
        'success',
      );
    } else {
      ui.setGameOverVisual(true);
      audio.lossFinale();
      particles.screenFlash('strong', 'loss');
      particles.burst({
        count: 58,
        intense: true,
        variant: 'loss',
      });
      ui.shake('normal');
      parallax.punch('normal');
    }

    await piggy.explode(state.total);
  } else {
    ui.hideResult();
    await wait(150);

    if (
      isHardcore()
      && state.spins === 1
      && activeSegments !== HARDCORE_MULTIPLIER_SEGMENTS
    ) {
      ui.setStatus('POSLEDNÍ SPIN · PŘEPÍNÁM NA NÁSOBIČE', 'hardcore');
      await swapWheelSegments(HARDCORE_MULTIPLIER_SEGMENTS);
    }

    ui.setCenterMode('idle', { spins: state.spins });
    ledRing.setMode('idle');
    ui.setSpinPhase('idle');

    if (isHardcore()) {
      ui.setStatus(
        state.spins === 1
          ? 'POSLEDNÍ SPIN · NÁSOBIČE · MAX 5000 Kč'
          : 'HARDCORE · ' + state.spins + ' SPINY ZBÝVAJÍ',
        'hardcore',
      );
    } else {
      ui.setStatus('PŘIPRAVENO', 'ready');
    }
  }

  busy = false;
  updateControls();
}

function restart() {
  if (busy) return;
  resetCurrentMode();
}

function toggleHardcoreMode() {
  if (busy || settingsPanel.isOpen()) return;

  gameMode = isHardcore() ? 'normal' : 'hardcore';
  resetCurrentMode();

  if (isHardcore()) {
    particles.screenFlash('normal', 'reward');
    ui.setStatus('HARDCORE · 3 SPINY · 150 Kč+ · MAX 5000 Kč', 'hardcore');
  }
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
hardcoreButton?.addEventListener('click', toggleHardcoreMode);

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
  } else if (key === 'h' && !busy && !settingsPanel.isOpen()) {
    toggleHardcoreMode();
  }
});

applyPresentationSettings(settings);
ui.setMuted(audio.muted);
syncModeUi();
ui.renderState(state);
piggy.setTotal(state.total);
ui.setCenterMode('idle', { spins: state.spins });
ui.setStatus('PŘIPRAVENO', 'ready');
ledRing.setMode('idle');
updateControls();
