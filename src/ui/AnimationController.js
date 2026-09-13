import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';
import {
  AGRAELUS_WIN_TEXTS, CHATTER_WIN_TEXTS,
  AGRAELUS_LOSE_TEXTS, CHATTER_LOSE_TEXTS,
  NEAR_MISS_TEXTS,
  randomOf,
} from './Texts.js';
import { createSpinPlan } from './SpinPresentation.js';
import { createVerticalReelSequence } from './ReelStrip.js';
import { formatMachineResult } from './ResultDisplay.js';
import './dopamine.css';
import './vertical-reel.css';
import './reel-physics.css';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

function rollRareType() {
  const r = Math.random() * 100;
  if (r < 1.5) return 'ultra';
  if (r < 3) return 'jackpot';
  if (r < 8) return 'fakeCrash';
  if (r < 16) return 'suspicious';
  if (r < 28) return 'heartbeat';
  if (r < 39) return 'reverse';
  return 'normal';
}

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
  }

  _makeReelCell(name) {
    const cell = document.createElement('div');
    cell.className = 'reel-cell ' + (name === AGRAELUS ? 'name-agraelus' : 'name-chatter');
    cell.textContent = name;
    return cell;
  }

  _preparePhysicalReel(finalName) {
    const track = this.dom.reelTrack;
    const reelWindow = track.parentElement;
    const cellHeight = Math.max(1, Math.round(reelWindow?.clientHeight || 150));
    const sequence = createVerticalReelSequence(finalName, {
      cycles: 18,
      cellHeight,
      nearMissPx: randomInt(4, 9),
    });

    track.className = 'reel-track vertical-reel-track physical-reel is-spinning';
    track.replaceChildren(...sequence.renderedItems.map((item) => this._makeReelCell(item)));
    track.style.transition = 'none';
    track.style.transform = `translateY(${sequence.startY}px)`;
    track.style.filter = 'blur(4.2px) saturate(1.22) brightness(1.08)';
    track.dataset.reelY = String(sequence.startY);
    void track.offsetHeight;

    return sequence;
  }

  async _moveReelTo(
    y,
    durationMs,
    {
      easing = 'linear',
      blur = 0,
      saturation = 1,
      brightness = 1,
    } = {},
  ) {
    const track = this.dom.reelTrack;
    const duration = Math.max(55, Math.round(durationMs));
    track.style.transition = [
      `transform ${duration}ms ${easing}`,
      `filter ${Math.min(duration, 220)}ms ease-out`,
    ].join(', ');
    track.style.transform = `translateY(${Math.round(y * 100) / 100}px)`;
    track.style.filter = `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`;
    track.dataset.reelY = String(y);
    await sleep(duration + 8);
  }

  async _tickDuring(durationMs, intervalMs, callback) {
    const started = performance.now();
    while (performance.now() - started < durationMs - intervalMs * 0.5) {
      callback();
      await sleep(intervalMs);
    }
  }

  _setRibbonSpeed(speed) {
    this.dom.ribbonTrack?.style.setProperty('--ticker-speed', speed);
  }

  _kickReel(className = 'reel-kick') {
    const reel = this.dom.reelTrack;
    reel.classList.remove('reel-kick', 'reel-fake-stop', 'reel-lock', 'reel-reverse');
    void reel.offsetWidth;
    reel.classList.add(className);
  }

  _clearSpinClasses() {
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
    );
    this.dom.machine.classList.remove('dopamine-charge', 'result-ready', 'heartbeat-pulse');
    this.dom.reelTrack.classList.remove(
      'reel-kick',
      'reel-fake-stop',
      'reel-lock',
      'reel-reverse',
      'is-spinning',
      'near-miss-active',
    );
  }

  _resetResultDisplay({ spinning = false } = {}) {
    const display = this.dom.resultDisplay;
    display.classList.remove('l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat', 'is-idle', 'is-spinning');
    display.classList.add(spinning ? 'is-spinning' : 'is-idle');
    this.dom.resultPayer.textContent = spinning ? 'TOČÍM...' : 'ČEKÁM NA SPIN';
    this.dom.resultWinner.textContent = '—';
    this.dom.resultFlavor.textContent = spinning ? 'AUTOMAT ROZHODUJE' : 'KDO TO DNES ZAPLATÍ?';
    this.dom.resultL.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');
  }

  async playSpin(result, durationMs) {
    const { loser, winner } = result;
    const rareType = rollRareType();
    const plan = createSpinPlan(durationMs, rareType);

    this._clearSpinClasses();
    this._resetResultDisplay({ spinning: true });
    this.dom.game.classList.add('dopamine-spin', 'spin-chaos');
    if (rareType === 'heartbeat') this.dom.game.classList.add('heartbeat-spin');
    if (rareType === 'reverse') this.dom.game.classList.add('reverse-spin');
    this.dom.machine.classList.add('dopamine-charge');
    this.dom.lights.classList.add('on');
    this.dom.nearMissText.classList.add('hidden');
    this.dom.rareLabel.classList.add('hidden');
    this.dom.marqueeText.textContent = 'KDO PLATÍ???';
    this._setRibbonSpeed('0.78s');
    this.audio.spinLaunch();

    const reel = this._preparePhysicalReel(loser);

    if (rareType === 'fakeCrash') {
      this.dom.marqueeText.textContent = 'CHYBA';
      this.dom.resultFlavor.textContent = 'NĚCO SE POSRALO...';
      this.onShake('shake-sm');
      await sleep(170);
      this.dom.marqueeText.textContent = '...';
      await sleep(100);
      this.dom.marqueeText.textContent = 'nic';
      this.dom.resultFlavor.textContent = 'FALEŠNÝ POPLACH';
      await sleep(140);
    }

    this.dom.rareLabel.textContent = rareType === 'ultra'
      ? 'TY VOLE'
      : rareType === 'jackpot'
        ? 'JACKPOT — pořád za 0 Kč'
        : rareType === 'heartbeat'
          ? 'HEARTBEAT SPIN'
          : rareType === 'reverse'
            ? 'REVERSE SPIN'
            : '';
    if (this.dom.rareLabel.textContent) this.dom.rareLabel.classList.remove('hidden');

    // One uninterrupted strip now travels for the entire spin. Nothing is
    // rebuilt or replaced between ticks, so the nick visibly passes through
    // the window instead of teleporting into it.
    await Promise.all([
      this._moveReelTo(reel.cruiseY, plan.chaosMs, {
        easing: 'linear',
        blur: rareType === 'ultra' ? 5.2 : 4.2,
        saturation: 1.2,
        brightness: 1.08,
      }),
      this._tickDuring(plan.chaosMs, Math.max(34, plan.chaosIntervalMs), () => {
        this.audio.reelTick();
        if (rareType === 'ultra' && Math.random() < 0.22) this.onShake('shake-sm');
      }),
    ]);

    if (rareType === 'heartbeat') {
      this.dom.marqueeText.textContent = 'POSLOUCHEJ...';
      this.dom.resultFlavor.textContent = 'BUM... BUM... BUM...';
      this._setRibbonSpeed('1.8s');
      for (let i = 0; i < plan.heartbeatPulses; i += 1) {
        this.dom.machine.classList.remove('heartbeat-pulse');
        void this.dom.machine.offsetWidth;
        this.dom.machine.classList.add('heartbeat-pulse');
        this.audio.tensionPulse(0.65 + i * 0.1);
        if (i >= 1) this.reactions?.burst(2);
        await sleep(105 + i * 28);
      }
      this.dom.machine.classList.remove('heartbeat-pulse');
    }

    this.dom.game.classList.remove('spin-chaos');
    this.dom.game.classList.add('spin-tension');
    this._setRibbonSpeed('1.25s');

    const tensionWords = ['POČKEJ...', 'DRŽ...', 'NEKECEJ'];
    const slowdownEndY = -(reel.cellHeight * 2.35);
    const slowdownStartY = reel.cruiseY;
    const slowdownCount = plan.slowdownDelays.length;

    for (let i = 0; i < slowdownCount; i += 1) {
      const progress = (i + 1) / slowdownCount;
      const easedProgress = 1 - Math.pow(1 - progress, 1.18);
      const targetY = slowdownStartY + (slowdownEndY - slowdownStartY) * easedProgress;
      const delay = plan.slowdownDelays[i];

      await this._moveReelTo(targetY, delay, {
        easing: 'cubic-bezier(.18,.72,.24,1)',
        blur: Math.max(0.15, 2.8 * (1 - progress)),
        saturation: 1.08,
        brightness: 1.02,
      });

      this._kickReel();
      this.audio.slowdownTick(1.18 - progress * 0.42);
      if (progress > 0.55) this.audio.tensionPulse(progress);

      if (i >= slowdownCount - 3) {
        const word = tensionWords[i - (slowdownCount - 3)];
        this.dom.marqueeText.textContent = word;
        this.dom.resultFlavor.textContent = word;
      }
    }

    // First believable fake stop: the already chosen loser gets extremely
    // close to center at index 2, but the reel never swaps DOM or jumps.
    if (plan.fakeStops > 0 || rareType === 'suspicious' || rareType === 'reverse') {
      const fakeStopOffset = randomInt(4, 9);
      const fakeStopY = -(reel.cellHeight * 2) + fakeStopOffset;
      await this._moveReelTo(fakeStopY, rareType === 'suspicious' ? 250 : 190, {
        easing: 'cubic-bezier(.1,.86,.16,1)',
        blur: 0,
        brightness: 1.12,
      });
      this._kickReel('reel-fake-stop');
      this.dom.game.classList.add('fake-stop-beat');
      this.dom.marqueeText.textContent = 'TO JE ONO...?';
      this.dom.resultFlavor.textContent = 'TO JE ONO...?';
      this.dom.nearMissText.textContent = randomOf(NEAR_MISS_TEXTS);
      this.dom.nearMissText.classList.remove('hidden');
      this.audio.fakeStop();
      this.reactions?.burst(3);
      await sleep(plan.fakeStopHoldMs + (rareType === 'suspicious' ? 120 : 0));
      this.dom.nearMissText.classList.add('hidden');
      this.dom.game.classList.remove('fake-stop-beat');

      if (rareType === 'reverse') {
        // A tiny physical rollback, not a result swap. The same reel strip
        // moves backwards a few pixels and then continues downward.
        await this._moveReelTo(fakeStopY - 18, 125, {
          easing: 'cubic-bezier(.4,0,.7,1)',
          blur: 0.8,
          brightness: 1.08,
        });
        this.dom.marqueeText.textContent = 'COŽE?!';
        this.dom.resultFlavor.textContent = 'COŽE?!';
        this.audio.spinLaunch();
        this.reactions?.burst(5);
      }
    }

    // Pixel near miss: index 1 is always the opposite nick. It reaches almost
    // perfect alignment but deliberately misses center by only 4–9 px.
    this.dom.reelTrack.classList.add('near-miss-active');
    await this._moveReelTo(reel.nearMissY, Math.max(240, plan.nearMissHoldMs), {
      easing: 'cubic-bezier(.08,.82,.14,1)',
      blur: 0,
      brightness: 1.16,
    });
    this._kickReel('reel-fake-stop');

    const finalNearText = randomOf(NEAR_MISS_TEXTS);
    this.dom.nearMissText.textContent = finalNearText;
    this.dom.nearMissText.classList.remove('hidden');
    this.dom.marqueeText.textContent = 'O MILIMETR...';
    this.dom.resultFlavor.textContent = finalNearText;
    this.audio.fakeStop();
    this.audio.tensionPulse(1);
    this.reactions?.burst(4);
    await sleep(Math.max(150, plan.nearMissHoldMs * 0.75));

    this.dom.nearMissText.classList.add('hidden');
    this.dom.game.classList.add('pre-result-silence');
    this.dom.marqueeText.textContent = '...';
    this.dom.resultFlavor.textContent = '...';
    this._setRibbonSpeed('2.4s');
    await sleep(plan.silenceMs);

    // Final result is not snapped in. The last whole cell physically rolls
    // down from the near-miss position and locks exactly at y = 0.
    this.dom.game.classList.remove('pre-result-silence');
    this.dom.game.classList.add('result-lock');
    const settleDuration = Math.max(280, plan.resultLockHoldMs * 3.2);
    await this._moveReelTo(reel.settleY, settleDuration, {
      easing: 'cubic-bezier(.1,.82,.16,1)',
      blur: 0,
      saturation: 1,
      brightness: 1.12,
    });
    this.dom.reelTrack.classList.remove('is-spinning', 'near-miss-active');
    this._kickReel('reel-lock');
    this.audio.resultLock();
    this.onShake('shake-sm');
    await sleep(Math.max(70, plan.resultLockHoldMs));

    await this._reveal(loser, winner, rareType, plan);
  }

  async _reveal(loser, winner, rareType, plan) {
    const display = this.dom.resultDisplay;
    const copy = formatMachineResult({ loser, winner });
    const winnerClass = copy.tone === 'agra' ? 'winner-agra' : 'winner-chat';
    const loserClass = loser === AGRAELUS ? 'loser-agra' : 'loser-chat';

    display.classList.remove('is-spinning', 'is-idle', 'l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat');
    display.classList.add(loserClass);
    this.dom.game.classList.remove('result-lock');
    this.dom.game.classList.add('loser-reveal');

    this.dom.resultPayer.textContent = copy.payer;
    this.dom.resultWinner.textContent = '—';
    this.dom.resultL.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');

    const loseTexts = loser === AGRAELUS ? AGRAELUS_LOSE_TEXTS : CHATTER_LOSE_TEXTS;
    this.dom.resultFlavor.textContent = randomOf(loseTexts);
    this.audio.tensionPulse(0.8);
    await sleep(plan.loserLeadMs);

    display.classList.add('l-hit');
    this.dom.resultL.classList.remove('hidden');
    this.audio.lImpact();
    this.onShake('shake-md');
    this.onFlash('reduced');
    this.reactions?.burst(6);
    await sleep(plan.lHoldMs);

    display.classList.remove('l-hit');
    display.classList.add(winnerClass);
    this.dom.game.classList.remove('loser-reveal');
    this.dom.game.classList.add(winnerClass);
    this.dom.machine.classList.add('result-ready');
    this.dom.resultWinner.textContent = copy.winner;
    this.audio.winnerBoom();
    if (rareType === 'ultra' || rareType === 'jackpot') this.audio.jackpotSiren();
    this.onShake(rareType === 'ultra' || rareType === 'jackpot' ? 'shake-lg' : 'shake-md');
    this.onFlash('full');

    const kind = winner === AGRAELUS ? 'agra' : 'chat';
    const firstBurst = rareType === 'ultra' || rareType === 'jackpot' ? 170 : 105;
    this.particles.burst(kind, firstBurst);
    setTimeout(() => this.particles.burst(kind, Math.round(firstBurst * 0.55)), 120);

    const winnerTexts = winner === AGRAELUS ? AGRAELUS_WIN_TEXTS : CHATTER_WIN_TEXTS;
    this.dom.resultFlavor.textContent = randomOf(winnerTexts);

    this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');
    this.reactions?.burst(rareType === 'ultra' || rareType === 'jackpot' ? 28 : 18, 'big');
    setTimeout(() => {
      this.onShake('shake-sm');
      if (rareType === 'ultra' || rareType === 'jackpot') {
        this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');
        this.reactions?.burst(14, 'big');
      }
    }, 150);

    await sleep(Math.max(520, plan.winnerHoldMs * 0.55));

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
