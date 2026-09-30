import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/audio/AudioManager.js';

function audioContext() {
  const sources=[];
  const param=()=>({value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){return this;},disconnect(){},gain:param(),frequency:param(),playbackRate:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  return {currentTime:0,state:'running',destination:node(),sources,createGain:node,createDynamicsCompressor:node,createOscillator(){
    const source={...node(),stopped:false,start(){},stop(time){if(time===undefined){this.stopped=true;this.onended?.();}}};sources.push(source);return source;
  }};
}

test('mute immediately stops playing and scheduled voices', () => {
  const ctx=audioContext();
  const audio=new AudioManager({storage:null,contextFactory:()=>ctx,fetcher:null});
  audio.tone({frequency:440,duration:1});
  audio.tone({frequency:660,duration:1,delay:1});
  audio.setMuted(true);
  assert.ok(ctx.sources.every(s=>s.stopped));
  assert.equal(audio.voices.size,0);
  audio.tone({frequency:880});
  assert.equal(ctx.sources.length,2);
});

test('rapid sound events have a bounded number of live voices', () => {
  const ctx=audioContext();
  const audio=new AudioManager({storage:null,contextFactory:()=>ctx,fetcher:null});
  for(let i=0;i<100;i++) audio.tone({frequency:440});
  assert.ok(audio.voices.size<=16);
  assert.ok(ctx.sources.slice(0,80).every(s=>s.stopped));
});

test('unavailable audio and blocked persistence do not throw during play', () => {
  const storage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  const audio=new AudioManager({storage,contextFactory:()=>null,fetcher:null});
  assert.doesNotThrow(()=>{audio.spinStart();audio.tick();audio.money(40,'small');audio.setMuted(true);audio.setMuted(false);});
});


test('new wheel motion and cash-out cues stay safe without optional WebAudio nodes', () => {
  const ctx=audioContext();
  const audio=new AudioManager({storage:null,contextFactory:()=>ctx,fetcher:null});

  assert.doesNotThrow(()=>{
    audio.spinStart();
    audio.spinMotion(0.8);
    audio.spinMotion(0.1, 0.75);
    audio.stopSpinBed();
    audio.cashOut();
  });
});
