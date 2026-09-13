import test from 'node:test';
import assert from 'node:assert/strict';
import { agraelusWinChanceToLoseChance, chatterWinChanceFromAgraelusWinChance } from '../src/core/Odds.js';

test('UI win chance converts to the existing loser-based engine chance', () => {
  assert.equal(agraelusWinChanceToLoseChance(70), 30);
  assert.equal(agraelusWinChanceToLoseChance(0), 100);
  assert.equal(agraelusWinChanceToLoseChance(100), 0);
});

test('Chatter win chance is always the complement of Agraelus win chance', () => {
  assert.equal(chatterWinChanceFromAgraelusWinChance(70), 30);
  assert.equal(chatterWinChanceFromAgraelusWinChance(50), 50);
});
