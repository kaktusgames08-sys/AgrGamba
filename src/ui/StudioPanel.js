const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(value) + ' Kč';
const MODES = {normal:'Klasika',hardcore:'Hardcore',custom:'Vlastní'};
const date = value => value ? new Date(value).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Původní záznam';
export function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function toast(text) {
  const node=$('toast');
  clearTimeout(toast.timer);node.textContent=text;node.classList.add('is-visible');
  toast.timer=setTimeout(()=>node.classList.remove('is-visible'),4200);
}

export class StudioPanel {
  constructor(session, callbacks) {
    this.session=session;this.callbacks=callbacks;this.dialog=$('studioDialog');this.content=$('studioContent');
    this.filter='all';this.view='';this.obs={enabled:false,panels:['left','right','hud']};
    $('studioClose').addEventListener('click',()=>this.dialog.close());
    this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
    for(const [id,view] of [['archiveButton','archive'],['allResultsButton','archive'],['queueButton','queue'],['profilesButton','profiles'],['obsButton','obs']]) $(id).addEventListener('click',()=>this.open(view));
    $('playerName').addEventListener('change',e=>{if(!session.setPlayer(e.target.value))toast('Jméno lze změnit před první otočkou.');this.callbacks.onRefresh();});
    $('nextPlayerButton').addEventListener('click',()=>this.callbacks.onNext());
    $('closeResultButton').addEventListener('click',()=>this.callbacks.onCloseResult());
    $('openResultButton').addEventListener('click',()=>this.callbacks.onResult());
    $('copyResultButton').addEventListener('click',()=>this.copyResult());
    $('downloadResultButton').addEventListener('click',()=>this.downloadResult());
    this.content.addEventListener('click',e=>this.click(e));
    this.content.addEventListener('submit',e=>this.submit(e));
    this.content.addEventListener('change',e=>this.change(e));
    const params=new URLSearchParams(location.search);
    if(params.get('obs')==='1') {this.obs.enabled=true;this.obs.panels=(params.get('panels')??'left,right,hud').split(',').filter(p=>['left','right','hud'].includes(p));}
    this.applyObs();
  }
  render() {
    const s=this.session;
    $('playerName').value=s.player;
    $('playerName').disabled=s.active()||s.state.isEnded()||this.callbacks.isBusy();
    $('queueSummary').textContent=s.queue.length?'Další: '+s.queue[0]+(s.queue.length>1?' · +'+(s.queue.length-1):''):'Další hráč? Přidej ho do fronty.';
    $('historyCount').textContent=String(s.state.spinCount);
    const board=s.board();
    const target=Math.max(0,...board.filter(r=>r.id!==s.runId).map(r=>r.loss));
    $('recordTarget').textContent=target?money(target):'První série';
    $('recordProgress').querySelector('span').textContent='REKORD · '+MODES[s.category()].toUpperCase();
    $('recordProgressFill').style.width=(target?Math.min(100,s.state.total/target*100):0)+'%';
    $('piggyCrown').hidden=!(s.state.total>target&&target>0);
    const odds=s.summary();
    $('chanceBadge').textContent=odds.count+' polí · stejná šance';
    $('remainingLabel').textContent=s.state.spins===1?'spin zbývá':s.state.spins>=2&&s.state.spins<=4?'spiny zbývají':'spinů zbývá';
    $('oddsText').textContent=s.mode==='hardcore'?'Pevně 3 spiny · finále ×1 až ×2,5':'KONEC: '+odds.endCount+' z '+odds.count+' polí · '+(odds.endChance*100).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' %';
    $('oddsText').title=s.mode==='hardcore'?'Dvě peněžní kola a jedno kolo násobičů.':'Každý spin je nezávislý. Průměrná série při tomto nastavení: '+odds.meanSpins.toLocaleString('cs-CZ',{maximumFractionDigits:1})+' spinů.';
    $('endRule').textContent=s.mode==='hardcore'?'Třetí spin násobí celou částku.':'Bez +SPIN ubude jeden spin.';
    document.querySelector('.live-indicator').textContent=this.callbacks.isBusy()?'VE HŘE':s.state.isEnded()?'DOHRÁNO':'U STOLU';
  }
  fillResult(run) {
    if(!run)return;
    const rank=this.session.rank(run);
    $('resultPlayer').textContent=run.name;
    $('resultTitle').textContent=run.endedBy==='manual'
      ? 'UKONČENO HRÁČEM'
      : rank===1
        ? 'NOVÝ VRCHOL ŽEBŘÍČKU'
        : 'SÉRIE JE U KONCE';
    $('resultRank').textContent=(rank<=3?'♛ ':'')+rank+'. místo · '+MODES[run.mode];
    $('resultSpins').textContent=run.streak;
    $('resultMultipliers').textContent=run.multipliers;
    $('resultMode').textContent=MODES[run.mode].toUpperCase();
    $('resultSaved').textContent=this.session.storageAvailable?'✓ Výsledek uložen v tomto prohlížeči':'Uloženo v paměti · stáhni zálohu před zavřením';
    $('nextPlayerButton').hidden=!this.session.queue.length;
    $('nextPlayerButton').textContent=this.session.queue.length?'DALŠÍ: '+this.session.queue[0]+' →':'DALŠÍ HRÁČ →';
  }
  async copyResult() {
    const run=this.session.result();if(!run)return;
    const ending=run.endedBy==='manual'?' — ukončeno hráčem':'';
    const text=run.name+' — '+money(run.loss)+' — '+run.streak+' spinů — '+MODES[run.mode]+ending+' | Kolo neštěstí';
    try {await navigator.clipboard.writeText(text);toast('Výsledek zkopírován.');}
    catch {toast('Kopírování není dostupné. Výsledek můžeš uložit jako obrázek.');}
  }
  downloadResult() {
    const run=this.session.result();if(!run)return;
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=675;
    const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,1200,675);gradient.addColorStop(0,'#381c31');gradient.addColorStop(1,'#120b15');ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,675);
    ctx.strokeStyle='#d9b26c';ctx.lineWidth=2;ctx.strokeRect(28,28,1144,619);
    ctx.textAlign='center';ctx.fillStyle='#d9b26c';ctx.font='600 19px sans-serif';ctx.fillText('KOLO NEŠTĚSTÍ  /  CASINO EDITION',600,92);
    ctx.font='52px Georgia';ctx.fillStyle='#fff1d7';ctx.fillText(run.name,600,190,1020);
    ctx.fillStyle='#ffe1a0';ctx.font='bold 116px sans-serif';ctx.fillText(money(run.loss),600,342,1040);
    ctx.fillStyle='#d9b26c';ctx.font='26px sans-serif';ctx.fillText(this.session.rank(run)+'. místo  ·  '+MODES[run.mode],600,408);
    ctx.strokeStyle='#d9b26c40';ctx.beginPath();ctx.moveTo(220,448);ctx.lineTo(980,448);ctx.stroke();
    ctx.fillStyle='#d4c0ce';ctx.font='24px sans-serif';ctx.fillText(run.streak+' SPINŮ       /       '+run.multipliers+' NÁSOBIČŮ',600,504);
    ctx.font='17px sans-serif';ctx.fillStyle='#aa92a3';ctx.fillText(date(run.endedAt),600,589);
    canvas.toBlob(blob=>{if(blob)downloadBlob(blob,'Kolo-nestesti-'+run.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png');},'image/png');
  }
  open(view) {
    if(!this.callbacks.canOpen()){toast('Počkej na dokončení spinu.');return;}
    this.view=view;this.renderDialog();
    if(!this.dialog.open)this.dialog.showModal();
  }
  renderDialog() {
    const s=this.session;
    const titles={archive:'Archiv sérií',queue:'Fronta hráčů',profiles:'Profily kola',obs:'Režim pro OBS'};
    $('studioTitle').textContent=titles[this.view]??'Detail série';
    if(this.view==='queue'){
      this.content.innerHTML='<p class="help-text">Aktuálně hraje <b>'+esc(s.player)+'</b>. Fronta se posune až po stisknutí „Další hráč“.</p><form id="queueForm" class="queue-form"><label class="form-label">Každého hráče napiš na nový řádek<textarea id="queueNames" maxlength="3300" placeholder="Kaktus&#10;Agraelus&#10;Další hráč">'+esc(s.queue.join('\n'))+'</textarea></label><button type="submit" class="primary-button">ULOŽIT FRONTU</button></form><p class="help-text" style="margin-top:18px">Jméno aktuálního hráče měníš v panelu U stolu před prvním spinem. Fronta pojme 100 hráčů.</p>';
    } else if(this.view==='archive'){
      const runs=[...s.runs].filter(r=>this.filter==='all'||r.mode===this.filter).reverse();
      this.content.innerHTML='<p class="help-text">Výsledky jsou uložené v tomto prohlížeči. Pro přenos do jiného počítače nebo OBS stáhni zálohu.</p><div class="studio-toolbar"><select id="archiveFilter" aria-label="Filtrovat archiv">'+[['all','Všechny režimy'],...Object.entries(MODES)].map(([v,t])=>'<option value="'+v+'" '+(this.filter===v?'selected':'')+'>'+t+'</option>').join('')+'</select><span class="spacer"></span><button data-action="export" class="quiet-button">↓ Záloha JSON</button><button data-action="import" class="quiet-button">↑ Importovat</button><input id="backupFile" type="file" accept="application/json,.json" hidden/></div>'+(runs.length?'<table class="archive-table"><thead><tr><th>HRÁČ / DATUM</th><th>ČÁSTKA</th><th>SPINY</th><th>REŽIM</th><th></th></tr></thead><tbody>'+runs.map(r=>'<tr><td>'+esc(r.name)+'<small>'+esc(date(r.endedAt))+'</small></td><td>'+money(r.loss)+'</td><td>'+r.streak+'</td><td><span class="mode-tag">'+MODES[r.mode]+'</span></td><td><button data-detail="'+esc(r.id)+'">Detail ↗</button></td></tr>').join('')+'</tbody></table>':'<div class="empty-state">Tady začíná historie.<br>Dokonči první sérii v tomto režimu.</div>');
    } else if(this.view==='profiles'){
      this.content.innerHTML='<p class="help-text">Profil uloží políčka, počáteční spiny, rychlost i prezentaci. Herní pravidla můžeš načíst mezi sériemi.</p><form id="profileForm" class="profile-form"><input id="profileName" maxlength="40" required placeholder="Např. Páteční stream" aria-label="Název profilu"/><button class="primary-button" type="submit">ULOŽIT AKTUÁLNÍ</button></form><div class="profile-list">'+(s.profiles.length?s.profiles.map(p=>'<div class="profile-item"><span>'+esc(p.name)+'<small>'+p.settings.segments.length+' polí · '+(p.settings.spinDurationMs/1000).toFixed(1)+' s</small></span><button data-profile="'+esc(p.id)+'" class="quiet-button">Načíst</button></div>').join(''):'<div class="empty-state">Zatím nemáš uložený profil.</div>')+'</div><p class="help-text" style="margin-top:20px">Stejný název aktualizuje existující profil. Profily jsou součástí JSON zálohy v archivu.</p>';
    } else if(this.view==='obs'){
      this.content.innerHTML='<p class="help-text">Průhledné pozadí pro OBS Browser Source. Doporučená velikost 1920 × 1080. Horní ovládání se ukáže po najetí myší; fungují také klávesové zkratky.</p><div class="obs-options"><label><input id="obsEnabled" type="checkbox" '+(this.obs.enabled?'checked':'')+'/> Průhledné pozadí</label>'+[['hud','Horní částka a hlavička'],['left','Hráč a žebříček'],['right','Prasátko a historie']].map(([id,label])=>'<label><input type="checkbox" data-obs-option="'+id+'" '+(this.obs.panels.includes(id)?'checked':'')+'/> '+label+'</label>').join('')+'</div><button class="primary-button" data-action="copy-obs">KOPÍROVAT ODKAZ PRO OBS</button><p class="help-text" style="margin-top:20px">OBS používá vlastní úložiště. Archiv a profily přeneseš zálohou JSON. Roztočení ovládáš přes Interakci se zdrojem v OBS.</p>';
    }
  }
  async change(e) {
    if(e.target.id==='archiveFilter'){this.filter=e.target.value;this.renderDialog();}
    if(e.target.id==='backupFile'){
      const file=e.target.files[0];if(!file)return;
      try {
        const data=JSON.parse(await file.text());
        this.session.importData(data);this.callbacks.onRefresh();this.renderDialog();toast('Záloha připojena. Stejné série se neduplikují.');
      } catch(error){toast(error instanceof SyntaxError?'Soubor není platný JSON.':error.message);}
    }
    if(e.target.id==='obsEnabled'||e.target.matches('[data-obs-option]')){
      this.obs.enabled=$('obsEnabled').checked;
      this.obs.panels=[...this.content.querySelectorAll('[data-obs-option]:checked')].map(n=>n.dataset.obsOption);this.applyObs();
    }
  }
  submit(e) {
    e.preventDefault();
    if(e.target.id==='queueForm'){this.session.setQueue($('queueNames').value.split('\n'));this.callbacks.onRefresh();toast('Fronta hráčů uložena.');this.dialog.close();}
    if(e.target.id==='profileForm') {try{this.session.saveProfile($('profileName').value);this.renderDialog();toast('Profil uložen.');}catch(error){toast(error.message);}}
  }
  async click(e) {
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.detail){
      const run=this.session.runs.find(r=>r.id===button.dataset.detail);if(!run)return;
      $('studioTitle').textContent=run.name+' · '+money(run.loss);
      this.content.innerHTML='<div class="studio-toolbar"><button data-action="back" class="quiet-button">← Zpět</button><span class="muted">'+run.streak+' spinů · '+MODES[run.mode]+'</span></div>'+(run.legacy?'<div class="empty-state">Původní ručně zadaný výsledek.<br>Podrobný průběh nebyl uložen.</div>':'<ol class="spin-detail">'+[...run.history].reverse().map((r,i)=>'<li><span>#'+(i+1)+' · '+esc(r.type==='multiplier'?'×'+r.multiplier:'+'+r.value+' Kč')+'</span><b>'+money(r.after)+'</b></li>').join('')+'</ol>');
    }
    if(button.dataset.profile){
      const profile=this.session.profiles.find(p=>p.id===button.dataset.profile);
      if(profile && this.callbacks.onApply(profile.settings)){this.dialog.close();toast('Profil „'+profile.name+'“ načten.');}
    }
    if(button.dataset.action==='back')this.renderDialog();
    if(button.dataset.action==='export')downloadBlob(new Blob([JSON.stringify(this.session.exportData(),null,2)],{type:'application/json'}),'Kolo-nestesti-zaloha-'+new Date().toISOString().slice(0,10)+'.json');
    if(button.dataset.action==='import')$('backupFile').click();
    if(button.dataset.action==='copy-obs'){
      const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('obs','1');url.searchParams.set('panels',this.obs.panels.join(','));
      try{await navigator.clipboard.writeText(url.href);toast('Odkaz pro OBS zkopírován.');}catch{toast('Kopírování není dostupné. Přidej k adrese ?obs=1.');}
    }
  }
  applyObs(){document.documentElement.classList.toggle('obs-mode',this.obs.enabled);document.body.classList.toggle('obs-mode',this.obs.enabled);document.querySelectorAll('[data-obs-panel]').forEach(n=>n.dataset.obsHidden=String(!this.obs.panels.includes(n.dataset.obsPanel)));}
}
