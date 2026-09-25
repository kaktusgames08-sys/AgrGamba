import './style.css';
import './polish.css';
import { WHEEL_SEGMENTS } from './core/WheelConfig.js';
import { pickSegmentIndex } from './core/WheelEngine.js';
import { GameState } from './core/GameState.js';
import { AudioManager } from './audio/AudioManager.js';
import { WheelRenderer } from './ui/WheelRenderer.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { UI } from './ui/UI.js';

const state = new GameState();
const audio = new AudioManager();
const ui = new UI();
const particles = new ParticleSystem(
  document.querySelector('#particleLayer'),
  document.querySelector('#flash'),
);
const wheel = new WheelRenderer({
  mount: document.querySelector('#wheelMount'),
  pointer: document.querySelector('#pointer'),
  audio,
  segments: WHEEL_SEGMENTS,
});

let busy = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateControls() {
  ui.setBusy(busy || !state.canSpin());
}

async function spin() {
  if (busy || !state.canSpin()) return;

  audio.ensure();
  busy = true;
  state.beginSpin();
  ui.renderState(state);
  updateControls();
  ui.hideResult();

  const index = pickSegmentIndex(WHEEL_SEGMENTS);
  const segment = WHEEL_SEGMENTS[index];

  await wheel.spinTo(index);

  const record = state.resolve(segment);
  ui.renderState(state);
  ui.showResult(record);

  if (record.type === 'multiplier') {
    audio.multiplier(record.multiplier);
    particles.burst({
      count: record.multiplier === 3 ? 62 : 46,
      intense: true,
      variant: 'reward',
    });
    particles.screenFlash(record.multiplier === 3 ? 'strong' : 'normal', 'reward');
    ui.shake(record.multiplier === 3 ? 'normal' : 'soft');
  } else {
    audio.money(record.value);
    particles.burst({
      count: Math.min(42, 18 + Math.round(record.value / 4)),
      intense: record.value >= 60,
      variant: 'reward',
    });

    if (record.value >= 60) {
      particles.screenFlash(record.value >= 75 ? 'strong' : 'normal', 'reward');
      ui.shake('soft');
    }
  }

  if (record.extraSpins) {
    setTimeout(() => audio.extraSpin(), 220);
  }

  await wait(segment.finale ? 820 : 780);

  if (state.isEnded()) {
    ui.hideResult();
    await wait(120);

    audio.lossFinale();
    particles.screenFlash('strong', 'loss');
    particles.burst({ count: 48, intense: true, variant: 'loss' });
    ui.shake('normal');

    await ui.showFinal(state.total);
  } else {
    ui.hideResult();
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

  if (event.code === 'Space') {
    event.preventDefault();
    spin();
  } else if (event.key.toLowerCase() === 'r' && state.isEnded()) {
    restart();
  } else if (event.key.toLowerCase() === 'm') {
    ui.setMuted(audio.toggle());
  } else if (event.key.toLowerCase() === 'f') {
    toggleFullscreen();
  }
});

ui.setMuted(audio.muted);
ui.renderState(state);
updateControls();
