import { AGRAELUS, CHATTER, otherOf } from '../core/SpinEngine.js';
import {
  AGRAELUS_WIN_TEXTS, CHATTER_WIN_TEXTS,
  AGRAELUS_LOSE_TEXTS, CHATTER_LOSE_TEXTS,
  NEAR_MISS_TEXTS, CHAT_SPAM_WIN, CHAT_SPAM_LOSE,
  randomOf,
} from './Texts.js';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const rand = (min, max) => min + Math.random() * (max - min);

// Rare presentation flavors — cosmetic only, never touch the RNG result.
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

  async playSpin(result, durationMs) {
    const { loser, winner } = result;
    const rareType = rollRareType();
    this.dom.lights.classList.add('on');
    this.dom.nearMissText.classList.add('hidden');
    this.dom.rareLabel.classList.add('hidden');

    if (rareType === 'fakeCrash') {
      this.dom.marqueeText.textContent = 'ERROR';
      await sleep(220);
      this.dom.marqueeText.textContent = 'nah';
      await sleep(260);
    }

    if (rareType === 'instant') {
      this._setReel(loser);
      this.audio.reelTick();
      await sleep(120);
      this.dom.marqueeText.textContent = 'BONK';
      this.onShake('shake-sm');
      await sleep(90);
      await this._reveal(loser, winner, rareType);
      return;
    }

    this.dom.rareLabel.textContent = rareType === 'ultra' ? 'HOLY FUCK' : rareType === 'jackpot' ? 'JACKPOT — still worth absolutely nothing' : '';
    if (this.dom.rareLabel.textContent) this.dom.rareLabel.classList.remove('hidden');

    // --- chaos phase ---
    const chaosMs = durationMs * 0.45;
    const slowMs = durationMs * (rareType === 'suspicious' ? 0.30 : 0.4);
    let elapsed = 0;
    let interval = rareType === 'ultra' ? 35 : 45;
    const chaosEnd = performance.now() + chaosMs;
    while (performance.now() < chaosEnd) {
      this._setReel(Math.random() > 0.5 ? AGRAELUS : CHATTER);
      this.audio.reelTick();
      if (rareType === 'ultra') this.onShake('shake-sm');
      await sleep(interval);
      elapsed += interval;
    }

    // --- slowdown phase ---
    const ticks = 5 + Math.floor(Math.random() * 3);
    let tickDelay = 70;
    for (let i = 0; i < ticks; i++) {
      this._setReel(Math.random() > 0.5 ? AGRAELUS : CHATTER);
      this.audio.slowdownTick(1 - i * 0.05);
      tickDelay += slowMs / ticks * 0.5;
      await sleep(tickDelay);
    }

    if (rareType === 'suspicious') {
      this._setReel(winner); // shows the *winner* sitting on the reel, teasing a flip
      this.dom.marqueeText.textContent = 'uh...';
      await sleep(500);
    }

    // --- near miss ---
    const nearMissCandidate = winner; // tease landing on winner (i.e. loser would be the *other* side)
    this._setReel(nearMissCandidate);
    this.dom.nearMissText.textContent = randomOf(NEAR_MISS_TEXTS);
    this.dom.nearMissText.classList.remove('hidden');
    await sleep(rand(120, 220));
    this.dom.nearMissText.classList.add('hidden');

    // silence beat
    await sleep(rand(100, 200));

    // --- tick: flips to the true loser ---
    this._setReel(loser);
    this.audio.nearStopTick();
    this.onShake('shake-sm');

    await this._reveal(loser, winner, rareType);
  }

  async _reveal(loser, winner, rareType) {
    const overlay = this.dom.revealOverlay;
    overlay.classList.remove('hidden');
    this.dom.revealL.classList.add('hidden');
    this.dom.revealWinner.classList.add('hidden');
    this.dom.revealRandomText.classList.add('hidden');
    this.dom.revealLoseText.classList.add('hidden');

    this.dom.revealLoserName.textContent = `${loser.toUpperCase()} TAKES THE L`;
    const loseTexts = loser === AGRAELUS ? AGRAELUS_LOSE_TEXTS : CHATTER_LOSE_TEXTS;
    this.dom.revealLoseText.textContent = randomOf(loseTexts);
    this.dom.revealLoseText.classList.remove('hidden');
    await sleep(220);

    this.dom.revealL.classList.remove('hidden');
    this.audio.lImpact();
    this.onShake('shake-md');
    this.onFlash('reduced');
    await sleep(280);

    this.dom.revealWinner.textContent = `${winner.toUpperCase()} WINS`;
    this.dom.revealWinner.classList.remove('hidden');
    this.audio.winnerBoom();
    if (rareType === 'ultra' || rareType === 'jackpot') this.audio.jackpotSiren();
    this.onShake(rareType === 'ultra' || rareType === 'jackpot' ? 'shake-lg' : 'shake-md');
    this.onFlash('full');

    const kind = winner === AGRAELUS ? 'agra' : 'chat';
    this.particles.burst(kind, rareType === 'ultra' || rareType === 'jackpot' ? 120 : 70);

    const winnerTexts = winner === AGRAELUS ? AGRAELUS_WIN_TEXTS : CHATTER_WIN_TEXTS;
    this.dom.revealRandomText.textContent = randomOf(winnerTexts);
    this.dom.revealRandomText.classList.remove('hidden');

    this.chatSpam.burst(winner === AGRAELUS ? 'agra-win' : 'chat-win');

    await sleep(900);
    overlay.classList.add('hidden');
    this.dom.lights.classList.remove('on');
    this.dom.marqueeText.textContent = 'SPACE TO GAMBA AGAIN';
  }
}
