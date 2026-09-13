import { AGRAELUS, CHATTER } from '../core/SpinEngine.js';

export function createVerticalReelSequence(finalName, { cycles = 8, cellHeight = 126 } = {}) {
  const safeCycles = Math.max(2, Math.floor(cycles));
  const items = [];
  let current = finalName === AGRAELUS ? CHATTER : AGRAELUS;

  for (let i = 0; i < safeCycles * 2; i += 1) {
    items.push(current);
    current = current === AGRAELUS ? CHATTER : AGRAELUS;
  }

  if (items.at(-1) !== finalName) {
    items.push(finalName);
  }

  return {
    direction: 'down',
    finalName,
    items,
    cellHeight,
    travelPx: Math.max(cellHeight, (items.length - 1) * cellHeight),
  };
}
