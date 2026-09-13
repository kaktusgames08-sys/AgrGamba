import test from 'node:test';
import assert from 'node:assert/strict';
import { CHATTER } from '../src/core/SpinEngine.js';
import { createVerticalReelSequence } from '../src/ui/ReelStrip.js';

test('physical reel keeps one continuous strip and exposes a pixel-perfect near miss', () => {
  const reel = createVerticalReelSequence(CHATTER, {
    cycles: 14,
    cellHeight: 150,
    nearMissPx: 7,
  });

  assert.equal(reel.direction, 'down');
  assert.equal(reel.finalName, CHATTER);
  assert.equal(reel.renderedItems[0], CHATTER);
  assert.ok(reel.startY < reel.cruiseY);
  assert.ok(reel.cruiseY < reel.nearMissY);
  assert.ok(reel.nearMissY < reel.settleY);
  assert.equal(reel.settleY, 0);
  assert.equal(reel.nearMissY, -143);
  assert.equal(reel.nearMissOffsetPx, 7);
  assert.equal(reel.instant, false);
});

test('near miss can sit only a few pixels away from the opposite nick', () => {
  const reel = createVerticalReelSequence(CHATTER, {
    cycles: 12,
    cellHeight: 126,
    nearMissPx: 4,
  });

  assert.equal(reel.nearMissY, -122);
  assert.ok(reel.nearMissOffsetPx >= 2 && reel.nearMissOffsetPx <= 10);
});
