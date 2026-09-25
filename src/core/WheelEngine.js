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
  const targetNormalized = ((360 - index * slice) % 360 + 360) % 360;
  const alignmentDelta = (targetNormalized - normalized + 360) % 360;
  const extraTurns = Math.floor(Math.min(0.999999999999, Math.max(0, rng())) * (MAX_EXTRA_TURNS + 1));
  const turns = MIN_FULL_TURNS + extraTurns;
  return currentRotation + turns * 360 + alignmentDelta;
}

export function easeOutQuint(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 5);
}
