import './styles/casino.css';
import { SettingsManager } from './core/SettingsManager.js';
import { SessionManager, rewardTier } from './core/SessionManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { LedRing } from './ui/LedRing.js';
import { ParallaxController } from './ui/ParallaxController.js';
import { WheelRenderer } from './ui/WheelRenderer.js';
import { ParticleSystem } from './ui/ParticleSystem.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { UI } from './ui/UI.js';
import { PiggyBank } from './ui/PiggyBank.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { StudioPanel, toast } from './ui/StudioPanel.js';
import { isDevPreview, previewStorage } from './dev/PreviewMode.js';

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
let storage=null;
try { storage=globalThis.localStorage; } catch { /* private/embedded browsers */ }
const development=isDevPreview(location.search);
if(development)storage=previewStorage(storage);
let previewReady=!development;
let showtime=null;
const settingsManager=new SettingsManager(storage);
const leaderboard=new Leaderboard({storage});
const session=new SessionManager(settingsManager.get(),storage,leaderboard.entries);
let settings=session.settings;
const audio=new AudioManager({storage});
const ui=new UI();
const piggy=new PiggyBank();
const leds=new LedRing($('ledRing'));
const parallax=new ParallaxController($('machineStage'));
const particles=new ParticleSystem($('particleLayer'),$('flash'));
const app=$('app');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let busy=false;
let boardMode=session.category();
let spinToken=0;
let milestoneTimer=null;
const wheel=new WheelRenderer({
  mount:$('wheelMount'),pointer:$('pointer'),shell:$('wheelShell'),audio,
  segments:session.segments(),spinDurationMs:settings.spinDurationMs,
  onProgress:({timeProgress,rotation})=>leds.setProgress(timeProgress,rotation),
  onPhaseChange:phase=>{
    ui.setSpinPhase(phase);
    leds.setMode(phase==='spinning'?'spinning':phase.startsWith('anticipation')?'anticipating':phase==='settling'||phase==='freeze'?'settling':phase==='landed'?'winner':'idle');
    ui.microFreeze(phase==='freeze');
  },
});
const settingsPanel=new SettingsPanel({manager:settingsManager,onApply:applySettings,canOpen:()=>!busy&&!$('overlay').open&&!$('studioDialog').open&&!$('cashoutDialog').open});
const studio=new StudioPanel(session,{
  isBusy:()=>busy,canOpen:()=>!busy&&!settingsPanel.isOpen()&&!$('cashoutDialog').open,onRefresh:renderExtras,
  onRestart:restart,onNext:nextPlayer,onApply:applySettings,onResult:showResult,onCloseResult:()=>ui.hideFinal(),
});

