import './redesign.css';

const SEGMENTS = [
  { label:'20 Kč', type:'money', value:20, spin:true, color:'#ff765f', text:'#fff8f3' },
  { label:'x2', type:'multiplier', value:2, spin:true, color:'#4bdfff', text:'#051a24' },
  { label:'35 Kč', type:'money', value:35, spin:true, color:'#ffb44a', text:'#3d1700' },
  { label:'15 Kč', type:'money', value:15, spin:true, color:'#ff63b8', text:'#fff5fb' },
  { label:'100 Kč', type:'end', value:100, spin:false, color:'#ffd868', text:'#452000' },
  { label:'25 Kč', type:'money', value:25, spin:true, color:'#6bf0a7', text:'#082519' },
  { label:'x3', type:'multiplier', value:3, spin:true, color:'#76dfff', text:'#041926' },
  { label:'40 Kč', type:'money', value:40, spin:true, color:'#ff915d', text:'#fff8f3' },
  { label:'10 Kč', type:'money', value:10, spin:true, color:'#ed72d3', text:'#fff5fb' },
  { label:'50 Kč', type:'money', value:50, spin:true, color:'#90ef75', text:'#08200b' },
  { label:'100 Kč', type:'end', value:100, spin:false, color:'#ffd868', text:'#452000' },
  { label:'30 Kč', type:'money', value:30, spin:true, color:'#ff7e88', text:'#fff8f8' },
  { label:'x2', type:'multiplier', value:2, spin:true, color:'#55e8ff', text:'#041a25' },
  { label:'45 Kč', type:'money', value:45, spin:true, color:'#ffb64b', text:'#3e1700' },
  { label:'20 Kč', type:'money', value:20, spin:true, color:'#ff68a8', text:'#fff5fb' },
  { label:'x3', type:'multiplier', value:3, spin:true, color:'#73f1ff', text:'#041824' },
  { label:'100 Kč', type:'end', value:100, spin:false, color:'#ffd868', text:'#452000' },
  { label:'60 Kč', type:'money', value:60, spin:true, color:'#ff9859', text:'#fff8f3' },
];

const STORAGE_KEY = 'kolo-nestesti-redesign-v5';
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const els = {
  wheelSvg: document.querySelector('#wheelSvg'),
  wheelWrap: document.querySelector('#wheelWrap'),
  pointer: document.querySelector('#pointer'),
  spinButton: document.querySelector('#spinButton'),
  restartButton: document.querySelector('#restartButton'),
  muteButton: document.querySelector('#muteButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  resetSettingsButton: document.querySelector('#resetSettingsButton'),
  moneyCounter: document.querySelector('#moneyCounter'),
  spinCounter: document.querySelector('#spinCounter'),
  centerSpinCounter: document.querySelector('#centerSpinCounter'),
  lastResult: document.querySelector('#lastResult'),
  statusLine: document.querySelector('#statusLine'),
  statusMain: document.querySelector('#statusMain'),
  statusSub: document.querySelector('#statusSub'),
  history: document.querySelector('#history'),
  overlay: document.querySelector('#overlay'),
  finalTitle: document.querySelector('#finalTitle'),
  finalAmount: document.querySelector('#finalAmount'),
  finalMessage: document.querySelector('#finalMessage'),
  particleLayer: document.querySelector('#particleLayer'),
  flash: document.querySelector('#flash'),
  toast: document.querySelector('#toast'),
  toastMain: document.querySelector('#toastMain'),
  toastSub: document.querySelector('#toastSub'),
  speedRange: document.querySelector('#speedRange'),
  speedLabel: document.querySelector('#speedLabel'),
  volumeRange: document.querySelector('#volumeRange'),
  volumeLabel: document.querySelector('#volumeLabel'),
  motionSelect: document.querySelector('#motionSelect'),
};

const settings = loadSettings();
const audio = new AudioEngine(settings.volume, settings.muted);

let total = 0;
let spins = 1;
let isSpinning = false;
let rotation = 0;
let history = [];
let toastTimer = null;
let activeSegment = segmentAtPointer(rotation);

renderWheel();
applySettings();
renderState();
setStatus('Roztoč kolo', 'Tři pole <strong>100 Kč</strong> ukončují běh. Ostatní pole pokračují dál.');

function loadSettings(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return {
      speed:52,
      volume:.48,
      motion:'smooth',
      muted:false,
      ...(raw ? JSON.parse(raw) : {}),
    };
  }catch{
    return {speed:52,volume:.48,motion:'smooth',muted:false};
  }
}

