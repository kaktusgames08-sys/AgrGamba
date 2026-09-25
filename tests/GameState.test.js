import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';

test('money + spin continues the game', () => {
  const state = new GameState();
  assert.equal(state.beginSpin(), true);
  state.resolve({ label: '20 Kč + SPIN', type: 'money', value: 20, extraSpins: 1 });
  assert.equal(state.total, 20);
  assert.equal(state.spins, 1);
  assert.equal(state.phase, 'ready');
});

test('multiplier applies to current total and returns a spin', () => {
  const state = new GameState();
  state.total = 40;
  state.beginSpin();
  state.resolve({ label: 'x3 + SPIN', type: 'multiplier', multiplier: 3, extraSpins: 1 });
  assert.equal(state.total, 120);
  assert.equal(state.spins, 1);
});

test('100 Kč without extra spin ends the game', () => {
  const state = new GameState();
  state.beginSpin();
  state.resolve({ label: '100 Kč', type: 'money', value: 100, extraSpins: 0 });
  assert.equal(state.total, 100);
  assert.equal(state.spins, 0);
  assert.equal(state.phase, 'ended');
});
