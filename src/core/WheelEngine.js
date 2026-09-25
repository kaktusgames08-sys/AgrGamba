import { MAX_EXTRA_TURNS, MIN_FULL_TURNS } from './WheelConfig.js';

export function pickSegmentIndex(segments, rng = Math.random) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Wheel requires at least one segment.');
  }
  const value = Math.min(0.999999999999, Math.max(0, rng()));
  return Math.floor(value * segments.length);
}

export function segmentAngle(segmentCount) {
  if (!Number.isInteger(segmentCount) || segmentCount <= 0) {
    throw new Error('segmentCount must be a positive integer.');
  }
  return 360 / segmentCount;
}

export function landingRotation(currentRotation, index, segmentCount, rng = Math.random) {
  const slice = segmentAngle(segmentCount);
  const normalized = ((currentRotation % 360) + 360) % 360;

  // Pick a real landing position inside the already-selected segment instead of
  // snapping every result to its exact center. Keeping a small safety margin
  // avoids ambiguous border landings while still allowing convincing close calls.
  const landingRandom = Math.min(0.999999999999, Math.max(0, rng()));
  const maxOffset = slice * 0.44;
  const landingOffset = (landingRandom * 2 - 1) * maxOffset;

  const targetAngle = index * slice + landingOffset;
  const targetNormalized = ((360 - targetAngle) % 360 + 360) % 360;
  const alignmentDelta = (targetNormalized - normalized + 360) % 360;

  const turnRandom = Math.min(0.999999999999, Math.max(0, rng()));
  const extraTurns = Math.floor(turnRandom * (MAX_EXTRA_TURNS + 1));
  const turns = MIN_FULL_TURNS + extraTurns;

  return currentRotation + turns * 360 + alignmentDelta;
}

export function easeOutQuint(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 5);
}
