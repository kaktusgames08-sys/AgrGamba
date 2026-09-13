import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpinPlan } from '../src/ui/SpinPresentation.js';

const fixedRandom = () => 0.5;

test('normal spin has a real tension beat before the result', () => {
  const plan = createSpinPlan(3000, 'normal', fixedRandom);

  assert.ok(plan.fakeStops >= 1, 'normal mode should include at least one fake stop');
  assert.ok(plan.silenceMs >= 150, 'normal mode should include a noticeable silence beat');
  assert.ok(plan.nearMissHoldMs >= 180, 'near miss needs time to read as a fake result');
});

test('slowdown ticks get progressively slower', () => {
  const plan = createSpinPlan(3000, 'normal', fixedRandom);

  assert.ok(plan.slowdownDelays.length >= 6);
  for (let i = 1; i < plan.slowdownDelays.length; i++) {
    assert.ok(
      plan.slowdownDelays[i] > plan.slowdownDelays[i - 1],
      `tick ${i} should be slower than tick ${i - 1}`,
    );
  }
});

test('short spins keep the drama without becoming longer than the mode', () => {
  const turbo = createSpinPlan(1300, 'normal', fixedRandom);
  const degenerate = createSpinPlan(700, 'normal', fixedRandom);

  assert.ok(turbo.silenceMs < 150);
  assert.ok(degenerate.silenceMs <= 100);
  assert.ok(degenerate.fakeStops <= 1);
  assert.ok(degenerate.slowdownDelays.length < turbo.slowdownDelays.length);
});
