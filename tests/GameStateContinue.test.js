import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';

test('completed spin waits for explicit continue before another spin is allowed', () => {
  const state = new GameState();
  state.beginSpin();
  state.endSpin({ loser: 'Agraelus', winner: 'Chatter' });

  assert.equal(state.canSpin(), false);
  assert.equal(state.canContinue(), true);

  state.continue();
  assert.equal(state.canContinue(), false);
  assert.equal(state.canSpin(), true);
});
