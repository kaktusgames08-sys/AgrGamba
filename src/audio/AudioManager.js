// Local CC0 foley + original synthesized musical cues. See AUDIO-CREDITS.md.
const SAMPLES = {
  tick:'chip-lay-1', chips:'chips-handle-2', drop:'chips-stack-1',
  impact:'chips-collide-1', sweep:'card-fan-1', slide:'card-slide-1',
  click:'click_001', confirm:'confirmation_001', end:'bong_001',
};
const BASE = import.meta.env?.BASE_URL ?? '/';
function safeStorage() { try { return globalThis.localStorage; } catch { return null; } }

export class AudioManager {
  constructor({storage = safeStorage(), contextFactory, fetcher = globalThis.fetch?.bind(globalThis)} = {}) {
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
    try { this.muted = storage?.getItem('wheel-muted') === '1'; } catch { /* optional storage */ }
  }

  ensure() {
    if (this.muted) return null;
    try {
      if (!this.ctx) {
        this.ctx = this.contextFactory();
        if (!this.ctx) return null;
        this.master = this.ctx.createGain();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 16;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.15;
        this.master.gain.value = this.masterVolume;
        this.master.connect(compressor).connect(this.ctx.destination);
        this.loadSamples();
        this.startAmbience();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume()?.catch?.(() => {});
      return this.ctx;
    } catch { return null; }
  }

  async loadSamples() {
    if (this.loading || !this.fetcher || !this.ctx) return;
    this.loading = true;
    await Promise.allSettled(Object.entries(SAMPLES).map(async ([key,name]) => {
      const response = await this.fetcher(BASE + 'audio/' + name + '.ogg');
      if (!response.ok) return;
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(key,buffer);
    }));
  }

  configure(settings) {
    this.setMasterVolume(settings.masterVolume);
    this.setAmbience(settings.ambienceVolume ?? 0);
  }
  setMasterVolume(value) {
    this.masterVolume = Math.max(0,Math.min(1,Number(value)||0));
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume,this.ctx.currentTime,0.02);
    return this.masterVolume;
  }
  setMuted(value) {
    this.muted = !!value;
    if (this.muted) this.silence();
    else if (this.ctx) this.startAmbience();
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume,this.ctx.currentTime,0.008);
    try { this.storage?.setItem('wheel-muted',this.muted ? '1' : '0'); } catch { /* optional storage */ }
    return this.muted;
  }
  toggle() { return this.setMuted(!this.muted); }
  silence() {
    for (const source of [...this.voices]) { try { source.stop(); } catch { /* already ended */ } }
    this.voices.clear();
    this.stopAmbience();
  }
  track(source, gain) {
    while (this.voices.size >= 16) {
      const oldest = this.voices.values().next().value;
      this.voices.delete(oldest);
      try { oldest.stop(); } catch { /* already ended */ }
    }
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
  }
  tone({frequency=440,duration=0.14,gain=0.05,type='sine',slideTo=null,attack=0.008,delay=0} = {}) {
    const ctx = this.ensure();
    if (!ctx || this.masterVolume <= 0) return;
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const now = ctx.currentTime + delay;
      osc.type = type;
      osc.frequency.setValueAtTime(frequency,now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo),now+duration);
      amp.gain.setValueAtTime(0.0001,now);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0001,gain),now+Math.min(attack,duration/2));
      amp.gain.exponentialRampToValueAtTime(0.0001,now+duration);
      osc.connect(amp).connect(this.master);
      this.track(osc,amp);
      osc.start(now);
      osc.stop(now+duration+0.03);
    } catch { /* Audio must never interrupt a draw. */ }
  }
  playSample(name,{volume=0.4,playbackRate=1,delay=0} = {}) {
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
      this.track(source,gain);
      source.start(ctx.currentTime+delay);
      return true;
    } catch { return false; }
  }
  click() { if (!this.playSample('click',{volume:0.35})) this.tone({frequency:480,duration:0.035,gain:0.025}); }
  tick(speed=1) {
    const now = performance.now();
    if (now-this.lastTick<38) return;
    this.lastTick=now;
    const s=Math.max(0,Math.min(1,speed));
    if (!this.playSample('tick',{volume:0.12+s*0.05,playbackRate:0.9+s*0.5}))
      this.tone({frequency:840+s*520,duration:0.025,gain:0.018,type:'triangle',slideTo:510});
  }
  spinStart() {
    this.playSample('sweep',{volume:0.5});
    this.tone({frequency:160,slideTo:480,duration:0.28,gain:0.028,type:'triangle'});
  }
  anticipation(stage=1) {
    const pitch=[196,246.94,293.66][Math.min(2,stage-1)];
    this.tone({frequency:pitch,duration:0.3,gain:0.018});
    this.tone({frequency:pitch*2,duration:0.22,gain:0.012,delay:0.08});
  }
  impact(strength='normal') {
    this.playSample('impact',{volume:strength==='heavy'?0.7:0.4});
    this.tone({frequency:strength==='heavy'?95:160,slideTo:55,duration:0.16,gain:0.055});
  }
  money(value,tier='small') {
    this.playSample('chips',{volume:tier==='big'?0.7:0.4});
    const notes=tier==='big'?[523.25,659.25,783.99]:tier==='medium'?[523.25,659.25]:[523.25];
    notes.forEach((frequency,i)=>this.tone({frequency,duration:0.25,gain:0.035,delay:i*0.09}));
    this.playSample('drop',{volume:0.35,delay:0.23});
  }
  multiplier(value=2) {
    [392,523.25,659.25,783.99].forEach((frequency,i)=>this.tone({frequency,duration:0.38,gain:0.042,delay:i*0.12,type:'triangle'}));
    this.playSample('confirm',{volume:0.5,delay:0.3,playbackRate:value>=2?1.1:0.9});
  }
  extraSpin() { this.tone({frequency:1046.5,duration:0.08,gain:0.015}); }
  lossFinale() {
    this.playSample('end',{volume:0.65});
    [220,174.61,130.81].forEach((frequency,i)=>this.tone({frequency,duration:0.65,gain:0.045,delay:i*0.16}));
  }
  milestone() {
    [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>this.tone({frequency,duration:0.6,gain:0.038,delay:i*0.13}));
  }
  preview() { this.click(); this.money(75,'big'); }
  setAmbience(value) {
    this.ambienceVolume=Math.max(0,Math.min(1,Number(value)||0));
    this.stopAmbience();
    if (this.ctx && !this.muted) this.startAmbience();
  }
  startAmbience() {
    if (!this.ctx || this.muted || this.ambienceVolume<=0 || this.ambient.length) return;
    try {
      [130.81,196,261.63].forEach((frequency,i)=>{
        const source=this.ctx.createOscillator();
        const gain=this.ctx.createGain();
        source.type='sine';
        source.frequency.value=frequency+(i-1)*0.18;
        gain.gain.value=this.ambienceVolume*0.014;
        source.connect(gain).connect(this.master);
        source.start();
        this.ambient.push({source,gain});
      });
    } catch { this.stopAmbience(); }
  }
  stopAmbience() {
    for(const {source,gain} of this.ambient) { try {source.stop();source.disconnect();gain.disconnect();} catch { /* stopped */ } }
    this.ambient=[];
  }
}
