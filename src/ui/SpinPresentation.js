import '../audio/DopamineAudio.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (from, to, t) => from + (to - from) * t;
const range = (min, max, random) => min + (max - min) * clamp01(random());

export function createSpinPlan(durationMs, rareType = 'normal', random = Math.random) {
  const duration = Math.max(450, Number(durationMs) || 3000);
  const degenerate = duration <= 900;
  const turbo = !degenerate && duration <= 1700;
  const ultra = rareType === 'ultra' || rareType === 'jackpot';
  const heartbeat = rareType === 'heartbeat';
  const reverse = rareType === 'reverse';

  const tickCount = degenerate ? 4 : turbo ? 6 : heartbeat ? 9 : 8;
  const firstDelay = degenerate ? 42 : turbo ? 52 : 62;
  const finalDelay = degenerate ? 92 : turbo ? 145 : ultra ? 245 : heartbeat ? 255 : 225;
  const slowdownDelays = Array.from({ length: tickCount }, (_, index) => {
    const t = tickCount === 1 ? 1 : index / (tickCount - 1);
    return Math.round(lerp(firstDelay, finalDelay, Math.pow(t, 1.65)));
  });

  let fakeStops;
  if (degenerate) fakeStops = random() < 0.4 ? 1 : 0;
  else if (turbo) fakeStops = 1;
  else if (reverse) fakeStops = 2;
  else fakeStops = 1 + (random() < (ultra ? 0.7 : 0.45) ? 1 : 0);

  const baseFakeStop = Math.round(degenerate ? range(70, 95, random) : turbo ? range(105, 135, random) : range(155, 215, random));

  return {
    variant: rareType,
    duration,
    chaosMs: Math.round(duration * (degenerate ? 0.30 : turbo ? 0.36 : heartbeat ? 0.34 : 0.42)),
    chaosIntervalMs: ultra ? 28 : degenerate ? 34 : heartbeat ? 52 : 40,
    slowdownDelays,
    fakeStops,
    fakeStopHoldMs: reverse ? baseFakeStop + 170 : baseFakeStop,
    nearMissHoldMs: Math.round(degenerate ? range(90, 115, random) : turbo ? range(135, 165, random) : heartbeat ? range(240, 300, random) : range(200, 250, random)),
    silenceMs: Math.round(degenerate ? range(72, 96, random) : turbo ? range(112, 142, random) : heartbeat ? range(190, 240, random) : range(170, 215, random)),
    heartbeatPulses: heartbeat ? (degenerate ? 2 : turbo ? 3 : 4) : 0,
    resultLockHoldMs: Math.round(degenerate ? 55 : turbo ? 80 : 105),
    loserLeadMs: Math.round(degenerate ? 70 : turbo ? 105 : 145),
    lHoldMs: Math.round(degenerate ? 145 : turbo ? 190 : 245),
    winnerHoldMs: Math.round(degenerate ? 520 : turbo ? 650 : ultra ? 980 : 820),
  };
}
