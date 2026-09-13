import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatMachineResult } from '../src/ui/ResultDisplay.js';

test('formats the in-machine result display in Czech', () => {
  assert.deepEqual(
    formatMachineResult({ loser: 'Chatter', winner: 'Agraelus' }),
    {
      payer: 'CHATTER PLATÍ',
      winner: 'AGRAELUS VYHRÁVÁ',
      tone: 'agra',
    },
  );
});

test('main HTML contains an integrated result display and no fullscreen result overlay', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /id="resultDisplay"/);
  assert.match(html, /id="resultPayer"/);
  assert.match(html, /id="resultWinner"/);
  assert.match(html, /id="continueButton"/);
  assert.doesNotMatch(html, /id="revealOverlay"/);
});