function applyPresentation() {
  audio.configure(settings);
  const effective=reduced.matches?{...settings,effects:'low',ambientMotion:false}:settings;
  particles.setEffectLevel(effective.effects);
  ui.applyPresentationSettings(effective);
  parallax.setEnabled(effective.ambientMotion&&effective.presentationPreset!=='clean');
  wheel.setSpinDuration(reduced.matches?1000:settings.spinDurationMs);
  wheel.setPalette(settings.semanticColors);
}
function renderBoard() {
  leaderboard.entries=session.board(boardMode).slice(0,30);
  leaderboard.render();
  if(!leaderboard.entries.length)$('leaderboardList').innerHTML='<div class="empty-state">První místo čeká.<br>Dokonči sérii v tomto režimu.</div>';
  document.querySelectorAll('[data-board]').forEach(button=>{const active=button.dataset.board===boardMode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
}
function renderExtras() {
  studio.render();renderBoard();
  showtime?.render(session,{busy});
  const hardcore=session.mode==='hardcore';
  app.dataset.gameMode=session.mode;
  $('normalButton').classList.toggle('is-active',!hardcore);
  $('hardcoreButton').classList.toggle('is-active',hardcore);
  $('normalButton').setAttribute('aria-pressed',String(!hardcore));
  $('hardcoreButton').setAttribute('aria-pressed',String(hardcore));
  $('hardcoreSteps').hidden=!hardcore;$('hardcoreRule').hidden=!hardcore;
  $('modeCaption').textContent=hardcore?'Dvě částky. Jeden násobič. Velké finále.':session.category()==='custom'?'Tvoje kolo. Tvoje pravidla.':'Padá +SPIN? Série pokračuje.';
  document.querySelectorAll('[data-step]').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('is-done',session.state.spinCount>=n);node.classList.toggle('is-current',session.state.spinCount+1===n);});
  $('normalButton').disabled=busy||session.active();$('hardcoreButton').disabled=busy||session.active();
  $('settingsButton').disabled=busy;$('playerName').disabled=busy||session.active()||session.state.isEnded();
  $('spinButton').disabled=busy||!previewReady;
  $('spinButton').classList.toggle('is-busy',busy);
  $('spinButton').querySelector('.spin-button__text').textContent=!previewReady?'NAČÍTÁM DEV…':busy?'TOČÍME…':session.state.isEnded()?'VÝSLEDEK SÉRIE':'ROZTOČIT';
  const canCashOut=!hardcore&&session.state.spinCount>0&&!session.state.isEnded();
  $('cashoutButton').hidden=!canCashOut;
  $('cashoutButton').disabled=busy||!canCashOut;
  $('cashoutAmount').textContent=ui.formatMoney(session.state.total);
  $('cashoutConfirmAmount').textContent=ui.formatMoney(session.state.total);
  $('nextPlayerButton').disabled=busy;
  $('restartButton').disabled=busy;
}
function applySettings(draft) {
  if(busy)return false;
  if(!session.applySettings(draft)){
    const message='Pravidla kola lze změnit až po dokončení série. Hlasitost, rychlost a efekty můžeš upravit hned.';
    settingsPanel.showError(message);toast(message);return false;
  }
  settings=settingsManager.save(session.settings);
  applyPresentation();
  if (!session.state.spinCount) { syncNewRun();toast('Nastavení uloženo.');return true; }
  wheel.setSegments(session.segments());
  ui.renderState(session.state);
  if(!session.state.isEnded())ui.setCenterMode('idle',{spins:session.state.spins});
  boardMode=session.category();renderExtras();
  toast('Nastavení uloženo.');return true;
}
function syncNewRun() {
  showtime?.reset();
  clearTimeout(milestoneTimer);$('milestoneBanner').classList.remove('is-visible');
  ui.hideFinal();ui.hideResult();ui.setGameOverVisual(false);ui.microFreeze(false);
  piggy.reset();wheel.setSegments(session.segments());wheel.setSpinDuration(reduced.matches?1000:settings.spinDurationMs);
  ui.resetAnimationMemory(session.state);ui.renderState(session.state);leds.setMode('idle');
  ui.setCenterMode('idle',{spins:session.state.spins});
  ui.setStatus('PŘIPRAVENO','ready');boardMode=session.category();renderExtras();
}
function restart() {if(busy||!session.restart())return;audio.click();syncNewRun();}
function nextPlayer() {if(busy||!session.nextPlayer())return;audio.click();syncNewRun();}
function setMode(mode) {if(busy)return;if(!session.setMode(mode)){toast('Režim přepneš po dokončení série.');return;}audio.click();syncNewRun();}

function canCashOut() {
  return !busy
    && session.mode !== 'hardcore'
    && session.state.spinCount > 0
    && !session.state.isEnded()
    && session.state.phase === 'ready';
}

function openCashOut() {
  if (!canCashOut()) return;
  audio.click();
  $('cashoutConfirmAmount').textContent=ui.formatMoney(session.state.total);
  if(!$('cashoutDialog').open)$('cashoutDialog').showModal();
  $('confirmCashoutButton').focus({preventScroll:true});
}

async function confirmCashOut() {
  if (!canCashOut()) {
    if($('cashoutDialog').open)$('cashoutDialog').close();
    return;
  }

  if($('cashoutDialog').open)$('cashoutDialog').close();
  const run=session.manualFinish();
  if(!run)return;

  busy=true;ui.setBusy(true);renderExtras();
  ui.hideResult();ui.microFreeze(false);ui.renderState(session.state);
  ui.setStatus('SÉRIE UKONČENA HRÁČEM','ready');
  ui.setCenterMode('loss');leds.setMode('idle');
  audio.cashOut();

  if(!reduced.matches){
    particles.screenFlash('normal');
    particles.burst({count:38,intense:false});
    await piggy.explode(session.state.total);
  } else {
    piggy.setTotal(session.state.total);
    $('piggyFinal').classList.add('is-visible');
    $('piggyFinal').setAttribute('aria-hidden','false');
    $('piggyFinalAmount').textContent=ui.formatMoney(session.state.total);
    app.classList.add('is-piggy-finale');
  }

  busy=false;ui.setBusy(false);renderExtras();
  if(session.rank(run)===1)audio.milestone();
  await showResult({animate:true});

  if(!session.storageAvailable)toast('Prohlížeč nepovolil uložení. Stáhni si zálohu v archivu.');
}

