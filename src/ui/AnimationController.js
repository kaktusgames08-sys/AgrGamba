import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';
import {
  AGRAELUS_WIN_TEXTS, CHATTER_WIN_TEXTS,
  AGRAELUS_LOSE_TEXTS, CHATTER_LOSE_TEXTS,
  NEAR_MISS_TEXTS,
  randomOf,
} from './Texts.js';
import { createSpinPlan } from './SpinPresentation.js';
import './dopamine.css';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function rollRareType() {
  const r = Math.random() * 100;
  if (r < 1.5) return 'ultra';
  if (r < 4.5) return 'suspicious';
  if (r < 7.5) return 'instant';
  if (r < 9.5) return 'fakeCrash';
  if (r < 10.5) return 'jackpot';
  return 'normal';
}

export class AnimationController {
  constructor({ dom, audio, particles, chatSpam, settings, onShake, onFlash }) {
    this.dom = dom;
    this.audio = audio;
    this.particles = particles;
    this.chatSpam = chatSpam;
    this.settings = settings;
    this.onShake = onShake;
    this.onFlash = onFlash;
  }

  _setReel(name) {
    this.dom.reelTrack.textContent = name;
    this.dom.reelTrack.className = 'reel-cell ' + (name === AGRAELUS ? 'name-agraelus' : 'name-chatter');
  }

  _setRibbonSpeed(speed) {
    this.dom.ribbonTrack?.style.setProperty('--ticker-speed', speed);
  }

