import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  SettingsManager,
  applyPresentationPreset,
  migrateBalancedExits,
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


test('presentation presets map to predictable effect profiles', () => {
  const clean = applyPresentationPreset(DEFAULT_SETTINGS, 'clean');
  const arcade = applyPresentationPreset(DEFAULT_SETTINGS, 'arcade');
  const max = applyPresentationPreset(DEFAULT_SETTINGS, 'max');

  assert.equal(clean.presentationPreset, 'clean');
  assert.equal(clean.effects, 'low');
  assert.equal(clean.ambientMotion, false);

  assert.equal(arcade.presentationPreset, 'arcade');
  assert.equal(arcade.effects, 'medium');
  assert.equal(arcade.ambientMotion, true);

  assert.equal(max.presentationPreset, 'max');
  assert.equal(max.effects, 'high');
  assert.equal(max.ambientMotion, true);
});

test('normalizeSettings keeps explicit v4 presentation preset', () => {
  const settings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    presentationPreset: 'arcade',
    effects: 'medium',
  });

  assert.equal(settings.presentationPreset, 'arcade');
  assert.equal(settings.effects, 'medium');
});


test('default wheel has two 100 Kč exit segments', () => {
  const exits = DEFAULT_SETTINGS.segments.filter((segment) =>
    segment.type === 'money'
      && segment.value === 100
      && segment.extraSpins === 0
  );

  assert.equal(exits.length, 2);
});

test('legacy v4 wheel with one exit is migrated to two 100 Kč exits', () => {
  const oldSegments = DEFAULT_SETTINGS.segments.map((segment, index) =>
    index === 15
      ? {
          label: '75 Kč + SPIN',
          type: 'money',
          value: 75,
          extraSpins: 1,
          tone: 'orange',
        }
      : segment
  );

  const migrated = migrateBalancedExits({
    ...DEFAULT_SETTINGS,
    segments: oldSegments,
  });

  const exits = migrated.segments.filter((segment) =>
    segment.type === 'money'
      && Number(segment.value) === 100
      && Number(segment.extraSpins) === 0
  );

  assert.equal(exits.length, 2);
  assert.equal(migrated.segments[15].value, 100);
  assert.equal(migrated.segments[15].extraSpins, 0);
});

test('SettingsManager automatically migrates stored v4 balance once', () => {
  const storage = new MemoryStorage();
  const legacy = {
    ...DEFAULT_SETTINGS,
    segments: DEFAULT_SETTINGS.segments.map((segment, index) =>
      index === 15
        ? {
            label: '75 Kč + SPIN',
            type: 'money',
            value: 75,
            extraSpins: 1,
            tone: 'orange',
          }
        : segment
    ),
  };

  storage.setItem('kolo-nestesti-settings-v4', JSON.stringify(legacy));

  const loaded = new SettingsManager(storage).get();
  const exits = loaded.segments.filter((segment) =>
    segment.type === 'money'
      && segment.value === 100
      && segment.extraSpins === 0
  );

  assert.equal(exits.length, 2);
  assert.ok(storage.getItem('kolo-nestesti-settings-v4.1'));
});