async function showResult({animate=false}={}) {
  const run=session.result();if(!run||busy)return;
  studio.fillResult(run);
  $('overlay').setAttribute('aria-hidden','false');
  if(animate&&!reduced.matches)await ui.showFinal(run.loss);
  else {if(!$('overlay').open)$('overlay').showModal();$('overlay').classList.add('is-visible');$('finalAmount').textContent=ui.formatMoney(run.loss);}
  $('restartButton').focus({preventScroll:true});
}
function milestone(before,after,previousRecord) {
  let message='';
  if(previousRecord>0&&before<=previousRecord&&after>previousRecord)message='♛ NOVÝ REKORD · '+ui.formatMoney(after);
  else {const mark=[500,1000,2500,5000,10000].find(n=>before<n&&after>=n);if(mark)message='✦ '+ui.formatMoney(mark)+' V PRASÁTKU';}
  if(!message)return;
  $('milestoneBanner').textContent=message;$('milestoneBanner').classList.add('is-visible');
  audio.milestone();clearTimeout(milestoneTimer);milestoneTimer=setTimeout(()=>$('milestoneBanner').classList.remove('is-visible'),2700);
}
async function spin() {
  if(!previewReady||busy||settingsPanel.isOpen()||$('studioDialog').open||$('overlay').open||$('cashoutDialog').open)return;
  if(session.state.isEnded()){showResult();return;}
  let record;
  const token=++spinToken;
  try {
    audio.ensure();
    const landing=wheel.planLanding();
    const previousRecord=Math.max(0,...session.board().map(r=>r.loss));
    busy=true;ui.setBusy(true);renderExtras();
    showtime?.hideResult();
    ui.hideResult();ui.setGameOverVisual(false);ui.setStatus('ROZTÁČÍM…','spinning');
    // Commit exactly the selected result before animation. Reload cannot reroll it.
    record=session.play(landing.index);
    showtime?.render(session,{busy});
    ui.spins.textContent=Math.max(0,record.remainingSpins-(record.extraSpins??0));
    ui.spinRun.textContent=session.state.spinCount;
    await wheel.spinRandom(undefined,landing);
    if(token!==spinToken)return;
    ui.microFreeze(false);
    const tier=rewardTier(record,session.mode);
    wheel.revealWinner(landing.index);leds.flashWinner();
    audio.impact(tier==='big'||record.type==='multiplier'?'heavy':'soft');
    if(!reduced.matches&&settings.effects!=='low')parallax.punch(tier==='big'?'normal':'soft');
    ui.setCenterMode('result',{record,isEnding:session.state.isEnded()});
    ui.showResult(record,session.state.isEnded()?'final':tier);
    showtime?.reveal(record,{ending:session.state.isEnded(),tier});
    let feeding=Promise.resolve();
    if(record.type==='multiplier') {audio.multiplier(record.multiplier);piggy.pulseMultiplier(record.after);}
    else {audio.money(record.value,tier);feeding=piggy.feed(record.value,record.after);}
    if(record.extraSpins>0)audio.extraSpin(0.22);
    if(!reduced.matches){
      particles.burst({count:tier==='big'||record.type==='multiplier'?55:tier==='medium'?24:10,intense:tier==='big'});
      if(tier==='big'||record.type==='multiplier')particles.screenFlash('normal');
    }
    await wait(reduced.matches?40:200);ui.flyReward(record);
    ui.renderState(session.state,{animateTotalFrom:reduced.matches?null:record.before});
    await feeding;
    renderExtras();
    if(!session.state.isEnded())milestone(record.before,record.after,previousRecord);
    await wait(reduced.matches?80:development&&record.type==='multiplier'?1250:650);
    ui.hideResult();
    showtime?.hideResult();
    if(session.state.isEnded()) {
      if(session.mode==='normal')audio.lossFinale();else audio.multiplier(1);
      ui.setStatus('SÉRIE UZAVŘENA','ready');
      if(!reduced.matches)await piggy.explode(session.state.total);
      else {piggy.setTotal(session.state.total);$('piggyFinal').classList.add('is-visible');$('piggyFinalAmount').textContent=ui.formatMoney(session.state.total);app.classList.add('is-piggy-finale');}
      ui.setCenterMode('loss');leds.setMode('idle');
    } else {
      if(session.mode==='hardcore'&&session.state.spinCount===2){
        app.classList.add('is-wheel-switching');audio.wheelSwitch();
        await wait(150);wheel.setSegments(session.segments());app.classList.remove('is-wheel-switching');
      }
      ui.setCenterMode('idle',{spins:session.state.spins});ui.setSpinPhase('idle');leds.setMode('idle');
      ui.setStatus(session.mode==='hardcore'&&session.state.spins===1?'FINÁLE · TEĎ PŘIJDE NÁSOBIČ':'+SPIN · PŘIPRAVENO','ready');
    }
  } catch(error) {
    console.error('Spin presentation failed',error);
    // A resolved draw remains committed even if its visual/audio reveal fails.
    ui.microFreeze(false);ui.hideResult();
    showtime?.reset();
    wheel.setSegments(session.segments());ui.renderState(session.state);piggy.setTotal(session.state.total);leds.setMode('idle');
    ui.setStatus('VÝSLEDEK ZACHOVÁN','ready');
    toast(record?'Výsledek je uložený. Animaci se nepodařilo dokončit.':error.message);
  } finally {
    busy=false;ui.setBusy(false);renderExtras();
  }
  if(session.state.isEnded()) {
    const result=session.result();
    if(result&&session.rank(result)===1)audio.milestone();
    await showResult({animate:true});
  }
  if(!session.storageAvailable)toast('Prohlížeč nepovolil uložení. Stáhni si zálohu v archivu.');
}

