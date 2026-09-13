// GameState — ephemeral, in-memory only. Holds what's happening *right now*.
// Persisted data (settings, stats) lives in SettingsManager / StatsManager.
export class GameState {
  constructor() {
    this.isSpinning = false;
    this.hasStarted = false;
    this.lastResult = null; // { loser, winner }
  }

  canSpin() {
    return !this.isSpinning;
  }

  beginSpin() {
    this.isSpinning = true;
    this.hasStarted = true;
  }

  endSpin(result) {
    this.isSpinning = false;
    this.lastResult = result;
  }
}
