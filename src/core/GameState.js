// GameState — ephemeral, in-memory only. Holds what's happening *right now*.
// Persisted data (settings, stats) lives in SettingsManager / StatsManager.
export class GameState {
  constructor() {
    this.isSpinning = false;
    this.hasStarted = false;
    this.awaitingContinue = false;
    this.lastResult = null; // { loser, winner }
  }

  canSpin() {
    return !this.isSpinning && !this.awaitingContinue;
  }

  beginSpin() {
    this.isSpinning = true;
    this.hasStarted = true;
    this.awaitingContinue = false;
  }

  endSpin(result) {
    this.isSpinning = false;
    this.awaitingContinue = true;
    this.lastResult = result;
  }

  canContinue() {
    return !this.isSpinning && this.awaitingContinue;
  }

  continue() {
    this.awaitingContinue = false;
  }
}
