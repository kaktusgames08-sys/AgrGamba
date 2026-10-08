import { AudioManager } from './AudioManager.js';

const C5 = 523.25;
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

// An opt-in presentation for the dev route. Original PCM is generated once,
// locally: a weighted peg, ceramic/coin transients and a stereo struck bell.
// One buffer source per bell preserves the voice budget for the whole phrase.
export class ShowtimeAudio extends AudioManager {
  constructor(options) {
    super(options);
    this.previewTimers = new Set();
    this.fadingBeds = new Set();
  }

  loadSamples() {
    if (this.loading || !this.ctx?.createBuffer) return;
    this.loading = true;
    try {
      const rate = this.ctx.sampleRate || 44100;
      const sample = (name, seconds, channels, waveform) => {
        const buffer = this.ctx.createBuffer(channels, Math.ceil(rate * seconds), rate);
        for (let channel=0; channel<channels; channel++) {
          const data = buffer.getChannelData(channel);
          for (let i=0; i<data.length; i++) data[i] = waveform(i / rate, channel);
        }
        this.buffers.set(name, buffer);
      };
      const sin = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
      sample('showtime-bell', 1.15, 2, (t, ch) => {
        const f = C5 * (ch ? 1.0007 : .9993);
        const onset = 1 - Math.exp(-900 * t);
        return onset * (
          .48 * sin(f,t) * Math.exp(-6.5*t)
          + .22 * sin(f*2.003,t) * Math.exp(-10*t)
          + .12 * sin(f*2.756,t) * Math.exp(-16*t)
          + .065 * sin(f*4.07,t) * Math.exp(-24*t)
        );
      });
      sample('showtime-peg', .045, 1, t => (1-Math.exp(-3000*t))*Math.exp(-180*t)*(
        .29*sin(1350,t)+.16*sin(2860,t)+.14*(Math.random()*2-1)
      ));
      sample('showtime-coin', .19, 2, (t,ch) => (1-Math.exp(-1800*t))*(
        .28*sin(2040+ch*9,t)*Math.exp(-35*t)
        +.18*sin(3175,t)*Math.exp(-48*t)
        +.09*sin(4870,t)*Math.exp(-65*t)
      ));
      sample('showtime-body', .30, 1, t => {
        const phase = 2*Math.PI*(48*t+96*(1-Math.exp(-28*t))/28);
        return (1-Math.exp(-1500*t))*(.65*Math.sin(phase)*Math.exp(-21*t)+.10*sin(185,t)*Math.exp(-38*t));
      });
      let air = 0;
      sample('showtime-air', .28, 1, t => {
        air = air*.65+(Math.random()*2-1)*.35;
        return air*.7*Math.sin(Math.PI*t/.28)**2;
      });
      let ceramic = 0;
      sample('showtime-ceramic', .26, 1, t => {
        const white = Math.random()*2-1;
        ceramic = .32*ceramic+.68*white;
        const envelope = (1-Math.exp(-1800*t))*Math.exp(-32*t);
        return envelope*(.24*ceramic+.15*sin(1270,t)+.12*sin(3570,t));
      });
    } catch {
      // Older/embedded audio devices retain the safe tone fallback.
      this.buffers.clear();
    }
  }

  bell(frequency, volume=.24, delay=0) {
    if (!this.playSample('showtime-bell', {volume, playbackRate:frequency/C5, delay})) {
      this.tone({frequency,duration:.20,gain:volume*.12,delay,type:'sine',attack:.002});
    }
  }

  phrase(notes, {volume=.24,gap=.07,delay=0}={}) {
    notes.forEach((frequency,index)=>this.bell(frequency,volume,delay+index*gap));
  }

  hit(name, volume, playbackRate=1, delay=0) {
    if (!this.playSample(name,{volume,playbackRate,delay})) {
      this.tone({frequency:name==='showtime-body'?95:1200,slideTo:name==='showtime-body'?48:650,duration:.06,gain:volume*.08,delay,attack:.001});
    }
  }

  cancelPreview() {
    for (const timer of this.previewTimers) clearTimeout(timer);
    this.previewTimers.clear();
  }

  silence() {
    this.cancelPreview();
    super.silence();
  }

  stopSpinBed(immediate=false) {
    const bed = this.spinBed;
    if(bed&&!immediate){
      // Keep ownership during the inherited fade so interruption can stop it.
      this.fadingBeds.add(bed.source);
      const ended = bed.source.onended;
      bed.source.onended = () => {
        this.fadingBeds.delete(bed.source);
        ended?.();
      };
    }
    super.stopSpinBed(immediate);
    if(immediate){
      for(const source of [...this.fadingBeds]){
        try{source.stop();}catch{/* Already ended. */}
      }
      this.fadingBeds.clear();
    }
  }

