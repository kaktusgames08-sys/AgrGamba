import test from 'node:test';
import assert from 'node:assert/strict';
import { extract7TVEmotes, pick7TVEmoteUrl } from '../src/integrations/SevenTV.js';

const response = {
  connections: [
    {
      emote_set: {
        emotes: [
          {
            id: 'abc',
            name: 'W',
            data: {
              host: {
                url: '//cdn.7tv.app/emote/abc',
                files: [
                  { name: '1x.webp' },
                  { name: '2x.webp' },
                ],
              },
            },
          },
        ],
      },
    },
  ],
};

test('extracts reaction emotes from the active 7TV emote set', () => {
  const emotes = extract7TVEmotes(response);
  assert.equal(emotes.length, 1);
  assert.equal(emotes[0].name, 'W');
});

test('prefers the 2x webp CDN file and fixes protocol-relative URLs', () => {
  const emote = extract7TVEmotes(response)[0];
  assert.equal(pick7TVEmoteUrl(emote), 'https://cdn.7tv.app/emote/abc/2x.webp');
});
