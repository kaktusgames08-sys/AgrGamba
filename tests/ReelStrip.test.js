import test from 'node:test';
import assert from 'node:assert/strict';
import { AGRAELUS, CHATTER } from '../src/core/SpinEngine.js';
import { createVerticalReelSequence } from '../src/ui/ReelStrip.js';

test('vertical reel sequence scrolls downward and lands on the requested loser', () => {
  const reel = createVerticalReelSequence(CHATTER, { cycles: 6, cellHeight: 126 });

  assert.equal(reel.direction, 'down');
  assert.ok(reel.travelPx > 0);
  assert.ok(reel.items.length >= 12);
  assert.equal(reel.items.at(-1), CHATTER);
  assert.equal(reel.finalName, CHATTER);

  for (let i = 1; i < reel.items.length; i += 1) {
    assert.notEqual(reel.items[i], reel.items[i - 1]);
  }
});

test('vertical reel sequence can land on Agraelus without changing the final result', () => {
  const reel = createVerticalReelSequence(AGRAELUS, { cycles: 5, cellHeight: 126 });
  assert.equal(reel.items.at(-1), AGRAELUS);
  assert.equal(reel.finalName, AGRAELUS);
});
