import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HARDCORE_STARTING_SPINS,
  HARDCORE_MAX_PAYOUT,
  HARDCORE_MONEY_SEGMENTS,
  HARDCORE_MULTIPLIER_SEGMENTS,
} from '../src/core/HardcoreConfig.js';

test('hardcore mode is exactly three spins with no respins', () => {
  assert.equal(HARDCORE_STARTING_SPINS, 3);
  assert.ok(HARDCORE_MONEY_SEGMENTS.every((segment) => segment.extraSpins === 0));
  assert.ok(HARDCORE_MULTIPLIER_SEGMENTS.every((segment) => segment.extraSpins === 0));
});

test('hardcore money wheel starts at 150 Kč', () => {
  const values = HARDCORE_MONEY_SEGMENTS.map((segment) => segment.value);
  assert.ok(values.every((value) => value >= 150));
  assert.equal(Math.min(...values), 150);
});

test('hardcore theoretical payout cannot exceed 5000 Kč', () => {
  const maxMoney = Math.max(...HARDCORE_MONEY_SEGMENTS.map((segment) => segment.value));
  const maxMultiplier = Math.max(...HARDCORE_MULTIPLIER_SEGMENTS.map((segment) => segment.multiplier));
  const theoreticalMax = (maxMoney * 2) * maxMultiplier;

  assert.equal(HARDCORE_MAX_PAYOUT, 5000);
  assert.equal(theoreticalMax, HARDCORE_MAX_PAYOUT);
});

test('hardcore multiplier wheel contains multiplier-only finale fields', () => {
  assert.ok(HARDCORE_MULTIPLIER_SEGMENTS.every((segment) => segment.type === 'multiplier'));
  assert.ok(HARDCORE_MULTIPLIER_SEGMENTS.every((segment) => segment.subLabel === 'FINÁLE'));
});