function saveSettings(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }catch{}
}

function applySettings(){
  els.speedRange.value = settings.speed;
  els.volumeRange.value = Math.round(settings.volume * 100);
  els.motionSelect.value = settings.motion;
  audio.setVolume(settings.volume);
  audio.setMuted(settings.muted);
  refreshSettingsLabels();
  updateMuteButton();
}

function refreshSettingsLabels(){
  const speed = Number(els.speedRange.value);
  els.speedLabel.textContent = speed < 32 ? 'Rychlejší' : speed > 72 ? 'Delší show' : 'Vyvážená';
  els.volumeLabel.textContent = `${els.volumeRange.value} %`;
}

function spinDuration(){
  const t = Number(settings.speed) / 100;
  const base = 4100 + t * 1800;
  if(settings.motion === 'classic') return base - 300;
  if(settings.motion === 'dramatic') return base + 550;
  return base;
}

function turns(){
  const t = Number(settings.speed) / 100;
  if(settings.motion === 'classic') return 6.3 + t * 1.4;
  if(settings.motion === 'dramatic') return 8.1 + t * 2.1;
  return 7 + t * 1.7;
}

function easing(t){
  if(settings.motion === 'classic') return 1 - Math.pow(1-t,3);
  if(settings.motion === 'dramatic') return 1 - Math.pow(1-t,6);
  return 1 - Math.pow(1-t,5);
}

function renderWheel(){
  const NS='http://www.w3.org/2000/svg';
  const svg=els.wheelSvg;
  svg.innerHTML='';

  const defs=document.createElementNS(NS,'defs');
  defs.innerHTML=`
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".25"/>
    </filter>
    <radialGradient id="hubShade" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".2"/>
      <stop offset="100%" stop-color="#fff" stop-opacity=".02"/>
    </radialGradient>
  `;
  svg.appendChild(defs);

  const group=document.createElementNS(NS,'g');
  group.setAttribute('filter','url(#softShadow)');
  svg.appendChild(group);

  const cx=500,cy=500,outerR=468,innerR=158;

  SEGMENTS.forEach((segment,index)=>{
    const start=-90+index*SEGMENT_ANGLE;
    const end=start+SEGMENT_ANGLE;

    const path=document.createElementNS(NS,'path');
    path.setAttribute('d',donutSlice(cx,cy,outerR,innerR,start,end));
    path.setAttribute('fill',segment.color);
    path.setAttribute('stroke','rgba(255,255,255,.18)');
    path.setAttribute('stroke-width','3');
    group.appendChild(path);

    const mid=start+SEGMENT_ANGLE/2;
    const textGroup=document.createElementNS(NS,'g');
    textGroup.setAttribute('transform',`rotate(${mid} 500 500)`);

    const main=document.createElementNS(NS,'text');
    main.setAttribute('x','500');
    main.setAttribute('y','145');
    main.setAttribute('text-anchor','middle');
    main.setAttribute('fill',segment.text);
    main.setAttribute('font-size',segment.type==='end'?'41':'35');
    main.setAttribute('font-weight','900');
    main.setAttribute('letter-spacing','-.03em');
    main.textContent=segment.label;
    textGroup.appendChild(main);

    const sub=document.createElementNS(NS,'text');
    sub.setAttribute('x','500');
    sub.setAttribute('y','182');
    sub.setAttribute('text-anchor','middle');
    sub.setAttribute('fill',segment.text);
    sub.setAttribute('font-size','19');
    sub.setAttribute('font-weight','800');
    sub.setAttribute('opacity','.82');
    sub.textContent=segment.spin?'+ SPIN':'KONEC';
    textGroup.appendChild(sub);

    group.appendChild(textGroup);
  });

  const inner=document.createElementNS(NS,'circle');
  inner.setAttribute('cx','500');
  inner.setAttribute('cy','500');
  inner.setAttribute('r','168');
  inner.setAttribute('fill','url(#hubShade)');
  inner.setAttribute('stroke','rgba(255,255,255,.11)');
  inner.setAttribute('stroke-width','7');
  svg.appendChild(inner);
}

function polar(cx,cy,r,angle){
  const rad=angle*Math.PI/180;
  return {x:cx+Math.cos(rad)*r,y:cy+Math.sin(rad)*r};
}

