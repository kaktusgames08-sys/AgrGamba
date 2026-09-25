import {
  WHEEL_SEGMENTS,
  STARTING_SPINS,
  SPIN_DURATION_MS,
} from './WheelConfig.js';

const STORAGE_KEY = 'kolo-nestesti-settings-v3';

export const TONE_OPTIONS = [
  'amber',
  'violet',
  'blue',
  'red',
  'purple',
  'green',
  'orange',
  'cyan',
  'pink',
  'final',
];

const EFFECT_LEVELS = new Set(['low', 'medium', 'high']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function makeSegmentLabel(segment) {
  if (segment.type === 'multiplier') {
    return 'x' + segment.multiplier + (segment.extraSpins ? ' + SPIN' : '');
  }
  return segment.value + ' Kč' + (segment.extraSpins ? ' + SPIN' : '');
}

export function normalizeSegment(segment, index = 0) {
  const type = segment?.type === 'multiplier' ? 'multiplier' : 'money';
  const tone = TONE_OPTIONS.includes(segment?.tone)
    ? segment.tone
    : TONE_OPTIONS[index % (TONE_OPTIONS.length - 1)];

  const normalized = {
    type,
    extraSpins: Number(segment?.extraSpins) > 0 ? 1 : 0,
    tone,
  };

  if (type === 'multiplier') {
    normalized.multiplier = Math.max(2, Math.min(10, Math.round(Number(segment?.multiplier) || 2)));
  } else {
    normalized.value = Math.max(0, Math.min(100000, Math.round(Number(segment?.value) || 0)));
  }

  normalized.finale = normalized.extraSpins === 0;
  normalized.label = makeSegmentLabel(normalized);
  return normalized;
}

export function normalizeSettings(input = {}) {
  const rawSegments = Array.isArray(input.segments) ? input.segments.slice(0, 24) : [];
  const segments = (rawSegments.length >= 6 ? rawSegments : clone(WHEEL_SEGMENTS))
    .map((segment, index) => normalizeSegment(segment, index));

  if (!segments.some((segment) => segment.extraSpins === 0)) {
    const last = segments[segments.length - 1];
    last.extraSpins = 0;
    last.finale = true;
    last.label = makeSegmentLabel(last);
  }

  return {
    segments,
    startingSpins: Math.max(1, Math.min(10, Math.round(Number(input.startingSpins) || STARTING_SPINS))),
    spinDurationMs: Math.max(3200, Math.min(8000, Math.round(Number(input.spinDurationMs) || SPIN_DURATION_MS))),
    masterVolume: Math.max(0, Math.min(1, Number.isFinite(Number(input.masterVolume)) ? Number(input.masterVolume) : 0.82)),
    effects: EFFECT_LEVELS.has(input.effects) ? input.effects : 'high',
    ambientMotion: input.ambientMotion !== false,
    showHistory: input.showHistory !== false,
  };
}

export const DEFAULT_SETTINGS = normalizeSettings({
  segments: WHEEL_SEGMENTS,
  startingSpins: STARTING_SPINS,
  spinDurationMs: SPIN_DURATION_MS,
  masterVolume: 0.82,
  effects: 'high',
  ambientMotion: true,
  showHistory: true,
});

export class SettingsManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.settings = this.load();
  }

  load() {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_SETTINGS);
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return clone(DEFAULT_SETTINGS);
    }
  }

  get() {
    return clone(this.settings);
  }

  save(next) {
    this.settings = normalizeSettings(next);
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage may be unavailable in restricted browser sources.
    }
    return this.get();
  }

  reset() {
    this.settings = clone(DEFAULT_SETTINGS);
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Ignore restricted storage environments.
    }
    return this.get();
  }
}
