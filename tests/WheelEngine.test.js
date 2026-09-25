import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRotation, pickSegmentIndex, segmentAngle } from '../src/core/WheelEngine.js';

const segments = Array.from({ length: 18 }, (_, index) => ({ index }));

test('pickSegmentIndex maps equal slices uniformly by index', () => {
  assert.equal(pickSegmentIndex(segments, () => 0), 0);
  assert.equal(pickSegmentIndex(segments, () => 0.5), 9);
  assert.equal(pickSegmentIndex(segments, () => 0.999999), 17);
});

test('landingRotation aligns requested segment with top pointer', () => {
  const slice = segmentAngle(18);
  const target = landingRotation(0, 5, 18, () => 0);
  const normalized = ((target % 360) + 360) % 360;
  const expected = (360 - 5 * slice) % 360;
  assert.ok(Math.abs(normalized - expected) < 1e-9);
  assert.ok(target >= 7 * 360);
});
