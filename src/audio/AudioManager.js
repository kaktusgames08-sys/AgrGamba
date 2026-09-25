const SAMPLE_LIBRARY = {
  coin: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1999/1999-preview.mp3',
    volume: 0.34,
  },
  coins: {
    url: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    volume: 0.28,
  },
  winAlert: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1931/1931-preview.mp3',
    volume: 0.26,
  },
  winAlarm: {
    url: 'https://assets.mixkit.co/active_storage/sfx/1995/1995-preview.mp3',
    volume: 0.18,
  },
  lose: {
    url: 'https://assets.mixkit.co/active_storage/sfx/240/240-preview.mp3',
    volume: 0.32,
  },
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.muted = localStorage.getItem('wheel-muted') === '1';
    this.masterVolume = 0.82;
    this.samples = new Map();
    this.preloadSamples();
  }

  preloadSamples() {
    for (const [name, config] of Object.entries(SAMPLE_LIBRARY)) {
      const audio = new Audio(config.url);
      audio.preload = 'auto';
      audio.volume = config.volume * this.masterVolume;
      this.samples.set(name, { audio, config, failed: false });

      audio.addEventListener('error', () => {
        const sample = this.samples.get(name);
        if (sample) sample.failed = true;
      }, { once: true });
    }
  }

  ensure() {
    if (this.muted) return null;

    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.ctx = new AudioContext();
      this.noiseBuffer = this.createNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  createNoiseBuffer() {
    if (!this.ctx) return null;

    const length = Math.max(1, Math.floor(this.ctx.sampleRate * 0.5));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    localStorage.setItem('wheel-muted', this.muted ? '1' : '0');

    return this.muted;
  }

  toggle() {
    return this.setMuted(!this.muted);
  }

  setMasterVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    return this.masterVolume;
  }

  playSample(name, { volume = 1, playbackRate = 1 } = {}) {
    if (this.muted || this.masterVolume <= 0) return;

    const sample = this.samples.get(name);
    if (!sample || sample.failed) return;

    try {
      const player = sample.audio.cloneNode();
      player.volume = Math.min(1, sample.config.volume * volume * this.masterVolume);
      player.playbackRate = playbackRate;
      player.play().catch(() => {});
    } catch {
      // Synth layers below keep the game audible if a remote sample is unavailable.
    }
  }

  tone({
    frequency = 440,
    duration = 0.08,
    gain = 0.045,
    type = 'sine',
    slideTo = null,
    attack = 0.006,
  }) {
    const ctx = this.ensure();
    if (!ctx || this.masterVolume <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const finalGain = Math.max(0.0001, gain * this.masterVolume);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    }

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(finalGain, now + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  noiseBurst({
    duration = 0.08,
    gain = 0.025,
    frequency = 1600,
    type = 'bandpass',
  } = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer || this.masterVolume <= 0) return;

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    const now = ctx.currentTime;

    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    filter.Q.setValueAtTime(0.8, now);
    amp.gain.setValueAtTime(gain * this.masterVolume, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }


  tick(speed = 1) {
    const s = Math.max(0.1, Math.min(1, speed));

    this.tone({
      frequency: 980 + s * 360,
      duration: 0.017 + (1 - s) * 0.014,
      gain: 0.004 + s * 0.0045,
      type: 'triangle',
      slideTo: 780 + s * 220,
      attack: 0.0015,
    });
  }

  spinStart() {
    this.noiseBurst({
      duration: 0.075,
      gain: 0.006,
      frequency: 2100,
      type: 'highpass',
    });

    this.tone({
      frequency: 320,
      slideTo: 560,
      duration: 0.11,
      gain: 0.012,
      type: 'triangle',
      attack: 0.002,
    });
  }

  anticipation(stage = 1) {
    const stages = [
      [220, 330],
      [277.18, 415.3],
      [329.63, 493.88],
    ];

    const [low, high] = stages[
      Math.max(0, Math.min(stages.length - 1, stage - 1))
    ];

    this.tone({
      frequency: low,
      slideTo: high,
      duration: 0.22,
      gain: 0.021,
      type: 'triangle',
      attack: 0.004,
    });

    setTimeout(() => {
      this.tone({
        frequency: high * 1.5,
        duration: 0.09,
        gain: 0.014,
        type: 'sine',
        attack: 0.003,
      });
    }, 70);
  }

  impact(strength = 'normal') {
    const heavy = strength === 'heavy';
    const gain = heavy ? 0.12 : strength === 'soft' ? 0.065 : 0.09;

    this.noiseBurst({
      duration: heavy ? 0.075 : 0.055,
      gain: heavy ? 0.052 : 0.038,
      frequency: heavy ? 1750 : 2100,
      type: 'bandpass',
    });

    this.tone({
      frequency: heavy ? 78 : 92,
      slideTo: heavy ? 38 : 48,
      duration: heavy ? 0.31 : 0.24,
      gain,
      type: 'sine',
      attack: 0.003,
    });

    setTimeout(() => {
      this.tone({
        frequency: heavy ? 720 : 610,
        slideTo: heavy ? 540 : 510,
        duration: 0.15,
        gain: heavy ? 0.055 : 0.045,
        type: 'triangle',
      });
    }, 24);
  }

  money(value = 10, tier = 'small') {
    this.playSample(value >= 50 ? 'coins' : 'coin', {
      volume: tier === 'big' ? 1.18 : 1,
      playbackRate: value >= 60 ? 1.04 : 1,
    });

    const base = 660 + Math.min(100, value) * 2.2;
    this.tone({
      frequency: base,
      duration: 0.11,
      gain: tier === 'big' ? 0.043 : 0.034,
      type: 'triangle',
    });

    setTimeout(() => {
      this.tone({
        frequency: base * 1.28,
        duration: tier === 'big' ? 0.23 : 0.18,
        gain: tier === 'big' ? 0.044 : 0.035,
        type: 'sine',
      });
    }, 70);
  }

  multiplier(multiplier) {
    this.playSample('winAlert', {
      volume: multiplier >= 3 ? 1.15 : 0.9,
      playbackRate: multiplier >= 3 ? 1.06 : 1,
    });

    if (multiplier >= 3) {
      setTimeout(() => {
        this.playSample('winAlarm', {
          volume: 0.7,
          playbackRate: 1.08,
        });
      }, 180);
    }

    const notes = multiplier >= 3
      ? [330, 440, 554.37, 659.25, 880]
      : [330, 440, 554.37, 740];

    notes.forEach((frequency, index) => {
      setTimeout(() => {
        this.tone({
          frequency,
          duration: 0.2,
          gain: 0.045,
          type: 'triangle',
        });
      }, index * 74);
    });
  }

  extraSpin() {
    this.playSample('coin', {
      volume: 0.6,
      playbackRate: 1.24,
    });

    this.tone({
      frequency: 620,
      duration: 0.08,
      gain: 0.026,
      type: 'triangle',
    });

    setTimeout(() => {
      this.tone({
        frequency: 930,
        duration: 0.15,
        gain: 0.035,
        type: 'sine',
      });
    }, 52);
  }

  lossFinale() {
    this.playSample('lose', {
      volume: 1.05,
      playbackRate: 0.94,
    });

    this.noiseBurst({
      duration: 0.16,
      gain: 0.025,
      frequency: 700,
      type: 'lowpass',
    });

    const notes = [220, 174.61, 146.83, 110];

    notes.forEach((frequency, index) => {
      setTimeout(() => {
        this.tone({
          frequency,
          slideTo: frequency * 0.86,
          duration: 0.34,
          gain: 0.045,
          type: 'triangle',
          attack: 0.01,
        });
      }, index * 145);
    });
  }
}
