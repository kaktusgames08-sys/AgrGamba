const STORAGE_KEY = 'gamba.settings.v1';

export const DEFAULT_SETTINGS = {
  agraelusLoseChance: 50, // Chatter's win chance
  turbo: false,
  degenerate: false,
  masterVolume: 80,
  musicVolume: 60,
  sfxVolume: 90,
  muted: false,
  showOdds: false,
  streamerMode: false,
  flash: 'full', // off | reduced | full
  particles: 'insane', // low | normal | insane
  shakeIntensity: 100,
};

export const PRESETS = [
  { id: 'fair', label: 'FAIR', agraelusLoseChance: 50 },
  { id: 'agra-advantage', label: 'AGRA ADVANTAGE', agraelusLoseChance: 30 },
  { id: 'chat-advantage', label: 'CHAT ADVANTAGE', agraelusLoseChance: 70 },
  { id: 'agra-propaganda', label: 'AGRA PROPAGANDA', agraelusLoseChance: 10 },
  { id: 'chat-revolution', label: 'CHAT REVOLUTION', agraelusLoseChance: 90 },
  { id: 'pure-gamba', label: 'PURE GAMBA', agraelusLoseChance: 50 },
];

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS, ...this._load() };
    this._applyUrlParams();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      /* storage unavailable, silently ignore */
    }
  }

  _applyUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('agraLose')) {
      const v = Number(params.get('agraLose'));
      if (!Number.isNaN(v)) this.settings.agraelusLoseChance = clamp(v);
    } else if (params.has('agraWin')) {
      // explicitly distinct from loss-chance params, per spec section 39
      const v = Number(params.get('agraWin'));
      if (!Number.isNaN(v)) this.settings.agraelusLoseChance = clamp(100 - v);
    }

    if (params.has('turbo')) this.settings.turbo = params.get('turbo') === '1';
    if (params.has('mute')) this.settings.muted = params.get('mute') === '1';
    if (params.has('streamer')) this.settings.streamerMode = params.get('streamer') === '1';

    this.save();
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  update(partial) {
    Object.assign(this.settings, partial);
    this.save();
  }

  get chatterLoseChance() {
    return 100 - this.settings.agraelusLoseChance;
  }

  isPureGamba() {
    return this.settings.agraelusLoseChance === 50;
  }

  spinDurationMs() {
    if (this.settings.degenerate) return randRange(500, 800);
    if (this.settings.turbo) return randRange(1000, 1500);
    return randRange(2000, 4000);
  }
}

function clamp(v) {
  return Math.min(100, Math.max(0, v));
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}
