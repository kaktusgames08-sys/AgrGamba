export const SEVENTV_USER_ID = '01GM69WE7G0000YN3K7E3NDJKD';
const API_BASE = 'https://7tv.io/v3';

export function extract7TVEmotes(userResponse) {
  const seen = new Set();
  const result = [];
  for (const connection of userResponse?.connections ?? []) {
    for (const emote of connection?.emote_set?.emotes ?? []) {
      const id = emote?.id ?? emote?.data?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(emote);
    }
  }
  return result;
}

export function pick7TVEmoteUrl(emote) {
  const host = emote?.data?.host;
  if (!host?.url) return null;
  const files = host.files ?? [];
  const preferred = files.find((f) => f.name === '2x.webp')
    ?? files.find((f) => f.name === '1x.webp')
    ?? files.find((f) => String(f.name).endsWith('.webp'))
    ?? files[0];
  if (!preferred?.name) return null;
  const base = host.url.startsWith('//') ? `https:${host.url}` : host.url;
  return `${base}/${preferred.name}`;
}

export async function load7TVEmotes(userId = SEVENTV_USER_ID) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`7TV HTTP ${response.status}`);
  const user = await response.json();
  return extract7TVEmotes(user)
    .map((emote) => ({
      id: emote.id ?? emote.data?.id,
      name: emote.name ?? emote.data?.name ?? '7TV',
      url: pick7TVEmoteUrl(emote),
    }))
    .filter((emote) => emote.url);
}

export class SevenTVReactions {
  constructor(layer) {
    this.layer = layer;
    this.emotes = [];
    this.state = 'idle';
  }

  async load() {
    if (this.state === 'loading' || this.state === 'ready') return this.emotes;
    this.state = 'loading';
    try {
      this.emotes = await load7TVEmotes();
      this.state = this.emotes.length ? 'ready' : 'empty';
    } catch (error) {
      console.warn('7TV emotes unavailable, using text fallback.', error);
      this.state = 'error';
      this.emotes = [];
    }
    return this.emotes;
  }

  burst(count = 12, strength = 'normal') {
    if (!this.layer || !this.emotes.length) return false;
    const amount = Math.min(strength === 'big' ? 34 : 20, Math.max(1, count));
    for (let i = 0; i < amount; i += 1) {
      const emote = this.emotes[Math.floor(Math.random() * this.emotes.length)];
      const img = document.createElement('img');
      img.className = `seventv-reaction ${strength === 'big' ? 'big' : ''}`;
      img.src = emote.url;
      img.alt = emote.name;
      img.loading = 'eager';
      img.decoding = 'async';
      img.style.setProperty('--x', `${8 + Math.random() * 84}vw`);
      img.style.setProperty('--y', `${55 + Math.random() * 38}vh`);
      img.style.setProperty('--drift', `${-90 + Math.random() * 180}px`);
      img.style.setProperty('--rot', `${-22 + Math.random() * 44}deg`);
      img.style.setProperty('--delay', `${Math.random() * 140}ms`);
      this.layer.appendChild(img);
      setTimeout(() => img.remove(), 1900);
    }
    return true;
  }
}
