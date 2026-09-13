import test from 'node:test';
import assert from 'node:assert/strict';
import { createSmoothReelMotion } from '../src/ui/ReelStrip.js';

test('smooth reel motion stays monotonic and never stalls before the result', () => {
  const motion = createSmoothReelMotion({
    startY: -4200,
    endY: 0,
    durationMs: 3000,
    samples: 180,
  });

  assert.equal(motion.positions.at(0), -4200);
  assert.equal(motion.positions.at(-1), 0);
  assert.equal(motion.durationMs, 3000);

  for (let i = 1; i < motion.positions.length; i += 1) {
    assert.ok(motion.positions[i] > motion.positions[i - 1], `position ${i} must keep moving downward`);
  }
});

test('smooth reel motion decelerates naturally without fake-stop plateaus', () => {
  const motion = createSmoothReelMotion({ startY: -5000, endY: 0, durationMs: 2800, samples: 140 });
  const deltas = motion.positions.slice(1).map((value, index) => value - motion.positions[index]);

  assert.ok(deltas[0] > deltas.at(-1));
  assert.ok(deltas.every((delta) => delta > 0));
  assert.equal(motion.hasFakeStops, false);
  assert.equal(motion.variant, 'clean');
});
