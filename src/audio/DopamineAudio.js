import { AudioManager } from './AudioManager.js';

const proto = AudioManager.prototype;

if (!proto.spinLaunch) {
  proto.spinLaunch = function spinLaunch() {
    this._tone({ freq: 95, dur: 0.22, type: 'sawtooth', vol: 0.35, glideTo: 680 });
    this._tone({ freq: 180, dur: 0.16, type: 'square', vol: 0.24, glideTo: 920 });
    this._noise({ dur: 0.12, vol: 0.16 });
  };

  proto.tensionPulse = function tensionPulse(intensity = 1) {
    const level = Math.max(0.25, Math.min(1, intensity));
    this._tone({ freq: 72 + level * 18, dur: 0.12, type: 'sine', vol: 0.22 + level * 0.22, glideTo: 52 });
  };

  proto.fakeStop = function fakeStop() {
    this._tone({ freq: 520, dur: 0.07, type: 'triangle', vol: 0.48 });
    setTimeout(() => this._tone({ freq: 310, dur: 0.10, type: 'square', vol: 0.25 }), 55);
    this._noise({ dur: 0.06, vol: 0.18 });
  };

  proto.resultLock = function resultLock() {
    this._tone({ freq: 1180, dur: 0.055, type: 'square', vol: 0.62 });
    this._tone({ freq: 115, dur: 0.16, type: 'sine', vol: 0.5, glideTo: 70 });
    this._noise({ dur: 0.08, vol: 0.32 });
  };

  const baseLImpact = proto.lImpact;
  proto.lImpact = function dopamineLImpact() {
    baseLImpact.call(this);
    this._tone({ freq: 62, dur: 0.42, type: 'sine', vol: 0.85, glideTo: 38 });
    this._noise({ dur: 0.18, vol: 0.24 });
  };

  const baseWinnerBoom = proto.winnerBoom;
  proto.winnerBoom = function dopamineWinnerBoom() {
    baseWinnerBoom.call(this);
    this._tone({ freq: 72, dur: 0.58, type: 'sine', vol: 0.95, glideTo: 42 });
    this._tone({ freq: 150, dur: 0.38, type: 'sawtooth', vol: 0.52, glideTo: 520 });
    setTimeout(() => this._tone({ freq: 660, dur: 0.22, type: 'triangle', vol: 0.28, glideTo: 1320 }), 80);
  };
}
