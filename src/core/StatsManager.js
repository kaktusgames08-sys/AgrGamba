import { AGRAELUS, CHATTER, otherOf } from './SpinEngine.js';

const STORAGE_KEY = 'gamba.stats.v1';

const DEFAULT_STATS = {
  spins: 0,
  wins: { [AGRAELUS]: 0, [CHATTER]: 0 },
  losses: { [AGRAELUS]: 0, [CHATTER]: 0 },
  currentStreakWinner: null,
  currentStreakCount: 0,
  bestStreak: { [AGRAELUS]: 0, [CHATTER]: 0 },
  history: [], // { loser, winner } most recent first, capped at 10
};

export class StatsManager {
  constructor() {
    this.stats = this._merge(DEFAULT_STATS, this._load());
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _merge(base, loaded) {
    return {
      ...base,
      ...loaded,
      wins: { ...base.wins, ...(loaded.wins || {}) },
      losses: { ...base.losses, ...(loaded.losses || {}) },
      bestStreak: { ...base.bestStreak, ...(loaded.bestStreak || {}) },
      history: loaded.history || [],
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch {
      /* ignore */
    }
  }

  /** Record a completed spin result and update wins/losses/streak/history. */
  record({ loser, winner }) {
    const s = this.stats;
    s.spins += 1;
    s.wins[winner] += 1;
    s.losses[loser] += 1;

    if (s.currentStreakWinner === winner) {
      s.currentStreakCount += 1;
    } else {
      s.currentStreakWinner = winner;
      s.currentStreakCount = 1;
    }
    if (s.currentStreakCount > s.bestStreak[winner]) {
      s.bestStreak[winner] = s.currentStreakCount;
    }

    s.history.unshift({ loser, winner });
    if (s.history.length > 10) s.history.length = 10;

    this.save();
    return this.snapshot();
  }

  snapshot() {
    const s = this.stats;
    return {
      spins: s.spins,
      wins: { ...s.wins },
      losses: { ...s.losses },
      currentStreakWinner: s.currentStreakWinner,
      currentStreakCount: s.currentStreakCount,
      bestStreak: { ...s.bestStreak },
      history: [...s.history],
    };
  }

  reset() {
    this.stats = JSON.parse(JSON.stringify(DEFAULT_STATS));
    this.save();
    return this.snapshot();
  }
}

export { AGRAELUS, CHATTER, otherOf };
