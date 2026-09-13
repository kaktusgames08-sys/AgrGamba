import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createVerticalReelSequence(
  finalName,
  { cycles = 18, cellHeight = 126 } = {},
) {
  const safeCycles = Math.max(8, Math.floor(cycles));
  const safeCellHeight = Math.max(1, Math.round(cellHeight));

  const items = [];
  let current = finalName === AGRAELUS ? CHATTER : AGRAELUS;

  for (let i = 0; i < safeCycles * 2; i += 1) {
    items.push(current);
    current = current === AGRAELUS ? CHATTER : AGRAELUS;
  }

  if (items.at(-1) !== finalName) {
    items.push(finalName);
  }

  const renderedItems = [...items].reverse();
  const travelPx = Math.max(safeCellHeight, (renderedItems.length - 1) * safeCellHeight);

  return {
    direction: 'down',
    finalName,
    items,
    renderedItems,
    cellHeight: safeCellHeight,
    travelPx,
    startY: -travelPx,
    settleY: 0,
    instant: false,
  };
}

export function createSmoothReelMotion({
  startY,
  endY = 0,
  durationMs = 3000,
  samples = 180,
  easingPower = 3.15,
} = {}) {
  const start = Number(startY) || 0;
  const end = Number(endY) || 0;
  const duration = Math.max(250, Number(durationMs) || 3000);
  const count = Math.max(2, Math.floor(samples));
  const power = clamp(Number(easingPower) || 3.15, 1.8, 5);
  const distance = end - start;

  const positions = Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    const eased = 1 - Math.pow(1 - t, power);
    const value = start + distance * eased;
    if (index === 0) return start;
    if (index === count) return end;
    return value;
  });

  return {
    variant: 'clean',
    hasFakeStops: false,
    startY: start,
    endY: end,
    durationMs: duration,
    easingPower: power,
    positions,
  };
}
