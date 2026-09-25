import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRotation, pickSegmentIndex, segmentAngle } from '../src/core/WheelEngine.js';

const segments = Array.from({ length: 18 }, (_, index) => ({ index }));

test('pickSegmentIndex maps equal slices uniformly by index', () => {
  assert.equal(pickSegmentIndex(segments, () => 0), 0);
  assert.equal(pickSegmentIndex(segments, () => 0.5), 9);
  assert.equal(pickSegmentIndex(segments, () => 0.999999), 17);
});

test('landingRotation lands inside requested segment with randomized offset', () => {
  const slice = segmentAngle(18);
  const values = [0.5, 0];
  const target = landingRotation(0, 5, 18, () => values.shift());
  const normalized = ((target % 360) + 360) % 360;
  const expectedCenter = (360 - 5 * slice) % 360;

  assert.ok(Math.abs(normalized - expectedCenter) < 1e-9);
  assert.ok(target >= 7 * 360);
});

test('landingRotation can create close calls without crossing segment borders', () => {
  const slice = segmentAngle(18);

  const nearLeftValues = [0, 0];
  const nearLeft = landingRotation(0, 5, 18, () => nearLeftValues.shift());
  const leftNormalized = ((360 - (nearLeft % 360)) % 360 + 360) % 360;
  const leftOffset = leftNormalized - 5 * slice;

  const nearRightValues = [0.999999, 0];
  const nearRight = landingRotation(0, 5, 18, () => nearRightValues.shift());
  const rightNormalized = ((360 - (nearRight % 360)) % 360 + 360) % 360;
  const rightOffset = rightNormalized - 5 * slice;

  assert.ok(leftOffset > -slice / 2);
  assert.ok(rightOffset < slice / 2);
  assert.ok(Math.abs(leftOffset) > slice * 0.4);
  assert.ok(Math.abs(rightOffset) > slice * 0.4);
});