  _kickReel(className = 'reel-kick') {
    const reel = this.dom.reelTrack;
    reel.classList.remove('reel-kick', 'reel-fake-stop', 'reel-lock');
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
    );
    this.dom.machine.classList.remove('dopamine-charge', 'result-ready');
    this.dom.reelTrack.classList.remove('reel-kick', 'reel-fake-stop', 'reel-lock');
  }

  async playSpin(result, durationMs) {
    const { loser, winner } = result;
    const rareType = rollRareType();
    const plan = createSpinPlan(durationMs, rareType);

    this._clearSpinClasses();
    this.dom.revealOverlay.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');
    this.dom.game.classList.add('dopamine-spin', 'spin-chaos');
    this.dom.machine.classList.add('dopamine-charge');
    this.dom.lights.classList.add('on');
    this.dom.nearMissText.classList.add('hidden');
    this.dom.rareLabel.classList.add('hidden');
    this.dom.marqueeText.textContent = 'KDO PLATÍ???';
    this._setRibbonSpeed('0.78s');
    this.audio.spinLaunch();

    if (rareType === 'fakeCrash') {
      this.dom.marqueeText.textContent = 'ERROR';
      this.onShake('shake-sm');
      await sleep(180);
      this.dom.marqueeText.textContent = '...';
      await sleep(120);
      this.dom.marqueeText.textContent = 'nah';
      await sleep(180);
    }

    if (rareType === 'instant') {
      this._setReel(loser);
      this._kickReel('reel-lock');
      this.audio.resultLock();
      this.dom.marqueeText.textContent = 'BONK';
      this.onShake('shake-sm');
      await sleep(90);
      await this._reveal(loser, winner, rareType, plan);
      return;
    }

    this.dom.rareLabel.textContent = rareType === 'ultra'
      ? 'HOLY FUCK'
      : rareType === 'jackpot'
        ? 'JACKPOT — still worth absolutely nothing'
        : '';
    if (this.dom.rareLabel.textContent) this.dom.rareLabel.classList.remove('hidden');

    let reelName = Math.random() > 0.5 ? AGRAELUS : CHATTER;
    const chaosEnd = performance.now() + plan.chaosMs;
    while (performance.now() < chaosEnd) {
      reelName = reelName === AGRAELUS ? CHATTER : AGRAELUS;
      this._setReel(reelName);
      this._kickReel();
      this.audio.reelTick();
      if (rareType === 'ultra') this.onShake('shake-sm');
      await sleep(plan.chaosIntervalMs);
    }

    this.dom.game.classList.remove('spin-chaos');
    this.dom.game.classList.add('spin-tension');
    this._setRibbonSpeed('1.25s');
    const tensionWords = ['WAIT...', 'HOLD...', 'NO WAY'];
    for (let i = 0; i < plan.slowdownDelays.length; i++) {
      reelName = reelName === AGRAELUS ? CHATTER : AGRAELUS;
      this._setReel(reelName);
      this._kickReel();
      const progress = (i + 1) / plan.slowdownDelays.length;
      this.audio.slowdownTick(1.18 - progress * 0.42);
      if (progress > 0.55) this.audio.tensionPulse(progress);
      if (i >= plan.slowdownDelays.length - 3) {
        this.dom.marqueeText.textContent = tensionWords[i - (plan.slowdownDelays.length - 3)];
      }
      await sleep(plan.slowdownDelays[i]);
    }

    const fakeStopCount = rareType === 'suspicious' ? Math.max(2, plan.fakeStops) : plan.fakeStops;
    for (let i = 0; i < fakeStopCount; i++) {
      const fakeResult = i % 2 === 0 ? winner : loser;
      this._setReel(fakeResult);
      this._kickReel('reel-fake-stop');
      this.dom.game.classList.add('fake-stop-beat');
      this.dom.nearMissText.textContent = randomOf(NEAR_MISS_TEXTS);
      this.dom.nearMissText.classList.remove('hidden');
      this.dom.marqueeText.textContent = i === 0 ? 'WAIT...' : 'AIN\'T NO WAY';
      this.audio.fakeStop();
      await sleep(plan.fakeStopHoldMs + (rareType === 'suspicious' ? 90 : 0));
      this.dom.nearMissText.classList.add('hidden');
      this.dom.game.classList.remove('fake-stop-beat');

      if (i < fakeStopCount - 1) {
        reelName = fakeResult === AGRAELUS ? CHATTER : AGRAELUS;
        this._setReel(reelName);
        this._kickReel();
        this.audio.reelTick();
        await sleep(Math.max(65, plan.fakeStopHoldMs * 0.55));
      }
    }

    this._setReel(winner);
    this._kickReel('reel-fake-stop');
    this.dom.nearMissText.textContent = randomOf(NEAR_MISS_TEXTS);
    this.dom.nearMissText.classList.remove('hidden');
    this.dom.marqueeText.textContent = 'HOLD...';
    this.audio.tensionPulse(1);
    await sleep(plan.nearMissHoldMs);
    this.dom.nearMissText.classList.add('hidden');

    this.dom.game.classList.add('pre-result-silence');
    this.dom.marqueeText.textContent = '...';
    this._setRibbonSpeed('2.4s');
    await sleep(plan.silenceMs);

    this.dom.game.classList.remove('pre-result-silence');
    this.dom.game.classList.add('result-lock');
    this._setReel(loser);
    this._kickReel('reel-lock');
    this.audio.resultLock();
    this.onShake('shake-sm');
    await sleep(plan.resultLockHoldMs);

    await this._reveal(loser, winner, rareType, plan);
  }

  async _reveal(loser, winner, rareType, plan) {
    const overlay = this.dom.revealOverlay;
    const winnerClass = winner === AGRAELUS ? 'winner-agra' : 'winner-chat';
    const loserClass = loser === AGRAELUS ? 'loser-agra' : 'loser-chat';

    overlay.classList.remove('hidden', 'l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat');
    overlay.classList.add('dopamine-reveal', loserClass);
    this.dom.game.classList.remove('result-lock');
    this.dom.game.classList.add('loser-reveal');

    this.dom.revealL.classList.add('hidden');
    this.dom.revealWinner.classList.add('hidden');
    this.dom.revealRandomText.classList.add('hidden');
    this.dom.revealLoseText.classList.add('hidden');
    this.dom.continueButton.classList.add('hidden');

    this.dom.revealLoserName.textContent = `${loser.toUpperCase()} PLATÍ`;
    const loseTexts = loser === AGRAELUS ? AGRAELUS_LOSE_TEXTS : CHATTER_LOSE_TEXTS;
    this.dom.revealLoseText.textContent = randomOf(loseTexts);
    this.dom.revealLoseText.classList.remove('hidden');
    this.audio.tensionPulse(0.8);
    await sleep(plan.loserLeadMs);

    overlay.classList.add('l-hit');
    this.dom.revealL.classList.remove('hidden');
    this.audio.lImpact();
    this.onShake('shake-md');
    this.onFlash('reduced');
    await sleep(plan.lHoldMs);

    overlay.classList.add(winnerClass);
    this.dom.game.classList.remove('loser-reveal');
    this.dom.game.classList.add(winnerClass);
    this.dom.machine.classList.add('result-ready');
    this.dom.revealWinner.textContent = `${winner.toUpperCase()} WINS`;
    this.dom.revealWinner.classList.remove('hidden');
    this.audio.winnerBoom();
    if (rareType === 'ultra' || rareType === 'jackpot') this.audio.jackpotSiren();
    this.onShake(rareType === 'ultra' || rareType === 'jackpot' ? 'shake-lg' : 'shake-md');
    this.onFlash('full');

    const kind = winner === AGRAELUS ? 'agra' : 'chat';
    const firstBurst = rareType === 'ultra' || rareType === 'jackpot' ? 170 : 105;
    this.particles.burst(kind, firstBurst);
    setTimeout(() => this.particles.burst(kind, Math.round(firstBurst * 0.55)), 120);

    const winnerTexts = winner === AGRAELUS ? AGRAELUS_WIN_TEXTS : CHATTER_WIN_TEXTS;
    this.dom.revealRandomText.textContent = randomOf(winnerTexts);
    this.dom.revealRandomText.classList.remove('hidden');

    this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');
    setTimeout(() => {
      this.onShake('shake-sm');
      if (rareType === 'ultra' || rareType === 'jackpot') {
        this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');
      }
    }, 150);

    await sleep(Math.max(520, plan.winnerHoldMs * 0.55));

    this.dom.continueButton.classList.remove('hidden');
    this.dom.marqueeText.textContent = 'KLIKNI NEBO SPACE PRO POKRAČOVÁNÍ';
    this._setRibbonSpeed('1.7s');
  }

  clearReveal() {
    const overlay = this.dom.revealOverlay;
    overlay.classList.add('hidden');
    overlay.classList.remove('dopamine-reveal', 'l-hit', 'winner-agra', 'winner-chat', 'loser-agra', 'loser-chat');
    this.dom.continueButton.classList.add('hidden');
    this.dom.lights.classList.remove('on');
    this.dom.rareLabel.classList.add('hidden');
    this._clearSpinClasses();
    this.dom.marqueeText.textContent = 'SPACE TO GAMBA AGAIN';
    this._setRibbonSpeed('4.5s');
  }
}