$('spinButton').addEventListener('click',spin);
$('cashoutButton').addEventListener('click',openCashOut);
$('cancelCashoutButton').addEventListener('click',()=>$('cashoutDialog').close());
$('confirmCashoutButton').addEventListener('click',confirmCashOut);
$('restartButton').addEventListener('click',restart);
$('normalButton').addEventListener('click',()=>setMode('normal'));
$('hardcoreButton').addEventListener('click',()=>setMode('hardcore'));
$('muteButton').addEventListener('click',()=>ui.setMuted(audio.toggle()));
$('previewSound').addEventListener('click',()=>{audio.ensure();audio.preview();});
$('fullscreenButton').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('Tento prohlížeč nepodporuje celou obrazovku.');}});
$('boardTabs').addEventListener('click',e=>{const button=e.target.closest('[data-board]');if(button){boardMode=button.dataset.board;renderBoard();audio.click();}});
$('amountEmote').addEventListener('error',()=>$('amountEmote').parentElement.classList.add('is-fallback'),{once:true});
// img can fail before the event handler is installed.
if($('amountEmote').complete&&!$('amountEmote').naturalWidth)$('amountEmote').parentElement.classList.add('is-fallback');
$('overlay').addEventListener('cancel',()=>ui.hideFinal());
document.querySelector('.brand').addEventListener('click',e=>e.preventDefault());
document.addEventListener('pointerdown',()=>audio.ensure(),{once:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.silence();else if(!audio.muted)audio.startAmbience();});
reduced.addEventListener('change',applyPresentation);
document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
  const key=event.key.toLowerCase();
  if($('overlay').open){if(key==='r'){event.preventDefault();restart();}return;}
  if(settingsPanel.isOpen()||$('studioDialog').open)return;
  if(event.code==='Space'){
    if(event.target.closest('button')&&event.target!==$('spinButton'))return;
    event.preventDefault();spin();
  }else if(key==='r'&&session.state.isEnded())restart();
  else if(key==='e'&&canCashOut())openCashOut();
  else if(key==='h')setMode(session.mode==='hardcore'?'normal':'hardcore');
  else if(key==='m')ui.setMuted(audio.toggle());
  else if(key==='s')settingsPanel.open();
  else if(key==='f')$('fullscreenButton').click();
});

applyPresentation();ui.setMuted(audio.muted);ui.renderState(session.state);piggy.setTotal(session.state.total);
ui.setCenterMode('idle',{spins:session.state.spins});leds.setMode('idle');renderExtras();
if(session.resumed){
  ui.setStatus('SÉRIE OBNOVENA','ready');
  toast('Obnovena poslední série hráče '+session.player+'.');
  if(session.state.isEnded()){
    app.classList.add('is-piggy-finale');$('piggyFinal').classList.add('is-visible');$('piggyFinal').setAttribute('aria-hidden','false');$('piggyFinalAmount').textContent=ui.formatMoney(session.state.total);
    ui.setCenterMode('loss');showResult();
  }
}else ui.setStatus('PŘIPRAVENO','ready');

if(development){
  import('./dev/Showtime.js').then(({Showtime})=>{
    showtime=new Showtime();
    previewReady=true;
    renderExtras();
  }).catch(error=>{
    console.error('Development presentation failed to load',error);
    previewReady=true;
    renderExtras();
    toast('Dev vzhled se nepodařilo načíst. Obnov stránku.');
  });
}
