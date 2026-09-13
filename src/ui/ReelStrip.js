import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createVerticalReelSequence(
  finalName,
  { cycles = 14, cellHeight = 126, nearMissPx = 6 } = {},
) {
  const safeCycles = Math.max(6, Math.floor(cycles));
  const safeCellHeight = Math.max(1, Math.round(cellHeight));
  const safeNearMissPx = clamp(Math.round(nearMissPx), 2, Math.min(10, safeCellHeight - 2));

  const items = [];
  let current = finalName === AGRAELUS ? CHATTER : AGRAELUS;

  for (let i = 0; i < safeCycles * 2; i += 1) {
    items.push(current);
    current = current === AGRAELUS ? CHATTER : AGRAELUS;
  }

  if (items.at(-1) !== finalName) {
    items.push(finalName);
  }

  // Render the strip in reverse. The requested loser is the first cell, but the
  // track starts far above it and physically scrolls downward until y = 0.
  // This lets the same DOM strip stay alive for the entire spin.
  const renderedItems = [...items].reverse();
  const travelPx = Math.max(safeCellHeight, (renderedItems.length - 1) * safeCellHeight);

  // Leave enough cells for a proper slowdown before the final two positions.
  const cruiseCellsFromFinish = Math.min(
    renderedItems.length - 3,
    Math.max(7, Math.round(safeCycles * 0.65)),
  );
  const cruiseY = -(cruiseCellsFromFinish * safeCellHeight);

  // Index 1 is always the opposite nick. Stopping a handful of pixels away
  // from its exact alignment creates the "o milimetr" near miss without ever
  // swapping the mathematically chosen result.
  const nearMissY = -safeCellHeight + safeNearMissPx;

  return {
    direction: 'down',
    finalName,
    items,
    renderedItems,
    cellHeight: safeCellHeight,
    travelPx,
    startY: -travelPx,
    cruiseY,
    nearMissY,
    nearMissOffsetPx: safeNearMissPx,
    settleY: 0,
    instant: false,
  };
}
