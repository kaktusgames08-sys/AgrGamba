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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function rollRareType() {
  const r = Math.random() * 100;
  if (r < 1.5) return 'ultra';
  if (r < 3) return 'jackpot';
  if (r < 7) return 'instant';
  if (r < 11) return 'fakeCrash';
  if (r < 18) return 'suspicious';
  if (r < 28) return 'heartbeat';
  if (r < 38) return 'reverse';
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

  _setReel(name, durationMs = 120) {
    const track = this.dom.reelTrack;
    const reelWindow = track.parentElement;
    const cellHeight = Math.max(1, Math.round(reelWindow?.clientHeight || 142));
    const sequence = createVerticalReelSequence(name, { cycles: 2, cellHeight });
    const renderedItems = [...sequence.items].reverse();

    track.className = 'reel-track vertical-reel-track is-spinning';
    track.replaceChildren(...renderedItems.map((item) => this._makeReelCell(item)));
    track.style.transition = 'none';
    track.style.transform = `translateY(-${sequence.travelPx}px)`;
    track.style.filter = 'blur(1.5px) saturate(1.15)';

    void track.offsetHeight;

    const safeDuration = Math.max(70, Math.round(durationMs));
    track.style.transition = `transform ${safeDuration}ms cubic-bezier(.17,.82,.2,1), filter ${Math.min(170, safeDuration)}ms ease-out`;

    requestAnimationFrame(() => {
      track.style.transform = 'translateY(0px)';
      track.style.filter = 'blur(0) saturate(1)';
      window.setTimeout(() => track.classList.remove('is-spinning'), safeDuration);
    });
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
    this.dom.reelTrack.classList.remove('reel-kick', 'reel-fake-stop', 'reel-lock', 'reel-reverse', 'is-spinning');
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

    if (rareType === 'fakeCrash') {
      this.dom.marqueeText.textContent = 'CHYBA';
      this.dom.resultFlavor.textContent = 'NĚCO SE POSRALO...';
      this.onShake('shake-sm');
      await sleep(180);
      this.dom.marqueeText.textContent = '...';
      await sleep(120);
      this.dom.marqueeText.textContent = 'nic';
      this.dom.resultFlavor.textContent = 'FALEŠNÝ POPLACH';
      await sleep(180);
    }

    if (rareType === 'instant') {
      this._setReel(loser, 120);
      this._kickReel('reel-lock');
      this.audio.resultLock();
      this.dom.marqueeText.textContent = 'BONK';
      this.dom.resultFlavor.textContent = 'BONK';
      this.onShake('shake-sm');
      await sleep(110);
      await this._reveal(loser, winner, rareType, plan);
      return;
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

    let reelName = Math.random() > 0.5 ? AGRAELUS : CHATTER;
    const chaosEnd = performance.now() + plan.chaosMs;
    while (performance.now() < chaosEnd) {
      reelName = reelName === AGRAELUS ? CHATTER : AGRAELUS;
      this._setReel(reelName, Math.max(88, plan.chaosIntervalMs * 1.35));
      this._kickReel();
      this.audio.reelTick();
      if (rareType === 'ultra') this.onShake('shake-sm');
      await sleep(plan.chaosIntervalMs);
    }

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
        await sleep(150 + i * 38);
      }
      this.dom.machine.classList.remove('heartbeat-pulse');
    }

    this.dom.game.classList.remove('spin-chaos');
    this.dom.game.classList.add('spin-tension');
    this._setRibbonSpeed('1.25s');
    const tensionWords = ['POČKEJ...', 'DRŽ...', 'NEKECEJ'];
    for (let i = 0; i < plan.slowdownDelays.length; i += 1) {
      reelName = reelName === AGRAELUS ? CHATTER : AGRAELUS;
      const delay = plan.slowdownDelays[i];
      this._setReel(reelName, Math.min(320, Math.max(120, delay * 0.88)));
      this._kickReel();
      const progress = (i + 1) / plan.slowdownDelays.length;
      this.audio.slowdownTick(1.18 - progress * 0.42);
      if (progress > 0.55) this.audio.tensionPulse(progress);
      if (i >= plan.slowdownDelays.length - 3) {
        const word = tensionWords[i - (plan.slowdownDelays.length - 3)];
        this.dom.marqueeText.textContent = word;
        this.dom.resultFlavor.textContent = word;
      }
      await sleep(delay);
    }

    if (rareType === 'reverse') {
      this._setReel(loser, 190);
      this._kickReel('reel-fake-stop');
      this.dom.game.classList.add('fake-stop-beat');
      this.dom.marqueeText.textContent = 'HOTOVO...?';
      this.dom.resultFlavor.textContent = 'HOTOVO...?';
      this.dom.nearMissText.textContent = 'POČKAT';
      this.dom.nearMissText.classList.remove('hidden');
      this.audio.fakeStop();
      await sleep(plan.fakeStopHoldMs);

      this.dom.nearMissText.classList.add('hidden');
      this._setReel(winner, 250);
      this._kickReel('reel-reverse');
      this.dom.marqueeText.textContent = 'COŽE?!';
      this.dom.resultFlavor.textContent = 'COŽE?!';
      this.audio.spinLaunch();
      this.reactions?.burst(5);
      await sleep(240);
      this.dom.game.classList.remove('fake-stop-beat');
    } else {
      const fakeStopCount = rareType === 'suspicious' ? Math.max(2, plan.fakeStops) : plan.fakeStops;
      for (let i = 0; i < fakeStopCount; i += 1) {
        const fakeResult = i % 2 === 0 ? winner : loser;
        this._setReel(fakeResult, 190);
        this._kickReel('reel-fake-stop');
        this.dom.game.classList.add('fake-stop-beat');
        const nearText = randomOf(NEAR_MISS_TEXTS);
        this.dom.nearMissText.textContent = nearText;
        this.dom.nearMissText.classList.remove('hidden');
        this.dom.marqueeText.textContent = i === 0 ? 'POČKEJ...' : 'ANI NÁHODOU';
        this.dom.resultFlavor.textContent = nearText;
        this.audio.fakeStop();
        if (Math.random() < 0.65) this.reactions?.burst(3);
        await sleep(plan.fakeStopHoldMs + (rareType === 'suspicious' ? 90 : 0));
        this.dom.nearMissText.classList.add('hidden');
        this.dom.game.classList.remove('fake-stop-beat');

        if (i < fakeStopCount - 1) {
          reelName = fakeResult === AGRAELUS ? CHATTER : AGRAELUS;
          this._setReel(reelName, 120);
          this._kickReel();
          this.audio.reelTick();
          await sleep(Math.max(65, plan.fakeStopHoldMs * 0.55));
        }
      }
    }

    this._setReel(winner, 180);
    this._kickReel('reel-fake-stop');
    const finalNearText = randomOf(NEAR_MISS_TEXTS);
    this.dom.nearMissText.textContent = finalNearText;
    this.dom.nearMissText.classList.remove('hidden');
    this.dom.marqueeText.textContent = 'DRŽ...';
    this.dom.resultFlavor.textContent = finalNearText;
    this.audio.tensionPulse(1);
    this.reactions?.burst(4);
    await sleep(plan.nearMissHoldMs);
    this.dom.nearMissText.classList.add('hidden');

    this.dom.game.classList.add('pre-result-silence');
    this.dom.marqueeText.textContent = '...';
    this.dom.resultFlavor.textContent = '...';
    this._setRibbonSpeed('2.4s');
    await sleep(plan.silenceMs);

    this.dom.game.classList.remove('pre-result-silence');
    this.dom.game.classList.add('result-lock');
    this._setReel(loser, 230);
    this._kickReel('reel-lock');
    this.audio.resultLock();
    this.onShake('shake-sm');
    await sleep(plan.resultLockHoldMs);

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
