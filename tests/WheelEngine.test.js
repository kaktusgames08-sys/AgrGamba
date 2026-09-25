import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickSegmentIndex,
  randomLandingRotation,
  segmentAngle,
  segmentIndexForRotation,
} from '../src/core/WheelEngine.js';

const segments = Array.from({ length: 18 }, (_, index) => ({ index }));

test('pickSegmentIndex maps equal slices uniformly by index', () => {
  assert.equal(pickSegmentIndex(segments, () => 0), 0);
  assert.equal(pickSegmentIndex(segments, () => 0.5), 9);
  assert.equal(pickSegmentIndex(segments, () => 0.999999), 17);
});

test('randomLandingRotation produces a valid segment from the physical stop angle', () => {
  const values = [0.5, 0];
  const landing = randomLandingRotation(0, 18, () => values.shift());

  assert.equal(
    segmentIndexForRotation(landing.rotation, 18),
    landing.index,
  );
  assert.ok(landing.rotation >= 7 * 360);
});

test('random landing never stops in forbidden border strips', () => {
  const slice = segmentAngle(18);
  const safeHalf = slice * 0.475;
  const samples = [0, 0.01, 0.125, 0.499, 0.5, 0.875, 0.999999];

  for (const sample of samples) {
    const values = [sample, 0];
    const landing = randomLandingRotation(0, 18, () => values.shift());

    assert.ok(Math.abs(landing.offset) <= safeHalf + 1e-9);
    assert.ok(Math.abs(landing.offset) < slice / 2);
    assert.equal(
      segmentIndexForRotation(landing.rotation, 18),
      landing.index,
    );
  }
});

test('safe random space gives every physical segment the same width', () => {
  const seen = new Set();

  for (let i = 0; i < 18; i += 1) {
    const sample = (i + 0.5) / 18;
    const values = [sample, 0];
    const landing = randomLandingRotation(0, 18, () => values.shift());
    seen.add(landing.index);
  }

  assert.equal(seen.size, 18);
});


test('random landing allows very close calls while keeping a tiny border gap', () => {
  const slice = segmentAngle(18);
  const values = [0, 0];
  const landing = randomLandingRotation(0, 18, () => values.shift());
  const distanceToBorder = slice / 2 - Math.abs(landing.offset);

  assert.ok(distanceToBorder > 0);
  assert.ok(distanceToBorder < slice * 0.03);
});
