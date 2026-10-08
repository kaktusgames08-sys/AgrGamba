import './showtime.css';

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('cs-CZ', {maximumFractionDigits:0}).format(value) + ' Kč';
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class Showtime {
  constructor() {
    this.app = $('app');
    this.app.classList.add('dev-preview');
    document.documentElement.dataset.preview = 'showtime';
    document.title = 'Kolo neštěstí · DEV Showtime';

    const scene = make('div', 'showtime-scene');
    scene.setAttribute('aria-hidden', 'true');
    const lights = make('div', 'showtime-lights');
    lights.setAttribute('aria-hidden', 'true');
    lights.append(make('i', 'showtime-spotlight showtime-spotlight--left'), make('i', 'showtime-spotlight showtime-spotlight--right'));
    this.app.prepend(scene, lights);

    const preview = make('div', 'showtime-preview-label');
    preview.append(make('span', '', 'DEV NÁHLED'), make('span', 'showtime-preview-caption', 'ODDĚLENÁ TESTOVACÍ DATA'));
    const exit = make('a', 'showtime-preview-exit', 'Hlavní verze ↗');
    const url = new URL(location.href);
    for (const key of ['dev', 'obs', 'panels']) url.searchParams.delete(key);
    exit.href = url.href;
    preview.append(exit);
    this.app.prepend(preview);
    document.querySelector('.brand__eyebrow').textContent = 'AGRGAMBA · SHOWTIME';

    const player = make('div', 'showtime-player');
    this.avatar = make('span', 'showtime-player-avatar', 'H');
    this.avatar.setAttribute('aria-hidden', 'true');
    const playerCopy = make('div', 'showtime-player-copy');
    playerCopy.append(make('span', '', 'PRÁVĚ HRAJE'));
    this.playerName = make('strong', '', 'Host');
    playerCopy.append(this.playerName);
    this.spinNumber = make('span', 'showtime-spin-number', '1. SPIN');
    player.append(this.avatar, playerCopy, this.spinNumber);
    $('machineStage').prepend(player);

    const plinth = make('div', 'showtime-wheel-plinth');
    plinth.setAttribute('aria-hidden', 'true');
    document.querySelector('.wheel-stage').append(plinth);
    const ornaments = make('div', 'showtime-wheel-studs');
    ornaments.setAttribute('aria-hidden', 'true');
    for (let index=0; index<12; index++) {
      const stud = make('i', '');
      const angle=index*Math.PI/6;
      stud.style.left=(50+47.5*Math.sin(angle))+'%';
      stud.style.top=(50-47.5*Math.cos(angle))+'%';
      ornaments.append(stud);
    }
    $('wheelShell').append(ornaments);

    this.pigSprite = make('div', 'showtime-pig-sprite');
    this.pigSprite.setAttribute('aria-hidden', 'true');
    $('piggyBank').prepend(this.pigSprite);
    $('piggyBank').append(make('div', 'showtime-pig-pedestal'));
    this.progressCopy = make('p', 'showtime-record-distance', '');
    $('recordProgress').append(this.progressCopy);
    this.result = make('div', 'showtime-result');
    this.result.setAttribute('role', 'status');
    this.result.setAttribute('aria-live', 'polite');
    this.resultLabel = make('span', 'showtime-result-label');
    this.resultValue = make('strong', 'showtime-result-value');
    this.resultDetail = make('span', 'showtime-result-detail');
    this.result.append(this.resultLabel, this.resultValue, this.resultDetail);
    document.querySelector('.wheel-stage').append(this.result);
  }

  render(session, {busy=false}={}) {
    this.playerName.textContent = session.player;
    this.playerName.title = session.player;
    this.avatar.textContent = Array.from(session.player.trim())[0]?.toUpperCase() ?? 'H';
    this.spinNumber.textContent = Math.max(1, session.state.spinCount + (busy || session.state.isEnded() ? 0 : 1)) + '. SPIN';
    const target = Math.max(0, ...session.board().filter(run=>run.id!==session.runId).map(run=>run.loss));
    this.progressCopy.textContent = target > session.state.total
      ? 'DO REKORDU ' + money(target-session.state.total)
      : target > 0 && session.state.total > target
        ? 'NOVÝ VRCHOL ŽEBŘÍČKU'
        : target > 0
          ? 'REKORD VYROVNÁN'
          : 'TADY ZAČÍNÁ HISTORIE';
    this.app.classList.toggle('showtime-record', target>0 && session.state.total>target);
    if (!busy) {
      this.pigSprite.dataset.expression = session.state.total >= 1700 ? 'cracked' : 'idle';
    }
  }

  reveal(record, {ending=false,tier='small'}={}) {
    const multiplier = record.type === 'multiplier';
    this.result.dataset.kind = ending ? 'final' : multiplier ? 'multiplier' : 'money';
    this.resultLabel.textContent = ending ? 'POSLEDNÍ POLÍČKO' : multiplier ? 'NÁSOBIČ ×' + record.multiplier : tier === 'big' ? 'PĚKNÝ HIT' : 'PŘIČÍTÁM';
    this.resultValue.textContent = multiplier
      ? money(record.before) + ' → ' + money(record.after)
      : '+' + money(record.value);
    this.resultDetail.textContent = ending ? 'SÉRIE SE UZAVÍRÁ' : record.extraSpins ? '+ SPIN · JEDEME DÁL' : record.hardcore ? 'HARDCORE' : 'BEZ +SPIN';
    this.result.classList.add('is-visible');
    this.app.classList.add('showtime-reveal');
    this.app.classList.toggle('showtime-double', multiplier && record.after > record.before);
    this.pigSprite.dataset.expression = ending ? 'cracked' : multiplier ? 'surprised' : 'happy';
  }

  hideResult() {
    this.result.classList.remove('is-visible');
    this.resultLabel.textContent = '';
    this.resultValue.textContent = '';
    this.resultDetail.textContent = '';
    this.app.classList.remove('showtime-reveal','showtime-double');
  }

  reset() {
    this.hideResult();
    this.app.classList.remove('showtime-record');
    this.pigSprite.dataset.expression = 'idle';
  }
}
