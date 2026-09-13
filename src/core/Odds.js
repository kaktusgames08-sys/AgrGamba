export function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// The engine historically stores Agraelus' chance to lose. The UI now speaks
// only in normal win chances, so keep the conversion in one explicit place.
export function agraelusWinChanceToLoseChance(winChance) {
  return 100 - clampPercent(winChance);
}

export function agraelusWinChanceFromLoseChance(loseChance) {
  return 100 - clampPercent(loseChance);
}

export function chatterWinChanceFromAgraelusWinChance(agraelusWinChance) {
  return 100 - clampPercent(agraelusWinChance);
}
