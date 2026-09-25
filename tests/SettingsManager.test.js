import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  SettingsManager,
  normalizeSettings,
} from '../src/core/SettingsManager.js';

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

  removeItem(key) {
    this.map.delete(key);
  }
}

test('normalizeSettings keeps a playable wheel with at least one ending segment', () => {
  const input = {
    segments: Array.from({ length: 6 }, (_, index) => ({
      type: 'money',
      value: (index + 1) * 10,
      extraSpins: 1,
      tone: 'amber',
    })),
    startingSpins: 2,
    spinDurationMs: 4600,
    masterVolume: 0.5,
    effects: 'medium',
  };

  const settings = normalizeSettings(input);

  assert.equal(settings.segments.length, 6);
  assert.equal(settings.startingSpins, 2);
  assert.equal(settings.spinDurationMs, 4600);
  assert.equal(settings.masterVolume, 0.5);
  assert.equal(settings.effects, 'medium');
  assert.ok(settings.segments.some((segment) => segment.extraSpins === 0));
});

test('SettingsManager persists custom wheel settings', () => {
  const storage = new MemoryStorage();
  const manager = new SettingsManager(storage);

  const custom = manager.save({
    ...DEFAULT_SETTINGS,
    startingSpins: 3,
    spinDurationMs: 4100,
    masterVolume: 0.64,
    showHistory: false,
  });

  const reloaded = new SettingsManager(storage).get();

  assert.equal(custom.startingSpins, 3);
  assert.equal(reloaded.startingSpins, 3);
  assert.equal(reloaded.spinDurationMs, 4100);
  assert.equal(reloaded.masterVolume, 0.64);
  assert.equal(reloaded.showHistory, false);
});