function donutSlice(cx,cy,outerR,innerR,startAngle,endAngle){
  const p1=polar(cx,cy,outerR,startAngle);
  const p2=polar(cx,cy,outerR,endAngle);
  const p3=polar(cx,cy,innerR,endAngle);
  const p4=polar(cx,cy,innerR,startAngle);
  const large=endAngle-startAngle>180?1:0;
  return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function normalizeAngle(v){
  return ((v%360)+360)%360;
}

function segmentAtPointer(rotationDeg){
  const effective=normalizeAngle(360-normalizeAngle(rotationDeg));
  return Math.floor(effective/SEGMENT_ANGLE)%SEGMENTS.length;
}

function targetRotationFor(index){
  const segmentCenter=index*SEGMENT_ANGLE+SEGMENT_ANGLE/2;
  const current=rotation;
  const currentNormalized=normalizeAngle(current);
  const targetNormalized=normalizeAngle(360-segmentCenter);
  const delta=normalizeAngle(targetNormalized-currentNormalized);
  return current+turns()*360+delta;
}

function pickIndex(){
  return Math.floor(Math.random()*SEGMENTS.length);
}

function renderState(){
  els.moneyCounter.textContent=formatMoney(total);
  els.spinCounter.textContent=spins;
  els.centerSpinCounter.textContent=spins;
  els.lastResult.textContent=history[0]?.label ?? '—';

  if(!history.length){
    els.history.innerHTML='<div class="history-empty">Po prvním spinu se tady objeví historie.</div>';
    return;
  }

  els.history.innerHTML='';
  history.forEach((item,index)=>{
    const row=document.createElement('div');
    row.className='history-item';
    row.innerHTML=`
      <div class="history-item__index">${history.length-index}</div>
      <div>
        <div class="history-item__label">${item.label}</div>
        <div class="history-item__desc">${item.description}</div>
      </div>
      <div class="history-item__value">${item.after}</div>
    `;
    els.history.appendChild(row);
  });
}

function formatMoney(value){
  return `${Math.round(value)} Kč`;
}

function setStatus(main,sub='',mode=''){
  els.statusMain.textContent=main;
  els.statusSub.innerHTML=sub;
  els.statusLine.classList.toggle('is-win',mode==='win');
  els.statusLine.classList.toggle('is-final',mode==='final');
}

function showToast(main,sub){
  els.toastMain.textContent=main;
  els.toastSub.textContent=sub;
  els.toast.classList.add('is-open');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>els.toast.classList.remove('is-open'),1650);
}

function pointerKick(amount=6){
  if(!els.pointer.animate) return;
  els.pointer.animate(
    [
      {transform:'rotate(0deg)'},
      {transform:`rotate(${amount}deg)`},
      {transform:'rotate(-1deg)'},
      {transform:'rotate(0deg)'},
    ],
    {duration:82,easing:'cubic-bezier(.2,.7,.3,1)'}
  );
}

