// Local CC0 foley + original synthesized wheel/casino cues. See AUDIO-CREDITS.md.
const SAMPLES = {
  chips: 'chips-handle-2',
  drop: 'chips-stack-1',
  click: 'click_001',
  confirm: 'confirmation_001',
  end: 'bong_001',
};

const BASE = import.meta.env?.BASE_URL ?? '/';

function safeStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export class AudioManager {
  constructor({
    storage = safeStorage(),
    contextFactory,
    fetcher = globalThis.fetch?.bind(globalThis),
  } = {}) {
    this.storage = storage;
    this.contextFactory = contextFactory ?? (() => {
      const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      return Context ? new Context() : null;
    });
    this.fetcher = fetcher;
    this.ctx = null;
    this.master = null;
    this.masterVolume = 0.7;
    this.ambienceVolume = 0;
    this.muted = false;
    this.buffers = new Map();
    this.voices = new Set();
    this.ambient = [];
    this.loading = false;
    this.lastTick = 0;
    this.spinNoiseBuffer = null;
    this.spinBed = null;

    try {
      this.muted = storage?.getItem('wheel-muted') === '1';
    } catch {
      // Optional storage.
    }
  }

  ensure() {
    if (this.muted) return null;

    try {
      if (!this.ctx) {
        this.ctx = this.contextFactory();
        if (!this.ctx) return null;

        this.master = this.ctx.createGain();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 12;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.12;

        this.master.gain.value = this.masterVolume;
        this.master.connect(compressor).connect(this.ctx.destination);

        this.spinNoiseBuffer = this.createSpinNoiseBuffer();
        this.loadSamples();
        this.startAmbience();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume()?.catch?.(() => {});
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  createSpinNoiseBuffer() {
    if (!this.ctx?.createBuffer) return null;

    try {
      const sampleRate = Number(this.ctx.sampleRate) || 44100;
      const length = Math.max(1, Math.floor(sampleRate * 0.8));
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let previous = 0;

      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * 0.86 + white * 0.14;
        data[i] = previous * 0.72;
      }

      return buffer;
    } catch {
      return null;
    }
  }

  async loadSamples() {
    if (this.loading || !this.fetcher || !this.ctx) return;
    this.loading = true;

    await Promise.allSettled(
      Object.entries(SAMPLES).map(async ([key, name]) => {
        const response = await this.fetcher(BASE + 'audio/' + name + '.ogg');
        if (!response.ok) return;

        const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(key, buffer);
      }),
    );
  }

  configure(settings) {
    this.setMasterVolume(settings.masterVolume);
    this.setAmbience(settings.ambienceVolume ?? 0);
  }

  setMasterVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));

    if (this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.02,
      );
    }

    return this.masterVolume;
  }

  setMuted(value) {
    this.muted = Boolean(value);

    if (this.muted) this.silence();
    else if (this.ctx) this.startAmbience();

    if (this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.008,
      );
    }

    try {
      this.storage?.setItem('wheel-muted', this.muted ? '1' : '0');
    } catch {
      // Optional storage.
    }

    return this.muted;
  }

  toggle() {
    return this.setMuted(!this.muted);
  }

  silence() {
    this.stopSpinBed(true);

    for (const source of [...this.voices]) {
      try {
        source.stop();
      } catch {
        // Already ended.
      }
    }

    this.voices.clear();
    this.stopAmbience();
  }

  track(source, gain) {
    while (this.voices.size >= 16) {
      const oldest = this.voices.values().next().value;
      this.voices.delete(oldest);

      try {
        oldest.stop();
      } catch {
        // Already ended.
      }
    }

    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
  }

  tone({
    frequency = 440,
    duration = 0.14,
    gain = 0.05,
    type = 'sine',
    slideTo = null,
    attack = 0.008,
    delay = 0,
  } = {}) {
    const ctx = this.ensure();
    if (!ctx || this.masterVolume <= 0) return;

    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const now = ctx.currentTime + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);

      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, slideTo),
          now + duration,
        );
      }

      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, gain),
        now + Math.min(attack, duration / 2),
      );
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(amp).connect(this.master);
      this.track(osc, amp);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    } catch {
      // Audio must never interrupt a draw.
    }
  }

  playSample(name, {
    volume = 0.4,
    playbackRate = 1,
    delay = 0,
  } = {}) {
    const ctx = this.ensure();
    const buffer = this.buffers.get(name);

    if (!ctx || !buffer || this.masterVolume <= 0) return false;

    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      gain.gain.value = volume;

      source.connect(gain).connect(this.master);
      this.track(source, gain);
      source.start(ctx.currentTime + delay);
      return true;
    } catch {
      return false;
    }
  }

  startSpinBed() {
    const ctx = this.ensure();

    if (
      !ctx
      || this.spinBed
      || !this.spinNoiseBuffer
      || typeof ctx.createBufferSource !== 'function'
      || typeof ctx.createBiquadFilter !== 'function'
    ) {
      return;
    }

    try {
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      source.buffer = this.spinNoiseBuffer;
      source.loop = true;
      source.playbackRate.value = 0.78;

      filter.type = 'bandpass';
      filter.frequency.value = 680;
      filter.Q.value = 0.72;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.012, now + 0.08);

      source.connect(filter).connect(gain).connect(this.master);
      this.spinBed = { source, filter, gain };

      source.onended = () => {
        if (this.spinBed?.source === source) this.spinBed = null;

        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Already disconnected.
        }
      };

      source.start(now);
    } catch {
      this.spinBed = null;
    }
  }

  spinMotion(speed = 1, anticipation = 0) {
    const bed = this.spinBed;
    if (!bed || !this.ctx) return;

    const s = Math.max(0, Math.min(1, Number(speed) || 0));
    const tension = Math.max(0, Math.min(1, Number(anticipation) || 0));
    const now = this.ctx.currentTime;

    try {
      bed.source.playbackRate.setTargetAtTime(0.55 + s * 0.65, now, 0.04);
      bed.filter.frequency.setTargetAtTime(
        260 + s * 1450 + tension * 180,
        now,
        0.04,
      );
      bed.gain.gain.setTargetAtTime(
        0.0035 + s * 0.015 + tension * 0.002,
        now,
        0.045,
      );
    } catch {
      // A browser may dispose the source during visibility changes.
    }
  }

  stopSpinBed(immediate = false) {
    const bed = this.spinBed;
    if (!bed || !this.ctx) return;

    this.spinBed = null;

    try {
      const now = this.ctx.currentTime;

      if (immediate) {
        bed.source.stop();
      } else {
        bed.gain.gain.cancelScheduledValues(now);
        bed.gain.gain.setValueAtTime(
          Math.max(0.0001, Number(bed.gain.gain.value) || 0.0001),
          now,
        );
        bed.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        bed.source.stop(now + 0.13);
      }
    } catch {
      // Already stopped.
    }
  }

  click() {
    if (!this.playSample('click', { volume: 0.32 })) {
      this.tone({
        frequency: 520,
        duration: 0.035,
        gain: 0.024,
        type: 'triangle',
      });
    }
  }

  tick(speed = 1) {
    const now = performance.now();
    if (now - this.lastTick < 34) return;

    this.lastTick = now;
    const s = Math.max(0, Math.min(1, speed));
    const slowWeight = 1 - s;

    // Pointer-on-peg ratchet: a tiny sharp click plus a lower wooden clack.
    // Both are synthesized so the wheel never sounds like chips, cards or dice.
    this.tone({
      frequency: 1650 + s * 420,
      slideTo: 860 + s * 260,
      duration: 0.014 + slowWeight * 0.006,
      gain: 0.007 + slowWeight * 0.006,
      type: 'triangle',
      attack: 0.001,
    });

    if (slowWeight > 0.28) {
      this.tone({
        frequency: 520 + s * 110,
        slideTo: 290 + s * 80,
        duration: 0.022,
        gain: 0.004 + slowWeight * 0.004,
        type: 'square',
        attack: 0.001,
      });
    }
  }

  spinStart() {
    this.stopSpinBed(true);
    this.startSpinBed();

    // Physical wheel launch: cabinet/body thump + a short axle/air lift.
    // No casino prop samples are used here.
    this.tone({
      frequency: 78,
      slideTo: 43,
      duration: 0.2,
      gain: 0.065,
      type: 'sine',
      attack: 0.002,
    });

    this.tone({
      frequency: 230,
      slideTo: 520,
      duration: 0.13,
      gain: 0.013,
      type: 'triangle',
      attack: 0.0015,
      delay: 0.015,
    });

    this.tone({
      frequency: 980,
      slideTo: 460,
      duration: 0.055,
      gain: 0.006,
      type: 'triangle',
      attack: 0.001,
      delay: 0.02,
    });
  }

  anticipation(stage = 1) {
    const index = Math.max(0, Math.min(2, stage - 1));
    const low = [110, 138.59, 164.81][index];
    const high = [440, 523.25, 659.25][index];

    this.tone({
      frequency: low,
      slideTo: low * 1.18,
      duration: 0.34,
      gain: 0.026 + index * 0.003,
      type: 'sine',
      attack: 0.01,
    });

    this.tone({
      frequency: high,
      duration: 0.09,
      gain: 0.009 + index * 0.002,
      type: 'triangle',
      delay: 0.06,
      attack: 0.002,
    });
  }

  impact(strength = 'normal') {
    const heavy = strength === 'heavy';

    // Final pointer clack + wheel/cabinet body hit. Fully synthesized.
    this.tone({
      frequency: heavy ? 1280 : 1460,
      slideTo: heavy ? 520 : 650,
      duration: heavy ? 0.055 : 0.042,
      gain: heavy ? 0.027 : 0.019,
      type: 'triangle',
      attack: 0.001,
    });

    this.tone({
      frequency: heavy ? 88 : 112,
      slideTo: heavy ? 42 : 58,
      duration: heavy ? 0.25 : 0.17,
      gain: heavy ? 0.082 : 0.052,
      type: 'sine',
      attack: 0.002,
      delay: 0.008,
    });

    this.tone({
      frequency: heavy ? 390 : 470,
      slideTo: heavy ? 210 : 280,
      duration: 0.075,
      gain: heavy ? 0.014 : 0.009,
      type: 'square',
      attack: 0.001,
      delay: 0.004,
    });
  }

  money(value, tier = 'small') {
    this.playSample('chips', {
      volume: tier === 'big' ? 0.72 : tier === 'medium' ? 0.52 : 0.36,
      playbackRate: tier === 'big' ? 0.96 : 1,
    });

    const notes = tier === 'big'
      ? [523.25, 659.25, 783.99, 1046.5]
      : tier === 'medium'
        ? [523.25, 659.25, 783.99]
        : [523.25, 659.25];

    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: tier === 'big' ? 0.3 : 0.22,
        gain: tier === 'big' ? 0.038 : 0.028,
        delay: index * 0.075,
        type: index % 2 ? 'sine' : 'triangle',
      });
    });

    this.playSample('drop', {
      volume: tier === 'big' ? 0.42 : 0.3,
      delay: 0.19,
      playbackRate: value >= 75 ? 1.04 : 0.98,
    });
  }

  multiplier(value = 2) {
    const notes = value >= 2
      ? [392, 523.25, 659.25, 783.99, 1046.5]
      : [392, 523.25, 659.25];

    notes.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.38,
        gain: 0.042,
        delay: index * 0.095,
        type: index % 2 ? 'sine' : 'triangle',
      });
    });

    this.playSample('confirm', {
      volume: 0.52,
      delay: 0.24,
      playbackRate: value >= 2 ? 1.12 : 0.94,
    });
  }

  extraSpin() {
    this.tone({
      frequency: 1046.5,
      slideTo: 1318.5,
      duration: 0.11,
      gain: 0.019,
      type: 'triangle',
      attack: 0.002,
    });
  }

  wheelSwitch() {
    // Quick mechanical sweep used when Hardcore swaps to its multiplier wheel.
    this.tone({
      frequency: 180,
      slideTo: 620,
      duration: 0.16,
      gain: 0.018,
      type: 'triangle',
      attack: 0.002,
    });

    this.tone({
      frequency: 72,
      slideTo: 50,
      duration: 0.18,
      gain: 0.032,
      type: 'sine',
      attack: 0.003,
      delay: 0.05,
    });
  }

  cashOut() {
    this.playSample('confirm', {
      volume: 0.55,
      playbackRate: 0.94,
    });

    [392, 523.25, 659.25].forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.42,
        gain: 0.035,
        delay: index * 0.09,
        type: index === 0 ? 'triangle' : 'sine',
      });
    });

    this.tone({
      frequency: 92,
      slideTo: 64,
      duration: 0.32,
      gain: 0.04,
      type: 'sine',
    });
  }

  lossFinale() {
    this.playSample('end', {
      volume: 0.72,
      playbackRate: 0.9,
    });

    [220, 174.61, 130.81, 98].forEach((frequency, index) => {
      this.tone({
        frequency,
        slideTo: frequency * 0.82,
        duration: 0.62,
        gain: 0.045,
        delay: index * 0.13,
        type: index === 3 ? 'sine' : 'triangle',
        attack: 0.01,
      });
    });
  }

  milestone() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: 0.6,
        gain: 0.038,
        delay: index * 0.13,
      });
    });
  }

  preview() {
    this.spinStart();
    this.spinMotion(0.82);

    setTimeout(() => {
      this.spinMotion(0.38, 0.35);
      this.tick(0.38);
    }, 220);

    setTimeout(() => {
      this.spinMotion(0.12, 0.8);
      this.tick(0.12);
    }, 430);

    setTimeout(() => {
      this.stopSpinBed();
      this.impact('normal');
    }, 650);
  }

  setAmbience(value) {
    this.ambienceVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.stopAmbience();

    if (this.ctx && !this.muted) this.startAmbience();
  }

  startAmbience() {
    if (
      !this.ctx
      || this.muted
      || this.ambienceVolume <= 0
      || this.ambient.length
    ) {
      return;
    }

    try {
      [130.81, 196, 261.63].forEach((frequency, index) => {
        const source = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        source.type = 'sine';
        source.frequency.value = frequency + (index - 1) * 0.18;
        gain.gain.value = this.ambienceVolume * 0.014;

        source.connect(gain).connect(this.master);
        source.start();
        this.ambient.push({ source, gain });
      });
    } catch {
      this.stopAmbience();
    }
  }

  stopAmbience() {
    for (const { source, gain } of this.ambient) {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {
        // Stopped.
      }
    }

    this.ambient = [];
  }
}
