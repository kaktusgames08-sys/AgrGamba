// AudioManager — all sound is synthesized with the WebAudio API so the
// project runs with zero external audio assets. Swap in real files later by
// replacing the tone/noise generators below with buffer playback.
export class AudioManager {
  constructor(settingsManager) {
    this.settings = settingsManager;
    this.ctx = null;
    this.musicNodes = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get muted() {
    return this.settings.get('muted');
  }

  _vol(kind) {
    if (this.muted) return 0;
    const master = this.settings.get('masterVolume') / 100;
    const track = kind === 'music' ? this.settings.get('musicVolume') / 100 : this.settings.get('sfxVolume') / 100;
    return master * track;
  }

  _tone({ freq = 440, dur = 0.08, type = 'square', vol = 1, glideTo = null, kind = 'sfx' }) {
    const v = this._vol(kind);
    if (v <= 0) return;
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol * v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  _noise({ dur = 0.1, vol = 1, kind = 'sfx' }) {
    const v = this._vol(kind);
    if (v <= 0) return;
    const ctx = this._ensureCtx();
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * v, ctx.currentTime);
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  leverClick() { this._tone({ freq: 900, dur: 0.05, type: 'square', vol: 0.5 }); }
  leverClack() {
    this._tone({ freq: 220, dur: 0.09, type: 'square', vol: 0.7 });
    this._noise({ dur: 0.05, vol: 0.4 });
  }
  reelTick() { this._tone({ freq: 700, dur: 0.03, type: 'square', vol: 0.35 }); }
  slowdownTick(pitchFactor = 1) { this._tone({ freq: 700 * pitchFactor, dur: 0.05, type: 'square', vol: 0.4 }); }
  nearStopTick() { this._tone({ freq: 500, dur: 0.06, type: 'triangle', vol: 0.5 }); }
  lImpact() {
    this._tone({ freq: 180, dur: 0.35, type: 'sawtooth', vol: 0.7, glideTo: 60 });
    this._noise({ dur: 0.2, vol: 0.5 });
  }
  winnerBoom() {
    this._tone({ freq: 120, dur: 0.5, type: 'sine', vol: 0.8, glideTo: 400 });
    this._noise({ dur: 0.3, vol: 0.4 });
  }
  uiHover() { this._tone({ freq: 1000, dur: 0.02, type: 'sine', vol: 0.15 }); }
  uiClick() { this._tone({ freq: 600, dur: 0.04, type: 'sine', vol: 0.3 }); }
  jackpotSiren() {
    [660, 880, 660, 880, 990].forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, dur: 0.14, type: 'square', vol: 0.5 }), i * 110);
    });
  }
}