async function spin(){
  if(isSpinning||spins<=0) return;

  await audio.unlock();
  isSpinning=true;
  els.spinButton.disabled=true;
  spins-=1;
  renderState();
  setStatus('Kolo se točí…','Zvuk teď vzniká jen při skutečném přeskočení pointeru.');

  const targetIndex=pickIndex();
  const finalRotation=targetRotationFor(targetIndex);
  const startRotation=rotation;
  const duration=spinDuration();
  const start=performance.now();
  let previousRotation=rotation;
  let previousIndex=segmentAtPointer(rotation);
  activeSegment=previousIndex;

  audio.spinStart();

  await new Promise(resolve=>{
    const frame=now=>{
      const t=Math.min(1,(now-start)/duration);
      const p=easing(t);
      const next=startRotation+(finalRotation-startRotation)*p;
      const velocity=Math.abs(next-previousRotation);
      previousRotation=next;

      rotation=next;
      els.wheelWrap.style.transform=`rotate(${rotation}deg)`;

      const idx=segmentAtPointer(rotation);
      if(idx!==previousIndex){
        previousIndex=idx;
        activeSegment=idx;
        const intensity=Math.max(.12,Math.min(1,velocity/8));
        pointerKick(3.8+intensity*3.4);
        audio.tick(intensity);
      }

      if(t<1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  rotation=finalRotation;
  els.wheelWrap.style.transform=`rotate(${rotation}deg)`;

  const landedIndex=segmentAtPointer(rotation);
  const segment=SEGMENTS[landedIndex];

  await delay(segment.type==='end'?105:72);
  audio.land(segment.type==='end'?'final':'normal');
  processResult(segment);

  isSpinning=false;
  els.spinButton.disabled=false;
}

function processResult(segment){
  const before=total;
  let description='';

  if(segment.type==='money'||segment.type==='end'){
    total+=segment.value;
    description=segment.spin?`+${segment.value} Kč a další spin`:`+${segment.value} Kč a konec`;
  }else{
    total*=segment.value;
    description=before===0?`x${segment.value}, ale částka byla 0 Kč`:`částka ×${segment.value}`;
  }

  if(segment.spin) spins+=1;

  history.unshift({
    label:segment.spin?`${segment.label} + SPIN`:segment.label,
    description,
    after:formatMoney(total),
  });
  history=history.slice(0,12);

  renderState();

  if(segment.type==='money'){
    audio.reward('money');
    setStatus(`${segment.label} + SPIN`,`Přičteno <strong>${segment.value} Kč</strong>. Celkem ${formatMoney(total)}.`,'win');
    showToast(`${segment.label} + SPIN`,`Celkem ${formatMoney(total)}`);
    particles(13,false);
  }else if(segment.type==='multiplier'){
    audio.reward('multiplier');
    setStatus(`${segment.label} + SPIN`,`Dosavadní částka se násobí. Celkem <strong>${formatMoney(total)}</strong>.`,'win');
    showToast(`${segment.label} + SPIN`,`Celkem ${formatMoney(total)}`);
    particles(17,true);
  }else{
    audio.reward('final');
    setStatus('KONEC KOLA',`Finální částka: <strong>${formatMoney(total)}</strong>.`,'final');
    particles(18,true);
    setTimeout(()=>openFinal(segment),560);
  }
}

function openFinal(segment){
  els.finalTitle.textContent=total<=0?'PROHRÁL JSI':'DOHRÁNO';
  els.finalAmount.textContent=formatMoney(total);
  els.finalMessage.textContent=segment.type==='end'
    ?`Kolo skončilo na ${segment.label}. Tohle je tvoje finální částka.`
    :'Spiny došly.';
  els.overlay.classList.add('is-open');
  els.overlay.setAttribute('aria-hidden','false');
  els.flash.classList.add('is-on');
  setTimeout(()=>els.flash.classList.remove('is-on'),150);
}

function restart(){
  total=0;
  spins=1;
  history=[];
  isSpinning=false;
  els.overlay.classList.remove('is-open');
  els.overlay.setAttribute('aria-hidden','true');
  els.spinButton.disabled=false;
  renderState();
  setStatus('Roztoč kolo','Tři pole <strong>100 Kč</strong> ukončují běh. Ostatní pole pokračují dál.');
}

function particles(count,gold){
  const rect=els.wheelWrap.getBoundingClientRect();
  const cx=rect.left+rect.width/2;
  const cy=rect.top+rect.height/2;

  for(let i=0;i<count;i++){
    const p=document.createElement('i');
    p.className='particle';
    const a=Math.random()*Math.PI*2;
    const d=70+Math.random()*150;
    p.style.left=`${cx}px`;
    p.style.top=`${cy}px`;
    p.style.setProperty('--dx',`${Math.cos(a)*d}px`);
    p.style.setProperty('--dy',`${Math.sin(a)*d}px`);
    if(!gold) p.style.background='#dffcff';
    els.particleLayer.appendChild(p);
    setTimeout(()=>p.remove(),850);
  }
}

function delay(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function updateMuteButton(){
  els.muteButton.textContent=settings.muted?'🔈':'🔊';
  els.muteButton.classList.toggle('is-active',!settings.muted);
}

class AudioEngine{
  constructor(volume=.48,muted=false){
    this.ctx=null;
    this.volume=volume;
    this.muted=muted;
  }

  async unlock(){
    if(!this.ctx){
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx) return;
      this.ctx=new AudioCtx();
    }
    if(this.ctx.state==='suspended'){
      try{await this.ctx.resume()}catch{}
    }
  }

  setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)||0))}
  setMuted(v){this.muted=Boolean(v)}

  tone({freq=500,to=freq,duration=.06,gain=.02,type='triangle',attack=.0015}){
    if(!this.ctx||this.muted||this.volume<=0) return;

    const now=this.ctx.currentTime;
    const osc=this.ctx.createOscillator();
    const amp=this.ctx.createGain();
    const peak=Math.max(.0001,gain*this.volume);

    osc.type=type;
    osc.frequency.setValueAtTime(freq,now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30,to),now+duration);
    amp.gain.setValueAtTime(.0001,now);
    amp.gain.exponentialRampToValueAtTime(peak,now+attack);
    amp.gain.exponentialRampToValueAtTime(.0001,now+duration);

    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now+duration+.02);
  }

  noise({duration=.035,gain=.009,cutoff=1800}){
    if(!this.ctx||this.muted||this.volume<=0) return;

    const len=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
    const buffer=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*(1-i/len);

    const src=this.ctx.createBufferSource();
    const filter=this.ctx.createBiquadFilter();
    const amp=this.ctx.createGain();
    const now=this.ctx.currentTime;

    src.buffer=buffer;
    filter.type='highpass';
    filter.frequency.value=cutoff;
    amp.gain.setValueAtTime(gain*this.volume,now);
    amp.gain.exponentialRampToValueAtTime(.0001,now+duration);

    src.connect(filter).connect(amp).connect(this.ctx.destination);
    src.start(now);
  }

  spinStart(){
    this.noise({duration:.07,gain:.007,cutoff:2200});
    this.tone({freq:330,to:620,duration:.11,gain:.012,type:'triangle'});
  }

  tick(speed=.5){
    const s=Math.max(.08,Math.min(1,speed));
    const pitch=760+s*420;
    this.tone({
      freq:pitch,
      to:pitch*.9,
      duration:.018+(1-s)*.012,
      gain:.0045+s*.005,
      type:'triangle',
      attack:.001,
    });
  }

  land(mode='normal'){
    const final=mode==='final';
    this.noise({duration:.04,gain:final?.012:.008,cutoff:1050});
    this.tone({freq:final?150:190,to:final?82:112,duration:.105,gain:final?.045:.032,type:'sine'});
    setTimeout(()=>this.tone({freq:final?390:460,to:final?310:390,duration:.075,gain:final?.015:.011,type:'triangle'}),18);
  }

  reward(kind){
    if(kind==='money'){
      this.tone({freq:560,duration:.05,gain:.014});
      setTimeout(()=>this.tone({freq:720,duration:.06,gain:.016}),55);
    }else if(kind==='multiplier'){
      [480,640,850].forEach((freq,i)=>setTimeout(()=>this.tone({freq,duration:.06,gain:.016+i*.002}),i*58));
    }else{
      [520,690,920].forEach((freq,i)=>setTimeout(()=>this.tone({freq,duration:.075,gain:.018+i*.002}),i*72));
    }
  }
}

