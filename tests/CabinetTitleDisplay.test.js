import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('cabinet contains a dedicated ADHD title display', () => {
  assert.match(html, /id="machineTitleDisplay"/);
  assert.match(html, /class="machine-title-main">KDO PLATÍ\?<\/div>/);
  assert.match(html, /class="machine-title-kicker">GAMBA SYSTEM<\/div>/);
});
