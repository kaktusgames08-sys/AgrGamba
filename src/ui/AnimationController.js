import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';
import {
  AGRAELUS_WIN_TEXTS,
  CHATTER_WIN_TEXTS,
  AGRAELUS_LOSE_TEXTS,
  CHATTER_LOSE_TEXTS,
  randomOf,
} from './Texts.js';
import { createVerticalReelSequence, createSmoothReelMotion } from './ReelStrip.js';
import { formatMachineResult } from './ResultDisplay.js';
import './dopamine.css';
import './vertical-reel.css';
import './reel-physics.css';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class AnimationController {
  constructor({ dom, audio, particles, chatSpam, reactions, settings, onShake, onFlash }) {
    this.dom = dom;
    this.audio = audio;
    this.particles = particles;
    this.chatSpam = chatSpam;
    this.reactions = reactions;
    this.settings = settings;
    this.onShake = onShake;
    this.onFlash = onFlash;
    this._activeFrame = null;
  }

  _makeReelCell(name) {
    const cell = document.createElement('div');
    cell.className = `reel-cell ${name === AGRAELUS ? 'name-agraelus' : 'name-chatter'}`;
    cell.textContent = name;
    return cell;
  }

  _prepareSmoothReel(finalName, durationMs) {
    const track = this.dom.reelTrack;
    const reelWindow = track.parentElement;
    const cellHeight = Math.max(1, Math.round(reelWindow?.clientHeight || 150));
    const cycles = durationMs <= 900 ? 10 : durationMs <= 1700 ? 14 : 20;
    const sequence = createVerticalReelSequence(finalName, { cycles, cellHeight });

    track.className = 'reel-track vertical-reel-track physical-reel smooth-reel is-spinning';
    track.replaceChildren(...sequence.renderedItems.map((item) => this._makeReelCell(item)));
    track.style.transition = 'none';
    track.style.transform = `translate3d(0, ${sequence.startY}px, 0)`;
    track.style.filter = 'blur(4.5px) saturate(1.18) brightness(1.08)';
    track.dataset.reelY = String(sequence.startY);
    void track.offsetHeight;

    return sequence;
  }

  _runSmoothReel(sequence, durationMs) {
    const track = this.dom.reelTrack;
    const motion = createSmoothReelMotion({
      startY: sequence.startY,
      endY: sequence.settleY,
      durationMs,
      samples: Math.max(120, Math.round(durationMs / 12)),
      easingPower: 3.15,
    });

    return new Promise((resolve) => {
      const startedAt = performance.now();
      let lastCellIndex = -1;
      let ribbonStage = 0;

      const frame = (now) => {
        const elapsed = now - startedAt;
        const t = clamp01(elapsed / motion.durationMs);
        const eased = 1 - Math.pow(1 - t, motion.easingPower);
        const y = motion.startY + (motion.endY - motion.startY) * eased;
        const speedFactor = Math.pow(1 - t, Math.max(1, motion.easingPower - 1));
        const blur = 4.5 * speedFactor;
        const brightness = 1.02 + 0.08 * speedFactor;

        track.style.transform = `translate3d(0, ${y.toFixed(3)}px, 0)`;
        track.style.filter = `blur(${blur.toFixed(2)}px) saturate(${(1.04 + 0.14 * speedFactor).toFixed(3)}) brightness(${brightness.toFixed(3)})`;
        track.dataset.reelY = String(y);

        const traveled = y - motion.startY;
        const cellIndex = Math.floor(traveled / sequence.cellHeight);
        if (cellIndex > lastCellIndex) {
          lastCellIndex = cellIndex;
          if (t < 0.72) this.audio.reelTick();
          else this.audio.slowdownTick(1.04 - (t - 0.72) * 0.55);
        }

        if (t >= 0.62 && ribbonStage === 0) {
          ribbonStage = 1;
          this._setRibbonSpeed('1.25s');
          this.dom.marqueeText.textContent = 'ZPOMALUJE...';
          this.dom.resultFlavor.textContent = 'ZPOMALUJE...';
        }
        if (t >= 0.82 && ribbonStage === 1) {
          ribbonStage = 2;
          this._setRibbonSpeed('1.8s');
          this.dom.marqueeText.textContent = 'TAK KDO...';
          this.dom.resultFlavor.textContent = 'TAK KDO...';
        }
        if (t >= 0.95 && ribbonStage === 2) {
          ribbonStage = 3;
          this._setRibbonSpeed('2.4s');
          this.dom.marqueeText.textContent = '...';
          this.dom.resultFlavor.textContent = '...';
        }

        if (t < 1) {
          this._activeFrame = requestAnimationFrame(frame);
          return;
        }

        track.style.transform = `translate3d(0, ${motion.endY}px, 0)`;
        track.style.filter = 'blur(0) saturate(1) brightness(1.08)';
        track.classList.remove('is-spinning');
        this._activeFrame = null;
        resolve();
      };

      this._activeFrame = requestAnimationFrame(frame);
    });
  }

  _setRibbonSpeed(speed) {
    this.dom.ribbonTrack?.style.setProperty('--ticker-speed', speed);
  }

  _clearSpinClasses() {
    if (this._activeFrame) {
      cancelAnimationFrame(this._activeFrame);
      this._activeFrame = null;
    }

    this.dom.game.classList.remove(
      'dopamine-spin',
      'spin-chaos',
      'spin-tension',
      'fake-stop-beat',
      'pre-result-silence',
      'result-lock',
      'loser-reveal',
      'winner-agra',
      'winner-chat',
      'heartbeat-spin',
      'reverse-spin',
      'clean-reel-spin',
    );
    this.dom.machine.classList.remove('dopamine-charge', 'result-ready', 'heartbeat-pulse');
    this.dom.reelTrack.classList.remove(
      'reel-kick',
      'reel-fake-stop',
      'reel-lock',
      'reel-reverse',
      'is-spinning',
      'near-miss-active',
      'smooth-reel',
    );
  }

  _resetResultDisplay({ spinning = false } = {}) {
    const display = this.dom.resultDisplay;
    display.classList.remove('l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat', 'is-idle', 'is-spinning');
    display.classList.add(spinning ? 'is-spinning' : 'is-idle');
    this.dom.resultPayer.textContent = spinning ? 'TOČÍM...' : 'ČEKÁM NA SPIN';
    this.dom.resultWinner.textContent = '—';
    this.dom.resultFlavor.textContent = spinning ? 'VÁLEC SE TOČÍ' : 'KDO TO DNES ZAPLATÍ?';
    this.dom.resultL.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');
  }

  async playSpin(result, durationMs) {
    const { loser, winner } = result;
    const spinDuration = Math.max(550, Math.round(durationMs));

    this._clearSpinClasses();
    this._resetResultDisplay({ spinning: true });
    this.dom.game.classList.add('dopamine-spin', 'clean-reel-spin');
    this.dom.machine.classList.add('dopamine-charge');
    this.dom.lights.classList.add('on');
    this.dom.nearMissText.classList.add('hidden');
    this.dom.rareLabel.classList.add('hidden');
    this.dom.marqueeText.textContent = 'KDO PLATÍ???';
    this._setRibbonSpeed('0.78s');
    this.audio.spinLaunch();

    const reel = this._prepareSmoothReel(loser, spinDuration);
    await this._runSmoothReel(reel, spinDuration);

    this.audio.resultLock();
    this.onShake('shake-sm');
    await sleep(90);

    await this._reveal(loser, winner);
  }

  async _reveal(loser, winner) {
    const display = this.dom.resultDisplay;
    const copy = formatMachineResult({ loser, winner });
    const winnerClass = copy.tone === 'agra' ? 'winner-agra' : 'winner-chat';
    const loserClass = loser === AGRAELUS ? 'loser-agra' : 'loser-chat';

    display.classList.remove('is-spinning', 'is-idle', 'l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat');
    display.classList.add(loserClass);
    this.dom.game.classList.add('loser-reveal');

    this.dom.resultPayer.textContent = copy.payer;
    this.dom.resultWinner.textContent = '—';
    this.dom.resultL.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');

    const loseTexts = loser === AGRAELUS ? AGRAELUS_LOSE_TEXTS : CHATTER_LOSE_TEXTS;
    this.dom.resultFlavor.textContent = randomOf(loseTexts);
    await sleep(150);

    display.classList.add('l-hit');
    this.dom.resultL.classList.remove('hidden');
    this.audio.lImpact();
    this.onShake('shake-md');
    this.onFlash('reduced');
    this.reactions?.burst(5);
    await sleep(235);

    display.classList.remove('l-hit');
    display.classList.add(winnerClass);
    this.dom.game.classList.remove('loser-reveal');
    this.dom.game.classList.add(winnerClass);
    this.dom.machine.classList.add('result-ready');
    this.dom.resultWinner.textContent = copy.winner;
    this.audio.winnerBoom();
    this.onShake('shake-md');
    this.onFlash('full');

    const kind = winner === AGRAELUS ? 'agra' : 'chat';
    this.particles.burst(kind, 100);
    setTimeout(() => this.particles.burst(kind, 52), 120);

    const winnerTexts = winner === AGRAELUS ? AGRAELUS_WIN_TEXTS : CHATTER_WIN_TEXTS;
    this.dom.resultFlavor.textContent = randomOf(winnerTexts);
    this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');
    this.reactions?.burst(18, 'big');

    await sleep(560);

    this.dom.continueButton.classList.remove('hidden');
    this.dom.marqueeText.textContent = 'KLIKNI NEBO SPACE PRO POKRAČOVÁNÍ';
    this._setRibbonSpeed('1.7s');
  }

  clearReveal() {
    this.dom.lights.classList.remove('on');
    this.dom.rareLabel.classList.add('hidden');
    this._clearSpinClasses();
    this._resetResultDisplay();
    this.dom.marqueeText.textContent = 'SPACE = DALŠÍ SPIN';
    this._setRibbonSpeed('4.5s');
  }
}