els.spinButton.addEventListener('click',spin);
els.restartButton.addEventListener('click',restart);
els.muteButton.addEventListener('click',()=>{
  settings.muted=!settings.muted;
  audio.setMuted(settings.muted);
  updateMuteButton();
  saveSettings();
});

els.fullscreenButton.addEventListener('click',async()=>{
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch{}
});

els.speedRange.addEventListener('input',()=>{
  settings.speed=Number(els.speedRange.value);
  refreshSettingsLabels();
  saveSettings();
});

els.volumeRange.addEventListener('input',()=>{
  settings.volume=Number(els.volumeRange.value)/100;
  audio.setVolume(settings.volume);
  refreshSettingsLabels();
  saveSettings();
});

els.motionSelect.addEventListener('change',()=>{
  settings.motion=els.motionSelect.value;
  saveSettings();
});

els.resetSettingsButton.addEventListener('click',()=>{
  settings.speed=52;
  settings.volume=.48;
  settings.motion='smooth';
  settings.muted=false;
  applySettings();
  saveSettings();
});

els.overlay.addEventListener('click',event=>{
  if(event.target===els.overlay) restart();
});

document.addEventListener('keydown',event=>{
  if(event.repeat) return;
  const key=event.key.toLowerCase();

  if(event.code==='Space'){
    event.preventDefault();
    if(!els.overlay.classList.contains('is-open')) spin();
  }else if(key==='r'){
    restart();
  }else if(key==='m'){
    els.muteButton.click();
  }else if(key==='f'){
    els.fullscreenButton.click();
  }
});
