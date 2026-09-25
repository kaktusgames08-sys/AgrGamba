export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('wheel-muted') === '1';
  }

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    localStorage.setItem('wheel-muted', this.muted ? '1' : '0');
    return this.muted;
  }

  toggle() {
    return this.setMuted(!this.muted);
  }

  tone({ frequency = 440, duration = 0.08, gain = 0.045, type = 'sine', detune = 0, slideTo = null }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.detune.setValueAtTime(detune, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  tick(speed = 1) {
    this.tone({ frequency: 680 + Math.min(1, speed) * 260, duration: 0.035, gain: 0.022, type: 'square' });
  }

  spinStart() {
    this.tone({ frequency: 110, slideTo: 260, duration: 0.32, gain: 0.06, type: 'sawtooth' });
  }

  impact() {
    this.tone({ frequency: 95, slideTo: 55, duration: 0.22, gain: 0.09, type: 'sine' });
    setTimeout(() => this.tone({ frequency: 420, duration: 0.11, gain: 0.055, type: 'triangle' }), 35);
  }

  money(value = 10) {
    const base = 720 + Math.min(100, value) * 2;
    this.tone({ frequency: base, duration: 0.12, gain: 0.055, type: 'triangle' });
    setTimeout(() => this.tone({ frequency: base * 1.25, duration: 0.15, gain: 0.05, type: 'triangle' }), 85);
  }

  multiplier(multiplier) {
    const notes = multiplier === 3 ? [330, 495, 660, 990] : [330, 495, 740];
    notes.forEach((frequency, i) => setTimeout(() => this.tone({ frequency, duration: 0.16, gain: 0.07, type: 'sawtooth' }), i * 90));
  }

  extraSpin() {
    this.tone({ frequency: 520, duration: 0.09, gain: 0.04, type: 'triangle' });
    setTimeout(() => this.tone({ frequency: 780, duration: 0.13, gain: 0.05, type: 'triangle' }), 65);
  }

  finale() {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
      setTimeout(() => this.tone({ frequency, duration: 0.3, gain: 0.065, type: 'triangle' }), i * 120);
    });
  }
}
