import test from 'node:test';
import assert from 'node:assert/strict';

import { Leaderboard } from '../src/ui/Leaderboard.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }
}

test('default leaderboard contains all seeded results and sorts by loss', () => {
  const leaderboard = new Leaderboard({
    mount: null,
    storage: new MemoryStorage(),
  });

  assert.equal(leaderboard.entries.length, 18);
  assert.deepEqual(leaderboard.entries[0], {
    name: 'potisengage',
    loss: 4658,
    streak: 44,
  });

  assert.ok(leaderboard.entries.some((entry) =>
    entry.name === 'JimmySliipek'
      && entry.loss === 1170
      && entry.streak === 14
  ));

  assert.ok(leaderboard.entries.some((entry) =>
    entry.name === 'Zasr_nyCartman'
      && entry.loss === 1430
      && entry.streak === 18
  ));

  assert.equal(
    leaderboard.entries.filter((entry) => entry.name === 'potisengage').length,
    5,
  );
});

test('leaderboard keeps more than ten entries', () => {
  const entries = Array.from({ length: 18 }, (_, index) => ({
    name: 'player-' + index,
    loss: 1000 - index,
    streak: index + 1,
  }));

  const leaderboard = new Leaderboard({
    mount: null,
    storage: new MemoryStorage(),
  });

  leaderboard.setEntries(entries);

  assert.equal(leaderboard.entries.length, 18);
});
