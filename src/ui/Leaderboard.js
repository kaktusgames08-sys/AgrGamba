const DEFAULT_ENTRIES = [
  {
    name: 'jerusalemcrusader',
    loss: 1975,
    streak: 18,
  },
  {
    name: 'fkroupic',
    loss: 180,
    streak: 8,
  },
];

export class Leaderboard {
  constructor({
    mount = document.querySelector('#leaderboardList'),
    storage = globalThis.localStorage,
    storageKey = 'kolo-nestesti-loss-leaderboard-v1',
  } = {}) {
    this.mount = mount;
    this.storage = storage;
    this.storageKey = storageKey;
    this.entries = this.load();
    this.render();
  }

  load() {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      if (!raw) return structuredClone(DEFAULT_ENTRIES);

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        return structuredClone(DEFAULT_ENTRIES);
      }

      return parsed
        .map((entry) => ({
          name: String(entry?.name || 'hráč').slice(0, 32),
          loss: Math.max(0, Math.round(Number(entry?.loss) || 0)),
          streak: Math.max(0, Math.round(Number(entry?.streak) || 0)),
        }))
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 10);
    } catch {
      return structuredClone(DEFAULT_ENTRIES);
    }
  }

  save() {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch {
      // Optional local persistence only.
    }
  }

  setEntries(entries) {
    if (!Array.isArray(entries)) return;
    this.entries = entries
      .map((entry) => ({
        name: String(entry?.name || 'hráč').slice(0, 32),
        loss: Math.max(0, Math.round(Number(entry?.loss) || 0)),
        streak: Math.max(0, Math.round(Number(entry?.streak) || 0)),
      }))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 10);
    this.save();
    this.render();
  }

  medal(rank) {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return String(rank + 1);
  }

  render() {
    if (!this.mount) return;

    this.mount.innerHTML = this.entries.map((entry, index) => {
      const safeName = entry.name
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

      return [
        '<div class="leaderboard__item" style="--board-delay:' + (index * 45) + 'ms">',
        '<span class="leaderboard__rank" aria-label="Pořadí ' + (index + 1) + '">' + this.medal(index) + '</span>',
        '<div class="leaderboard__copy">',
        '<strong>' + safeName + '</strong>',
        '<span>' + entry.streak + ' série zatočení</span>',
        '</div>',
        '<b>' + entry.loss + ' Kč</b>',
        '</div>',
      ].join('');
    }).join('');
  }
}
