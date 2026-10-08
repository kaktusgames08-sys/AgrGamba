import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../src/core/SessionManager.js';
import { DEFAULT_SETTINGS } from '../src/core/SettingsManager.js';

import * as preview from '../src/dev/PreviewMode.js';
const storage = () => {
  const data = new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
};

test('only the explicit Showtime development URL enables the new presentation', () => {
  assert.equal(typeof preview.isDevPreview, 'function');
  assert.equal(preview.isDevPreview('?dev=showtime'), true);
  assert.equal(preview.isDevPreview('?other=1&dev=showtime'), true);
  for (const search of ['', '?obs=1', '?dev=1', '?dev=false', '?dev=showtime-extra', '?dev=showtime&dev=no']) {
    assert.equal(preview.isDevPreview(search), false, search);
  }
});

test('preview settings and audio cannot read, overwrite or remove normal data', () => {
  assert.equal(typeof preview.previewStorage, 'function');
  const normal = storage();
  normal.setItem('settings', 'normal');
  const dev = preview.previewStorage(normal);
  assert.equal(dev.getItem('settings'), null);
  dev.setItem('settings', 'development');
  assert.equal(normal.getItem('settings'), 'normal');
  assert.equal(dev.getItem('settings'), 'development');
  dev.removeItem('settings');
  assert.equal(normal.getItem('settings'), 'normal');
  assert.equal(dev.getItem('settings'), null);
});

test('development spins and reloads never change the main archive or active series', () => {
  assert.equal(typeof preview.previewStorage, 'function');
  const normal = storage();
  const main = new SessionManager(DEFAULT_SETTINGS, normal);
  main.setPlayer('Main player');
  main.play(0);
  const before = normal.getItem('kolo-nestesti-studio-v1');
  const dev = new SessionManager(DEFAULT_SETTINGS, preview.previewStorage(normal));
  dev.setPlayer('Dev player');
  dev.play(3);
  assert.equal(dev.result().name, 'Dev player');
  assert.equal(normal.getItem('kolo-nestesti-studio-v1'), before);
  const restored = new SessionManager(DEFAULT_SETTINGS, preview.previewStorage(normal));
  assert.equal(restored.state.total, 100);
  assert.equal(restored.result().name, 'Dev player');
  const restoredMain = new SessionManager(DEFAULT_SETTINGS, normal);
  assert.equal(restoredMain.player, 'Main player');
  assert.equal(restoredMain.state.total, 40);
  assert.equal(restoredMain.active(), true);
});

test('an unavailable store stays unavailable instead of exposing normal data', () => {
  assert.equal(typeof preview.previewStorage, 'function');
  assert.equal(preview.previewStorage(null), null);
  const blocked = {getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  const scoped = preview.previewStorage(blocked);
  assert.throws(()=>scoped.getItem('settings'), /blocked/);
  assert.throws(()=>scoped.setItem('settings', 'x'), /blocked/);
});
