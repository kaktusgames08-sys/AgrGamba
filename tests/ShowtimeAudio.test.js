import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/audio/AudioManager.js';

import { ShowtimeAudio } from '../src/audio/ShowtimeAudio.js';

// Node has no Web Audio device. Keep the generated PCM real and observe the
// browser boundary: source scheduling, stopping and outgoing asset requests.
function context() {
  const sources=[];
  const param=()=>({value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){return this;},disconnect(){},gain:param(),frequency:param(),playbackRate:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  const source=()=>{const s={...node(),stopped:false,start(){},stop(time){if(time===undefined){this.stopped=true;this.onended?.();}}};sources.push(s);return s;};
  return {currentTime:0,state:'running',sampleRate:22050,destination:node(),sources,createGain:node,createDynamicsCompressor:node,createOscillator:source,createBufferSource:source,createBiquadFilter:node,
    createBuffer(channels,length,sampleRate){const pcm=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate,getChannelData:i=>pcm[i]};},
  };
}
function dev(ctx=context(), options={}) {
  assert.equal(typeof ShowtimeAudio,'function','a separate development sound profile is available');
  return new ShowtimeAudio({storage:null,contextFactory:()=>ctx,fetcher:null,...options});
}

test('dev effects generate audible finite PCM without downloading prop samples', () => {
  const requests=[];
  const audio=dev(context(),{fetcher:url=>{requests.push(url);throw Error('unexpected download');}});
  audio.ensure();
  assert.equal(requests.length,0);
  assert.ok(audio.buffers.size>=4);
  for(const buffer of audio.buffers.values()){
    let energy=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const sample of buffer.getChannelData(ch)){
      assert.ok(Number.isFinite(sample));
      assert.ok(Math.abs(sample)<=1,'generated sample cannot clip');
      energy+=sample*sample;
    }
    assert.ok(energy>0.001,'every effect contains sound');
  }
  audio.silence();
});

test('mute, hiding and a real spin cancel future audition events', async () => {
  await Promise.all([audio=>{audio.setMuted(true);audio.setMuted(false);},audio=>audio.silence(),audio=>audio.spinStart()].map(async interrupt=>{
    const ctx=context();
    const audio=dev(ctx);
    try {
      audio.preview();
      const previousSources=[...ctx.sources];
      interrupt(audio);
      assert.ok(previousSources.every(s=>s.stopped));
      const count=ctx.sources.length;
      await new Promise(resolve=>setTimeout(resolve,350));
      assert.equal(ctx.sources.length,count,'cancelled audition must not emit new events');
    }finally{audio.silence();}
  }));
});

test('rapid dev rewards stay bounded and mute stops future scheduled sounds', () => {
  const ctx=context();
  const audio=dev(ctx);
  for(let i=0;i<20;i++){
    audio.money(80,'big');audio.multiplier(2);audio.extraSpin(.2);audio.milestone();
  }
  assert.ok(audio.voices.size<=24);
  audio.setMuted(true);
  assert.ok(ctx.sources.every(s=>s.stopped));
  const before=ctx.sources.length;
  audio.lossFinale();audio.spinStart();audio.preview();
  assert.equal(ctx.sources.length,before);
});

test('mute, hiding and a new spin also stop a wheel bed already fading out', () => {
  for(const interrupt of [audio=>audio.setMuted(true),audio=>audio.silence(),audio=>audio.spinStart()]){
    const ctx=context();
    const audio=dev(ctx);
    audio.spinStart();
    const previousSources=[...ctx.sources];
    audio.stopSpinBed();
    interrupt(audio);
    assert.ok(previousSources.every(source=>source.stopped),'the fading wheel cannot survive interruption');
    audio.silence();
  }
});

test('dev play remains safe when audio or optional buffer nodes are unavailable', () => {
  for(const ctx of [null,{...context(),createBuffer:undefined,createBufferSource:undefined,createBiquadFilter:undefined}]){
    const audio=dev(ctx);
    assert.doesNotThrow(()=>{
      audio.spinStart();audio.tick(.1);audio.anticipation(3);audio.impact('heavy');
      audio.money(80,'big');audio.multiplier(2.5);audio.wheelSwitch();audio.cashOut();audio.lossFinale();audio.silence();
    });
  }
});

test('classic audio still requests its existing asset set', async () => {
  const requests=[];
  const audio=new AudioManager({storage:null,contextFactory:context,fetcher:async url=>{requests.push(url);return {ok:false};}});
  audio.ensure();
  assert.deepEqual(requests.sort(),['/audio/bong_001.ogg','/audio/chips-handle-2.ogg','/audio/chips-stack-1.ogg','/audio/click_001.ogg','/audio/confirmation_001.ogg']);
  audio.silence();
});