  click() { this.hit('showtime-peg',.14,1.4); }

  spinStart() {
    // A new spin takes over from any previous audition or reward tail.
    this.silence();
    this.startAmbience();
    this.lastTick = 0;
    this.startSpinBed();
    this.hit('showtime-body',.35,1.16);
    this.hit('showtime-air',.24,1.25);
    this.phrase([523.25,783.99],{volume:.13,gap:.045,delay:.015});
  }

  spinMotion(speed=1, anticipation=0) {
    super.spinMotion(speed,anticipation);
    if (this.spinBed && this.ctx) {
      this.spinBed.gain.gain.setTargetAtTime(.002+clamp(speed)*.011,this.ctx.currentTime,.04);
    }
  }

  tick(speed=1) {
    const now = performance.now();
    if (now-this.lastTick<29) return;
    this.lastTick = now;
    const slow = 1-clamp(speed);
    this.hit('showtime-peg',.14+slow*.25,1.15-slow*.37);
  }

  anticipation(stage=1) {
    const index = Math.max(0,Math.min(2,Math.round(stage)-1));
    this.hit('showtime-body',.10+index*.035,.90-index*.08);
    this.bell([196,246.94,369.99][index],.09+index*.015,.025);
    if (index===2) this.hit('showtime-air',.13,1.7,.06);
  }

  impact(strength='normal') {
    const heavy = strength==='heavy';
    this.hit('showtime-peg',heavy?.38:.27,.72);
    this.hit('showtime-body',heavy?.65:.43,heavy?.88:1.12,.008);
  }

  money(value,tier='small') {
    const size = tier==='big'?2:tier==='medium'?1:0;
    const notes = [[659.25,987.77],[523.25,783.99,1046.5],[523.25,659.25,783.99,1046.5]][size];
    this.phrase(notes,{volume:[.20,.25,.30][size],gap:.072,delay:.028});
    for(let i=0;i<=size;i++)this.hit('showtime-coin',.11+size*.025,1+i*.055,.14+i*.13);
  }

  multiplier(value=2) {
    const big = value>=2;
    this.hit('showtime-body',big?.62:.42,.83);
    this.hit('showtime-air',.22,1.1);
    this.hit('showtime-air',.14,1.5,.16);
    this.phrase(big?[392,523.25,783.99,1046.5,1567.98]:[392,587.33,783.99],{volume:big?.34:.26,gap:.085,delay:.07});
    if(value>2)this.bell(2093,.16,.54);
    this.hit('showtime-coin',.18,1.1,.49);
  }

  extraSpin(delay=0) {
    this.phrase([1318.51,1567.98],{volume:.14,gap:.065,delay:delay+.08});
  }

  wheelSwitch() {
    this.hit('showtime-air',.20,1.3);
    this.phrase([261.63,392,523.25],{volume:.12,gap:.045});
  }

  cashOut() {
    this.phrase([392,523.25,659.25,783.99],{volume:.22,gap:.10});
    this.hit('showtime-body',.35,.90);
    this.hit('showtime-ceramic',.28,.92,.43);
  }

  lossFinale() {
    this.hit('showtime-ceramic',.38,.82);
    this.hit('showtime-body',.51,.73);
    this.phrase([349.23,277.18,220],{volume:.20,gap:.15,delay:.07});
  }

  finale() {
    // Close Hardcore without replaying an unrelated ×1 multiplier fanfare.
    this.hit('showtime-ceramic',.30,.90);
    this.hit('showtime-body',.43,.86);
    [261.63,329.63,392].forEach(f=>this.bell(f,.13,.02));
    this.bell(523.25,.17,.19);
  }

  milestone() {
    this.hit('showtime-body',.56,.82);
    this.phrase([523.25,659.25,783.99,1046.5,1318.51,1567.98],{volume:.29,gap:.085});
    this.bell(2093,.16,.55);
  }

  preview() {
    if(this.muted||this.masterVolume<=0||!this.ensure())return false;
    this.spinStart();
    const schedule = (ms,action) => {
      const timer = setTimeout(()=>{this.previewTimers.delete(timer);action();},ms);
      this.previewTimers.add(timer);
    };
    for(let i=0;i<15;i++)schedule(95+i*72,()=>this.tick(1-i/18));
    schedule(600,()=>{this.anticipation(1);this.spinMotion(.48,.3);});
    schedule(1040,()=>{this.anticipation(2);this.spinMotion(.2,.65);});
    schedule(1390,()=>{this.anticipation(3);this.spinMotion(.06,1);});
    schedule(1700,()=>this.stopSpinBed());
    schedule(1840,()=>{this.impact('heavy');this.money(80,'big');this.extraSpin(.22);});
    schedule(3300,()=>this.multiplier(2));
    schedule(5100,()=>this.finale());
    return true;
  }
}
