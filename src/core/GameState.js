import { STARTING_SPINS } from './WheelConfig.js';

export class GameState {
  constructor(startingSpins = STARTING_SPINS) {
    this.startingSpins = this.normalizeStartingSpins(startingSpins);
    this.reset();
  }

  normalizeStartingSpins(value) {
    return Math.max(1, Math.min(10, Math.round(Number(value) || STARTING_SPINS)));
  }

  setStartingSpins(value) {
    this.startingSpins = this.normalizeStartingSpins(value);
  }

  reset() {
    this.total = 0;
    this.spins = this.startingSpins;
    this.history = [];
    this.phase = 'ready';
    this.spinCount = 0;
  }

  canSpin() {
    return this.phase === 'ready' && this.spins > 0;
  }

  beginSpin() {
    if (!this.canSpin()) return false;
    this.spins -= 1;
    this.spinCount += 1;
    this.phase = 'spinning';
    return true;
  }

  resolve(segment) {
    if (this.phase !== 'spinning') {
      throw new Error('Cannot resolve a spin that is not active.');
    }

    const before = this.total;

    if (segment.type === 'money') {
      this.total += segment.value ?? 0;
    } else if (segment.type === 'multiplier') {
      this.total *= segment.multiplier ?? 1;
    } else {
      throw new Error('Unknown segment type: ' + segment.type);
    }

    this.spins += segment.extraSpins ?? 0;

    const record = {
      label: segment.label,
      type: segment.type,
      value: segment.value ?? null,
      multiplier: segment.multiplier ?? null,
      extraSpins: segment.extraSpins ?? 0,
      before,
      after: this.total,
      spinNumber: this.spinCount,
    };

    this.history.unshift(record);
    this.history = this.history.slice(0, 7);
    this.phase = this.spins > 0 ? 'ready' : 'ended';
    return record;
  }

  isEnded() {
    return this.phase === 'ended';
  }
}
