import { MAX_EXTRA_TURNS, MIN_FULL_TURNS } from './WheelConfig.js';

const UINT53_RANGE = 9007199254740992; // 2^53
const UINT26_RANGE = 67108864; // 2^26

export function secureRandom(cryptoSource = globalThis.crypto) {
  if (cryptoSource?.getRandomValues) {
    // Build one uniform 53-bit integer, matching the precision JavaScript
    // can safely represent. This gives a value in [0, 1) without a custom seed.
    const values = new Uint32Array(2);
    cryptoSource.getRandomValues(values);

    const high27 = values[0] >>> 5;
    const low26 = values[1] >>> 6;

    return (high27 * UINT26_RANGE + low26) / UINT53_RANGE;
  }

  // GitHub Pages/modern browsers expose Web Crypto. The fallback only keeps
  // the game usable in unusual/non-secure environments.
  return Math.random();
}

function clampRandom(value) {
  return Math.min(0.999999999999, Math.max(0, Number(value) || 0));
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeIndex(index, count) {
  return ((index % count) + count) % count;
}

export function pickSegmentIndex(segments, rng = secureRandom) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Wheel requires at least one segment.');
  }

  return Math.floor(clampRandom(rng()) * segments.length);
}

export function segmentAngle(segmentCount) {
  if (!Number.isInteger(segmentCount) || segmentCount <= 0) {
    throw new Error('segmentCount must be a positive integer.');
  }

  return 360 / segmentCount;
}

export function segmentIndexForRotation(rotation, segmentCount) {
  const slice = segmentAngle(segmentCount);
  return normalizeIndex(Math.round(-rotation / slice), segmentCount);
}

export function randomLandingRotation(
  currentRotation,
  segmentCount,
  rng = secureRandom,
  borderMarginRatio = 0.025,
) {
  const slice = segmentAngle(segmentCount);
  const marginRatio = Math.max(0, Math.min(0.22, Number(borderMarginRatio) || 0));
  const safeHalf = slice * (0.5 - marginRatio);
  const safeWidth = safeHalf * 2;

  // One continuous random position over the union of every safe segment interior.
  // Border strips are the only forbidden area, so the wheel never stops exactly
  // between two results while every physical segment keeps equal probability.
  const safePosition = clampRandom(rng()) * segmentCount * safeWidth;
  const index = Math.min(
    segmentCount - 1,
    Math.floor(safePosition / safeWidth),
  );
  const offset = safePosition - index * safeWidth - safeHalf;
  const targetAngle = index * slice + offset;

  const normalized = normalizeDegrees(currentRotation);
  const targetNormalized = normalizeDegrees(360 - targetAngle);
  const alignmentDelta = normalizeDegrees(targetNormalized - normalized);

  const extraTurns = Math.floor(
    clampRandom(rng()) * (MAX_EXTRA_TURNS + 1),
  );
  const turns = MIN_FULL_TURNS + extraTurns;
  const rotation = currentRotation + turns * 360 + alignmentDelta;

  return {
    rotation,
    index,
    targetAngle,
    offset,
    turns,
  };
}

// Kept for compatibility with older callers/tests. This still lands randomly
// inside the requested segment rather than snapping to the label center.
export function landingRotation(
  currentRotation,
  index,
  segmentCount,
  rng = secureRandom,
) {
  const slice = segmentAngle(segmentCount);
  const normalized = normalizeDegrees(currentRotation);
  const landingOffset = (clampRandom(rng()) * 2 - 1) * slice * 0.43;
  const targetAngle = index * slice + landingOffset;
  const targetNormalized = normalizeDegrees(360 - targetAngle);
  const alignmentDelta = normalizeDegrees(targetNormalized - normalized);

  const extraTurns = Math.floor(
    clampRandom(rng()) * (MAX_EXTRA_TURNS + 1),
  );
  const turns = MIN_FULL_TURNS + extraTurns;

  return currentRotation + turns * 360 + alignmentDelta;
}

export function easeOutQuint(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 5);
}
