// SpinEngine — PURE LOGIC ONLY.
// No DOM access, no audio, no CSS, no animation timing.
// The result of a spin is determined exactly once, at the moment the spin
// starts. Nothing that happens afterwards (animation, near-miss, rare
// presentations) may change it.
//
// Core rule (see README): the reel shows the LOSER, not the winner.
//   REEL RESULT = LOSER
//   AGRAELUS on reel  -> Agraelus loses -> Chatter wins
//   CHATTER  on reel  -> Chatter loses  -> Agraelus wins

export const AGRAELUS = 'Agraelus';
export const CHATTER = 'Chatter';

/**
 * Run one spin.
 * @param {number} agraelusLoseChance 0-100, chance that Agraelus takes the L.
 * @param {() => number} rng optional injectable RNG (0-1), defaults to Math.random.
 * @returns {{ loser: string, winner: string, roll: number }}
 */
export function spin(agraelusLoseChance, rng = Math.random) {
  const clamped = Math.min(100, Math.max(0, agraelusLoseChance));
  const roll = rng() * 100;
  const loser = roll < clamped ? AGRAELUS : CHATTER;
  const winner = loser === AGRAELUS ? CHATTER : AGRAELUS;
  return { loser, winner, roll };
}

export function otherOf(name) {
  return name === AGRAELUS ? CHATTER : AGRAELUS;
}
