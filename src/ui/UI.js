import { RollingCounter } from './RollingCounter.js';

export class UI {
  constructor() {
    this.app = document.querySelector('#app');
    this.machineStage = document.querySelector('#machineStage');
    this.money = document.querySelector('#moneyCounter');
    this.spins = document.querySelector('#spinCounter');
    this.spinRun = document.querySelector('#spinRunCounter');
    this.history = document.querySelector('#history');
    this.historyPanel = document.querySelector('#historyPanel');
    this.spinButton = document.querySelector('#spinButton');

    this.centerMedallion = document.querySelector('#centerMedallion');
    this.centerTop = document.querySelector('#centerTop');
    this.centerValue = document.querySelector('#centerValue');
    this.centerBottom = document.querySelector('#centerBottom');

    this.resultBurst = document.querySelector('#resultBurst');
    this.resultEyebrow = document.querySelector('#resultEyebrow');
    this.resultMain = document.querySelector('#resultMain');
    this.resultSub = document.querySelector('#resultSub');

    this.gameStatus = document.querySelector('#gameStatus');
    this.gameStatusText = document.querySelector('#gameStatusText');

    this.overlay = document.querySelector('#overlay');
    this.finalAmount = document.querySelector('#finalAmount');
    this.restartButton = document.querySelector('#restartButton');
    this.muteButton = document.querySelector('#muteButton');
    this.fullscreenButton = document.querySelector('#fullscreenButton');
    this.wheelShell = document.querySelector('#wheelShell');
    this.rewardFlightLayer = document.querySelector('#rewardFlightLayer');

    this.moneyRoller = new RollingCounter(this.money, { suffix: ' Kč' });

    this.lastTotal = null;
    this.lastSpins = null;
    this.lastSpinCount = null;
    this.hideTimer = null;
  }

  formatMoney(value) {
    return new Intl.NumberFormat('cs-CZ', {
      maximumFractionDigits: 0,
    }).format(Math.round(value)) + ' Kč';
  }

  bump(element, className = 'is-bumping') {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  renderState(state, { animateTotalFrom = null } = {}) {
    const totalChanged = this.lastTotal !== null && this.lastTotal !== state.total;
    const spinsChanged = this.lastSpins !== null && this.lastSpins !== state.spins;
    const spinCountChanged = this.lastSpinCount !== null && this.lastSpinCount !== state.spinCount;

    if (animateTotalFrom !== null && animateTotalFrom !== state.total) {
      this.moneyRoller.value = Math.max(0, Math.round(Number(animateTotalFrom) || 0));
      this.moneyRoller.set(state.total, { animate: true, duration: 700 });
    } else {
      this.moneyRoller.set(state.total, { animate: false });
      if (totalChanged) this.bump(this.money, 'is-money-bumping');
    }

    this.spins.textContent = state.spins;
    this.spinRun.textContent = state.spinCount;

    if (this.centerMedallion?.dataset.mode === 'idle' || this.centerMedallion?.dataset.mode === 'ready') {
      this.setCenterMode('idle', { spins: state.spins });
    }

    if (spinsChanged) {
      this.bump(this.spins, 'is-spin-bumping');
      if (this.centerValue?.textContent === String(state.spins)) {
        this.bump(this.centerValue, 'is-spin-bumping');
      }
    }

    if (spinCountChanged) {
      this.bump(this.spinRun, 'is-run-bumping');
    }

    this.lastTotal = state.total;
    this.lastSpins = state.spins;
    this.lastSpinCount = state.spinCount;
    this.renderHistory(state.history);
  }

  renderHistory(records) {
    if (!records.length) {
      this.history.innerHTML = '<div class="history-empty">Zatím nic</div>';
      return;
    }

    this.history.innerHTML = records.map((record, index) => {
      const label = record.type === 'multiplier'
        ? 'x' + record.multiplier
        : '+' + record.value + ' Kč';

      const extra = record.extraSpins
        ? '<span>+SPIN</span>'
        : '<span class="history-final">KONEC</span>';

      return '<div class="history-item history-item--' + record.type + '" style="--history-delay:' + (index * 35) + 'ms">'
        + '<strong>' + label + '</strong>'
        + extra
        + '</div>';
    }).join('');
  }

  setBusy(busy) {
    this.spinButton.disabled = busy;
    this.spinButton.classList.toggle('is-busy', busy);
    this.app.classList.toggle('game-is-busy', busy);
  }

  setStatus(text, tone = 'ready') {
    this.gameStatusText.textContent = text;
    this.gameStatus.dataset.tone = tone;
    this.gameStatus.classList.remove('is-pulsing');
    void this.gameStatus.offsetWidth;
    this.gameStatus.classList.add('is-pulsing');
  }

  setSpinPhase(phase) {
    this.app.dataset.spinPhase = phase;
    this.machineStage.dataset.phase = phase;

    if (phase === 'spinning') {
      this.setCenterMode('spinning');
    } else if (phase === 'anticipation-1') {
      this.setCenterMode('anticipating', { stage: 1 });
    } else if (phase === 'anticipation-2') {
      this.setCenterMode('anticipating', { stage: 2 });
    } else if (phase === 'anticipation-3' || phase === 'settling') {
      this.setCenterMode('anticipating', { stage: 3 });
    }
  }

  setCenterMode(mode, payload = {}) {
    if (!this.centerMedallion) return;

    this.centerMedallion.dataset.mode = mode;

    if (mode === 'idle') {
      this.centerTop.textContent = 'SPINY';
      this.centerValue.textContent = payload.spins ?? this.lastSpins ?? 0;
      this.centerBottom.textContent = 'ZBÝVÁ';
      return;
    }

    if (mode === 'spinning') {
      this.centerTop.textContent = 'TOČÍM';
      this.centerValue.textContent = '?';
      this.centerBottom.textContent = '…';
      return;
    }

    if (mode === 'anticipating') {
      const stage = payload.stage ?? 1;
      this.centerTop.textContent = stage >= 3 ? 'TEĎ' : 'POZOR';
      this.centerValue.textContent = stage === 1 ? '···' : stage === 2 ? '•••' : '!';
      this.centerBottom.textContent = stage >= 3 ? '!' : '…';
      return;
    }

    if (mode === 'result') {
      const record = payload.record;
      this.centerTop.textContent = payload.isEnding ? 'KONEC' : 'PADLO';
      this.centerValue.textContent = payload.isEnding ? '!' : '✓';
      this.centerBottom.textContent = payload.isEnding
        ? 'STOP'
        : record?.extraSpins
          ? '+ SPIN'
          : 'BEZ SPINU';
      return;
    }

    if (mode === 'loss') {
      this.centerTop.textContent = 'STOP';
      this.centerValue.textContent = '×';
      this.centerBottom.textContent = 'KONEC';
    }
  }

  showResult(record, tier = 'small') {
    clearTimeout(this.hideTimer);
    this.app.classList.add('has-result-burst');

    const isMultiplier = record.type === 'multiplier';
    const isFinal = tier === 'final';

    this.resultBurst.className = 'result-burst result-burst--stage '
      + (isMultiplier ? 'is-multiplier ' : 'is-money ')
      + (isFinal ? 'is-final-result ' : '')
      + 'reward-tier-' + tier;

    this.resultEyebrow.textContent = isFinal
      ? 'POSLEDNÍ POLÍČKO'
      : isMultiplier
        ? 'NÁSOBIČ'
        : tier === 'big'
          ? 'VELKÝ HIT'
          : 'PŘIČÍTÁM';

    this.resultMain.textContent = isMultiplier
      ? 'DOUBLE!'
      : '+' + record.value + ' Kč';

    this.resultSub.textContent = isMultiplier
      ? this.formatMoney(record.before) + ' → ' + this.formatMoney(record.after)
        + (record.extraSpins ? ' · +1 SPIN' : '')
      : record.extraSpins
        ? '+1 SPIN · JEDEME DÁL'
        : isFinal
          ? 'BEZ +SPIN · KONEC'
          : 'BEZ +SPIN';

    requestAnimationFrame(() => {
      this.resultBurst.classList.add('is-visible');
    });
  }

  hideResult() {
    this.app.classList.remove('has-result-burst');

    if (!this.resultBurst.classList.contains('is-visible')) return;

    this.resultBurst.classList.add('is-leaving');
    this.hideTimer = setTimeout(() => {
      this.resultBurst.classList.remove('is-visible', 'is-leaving');
    }, 230);
  }

  flyReward(record) {
    if (!this.rewardFlightLayer || !this.wheelShell) return;

    const source = this.wheelShell.getBoundingClientRect();
    const sourceX = source.left + source.width / 2;
    const sourceY = source.top + source.height * 0.46;
    const flights = [];

    if (record.type === 'multiplier') {
      flights.push({
        text: 'x' + record.multiplier,
        className: 'reward-flight--multiplier',
        target: this.money,
        delay: 0,
      });
    }

    if (record.extraSpins) {
      flights.push({
        text: '+1 SPIN',
        className: 'reward-flight--spin',
        target: this.spins,
        delay: 120,
      });
    }

    flights.forEach((flight) => {
      const targetRect = flight.target.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;

      const node = document.createElement('div');
      node.className = 'reward-flight ' + flight.className;
      node.textContent = flight.text;
      node.style.left = sourceX + 'px';
      node.style.top = sourceY + 'px';
      node.style.setProperty('--flight-x', (targetX - sourceX) + 'px');
      node.style.setProperty('--flight-y', (targetY - sourceY) + 'px');
      node.style.setProperty('--flight-delay', flight.delay + 'ms');

      this.rewardFlightLayer.appendChild(node);

      node.addEventListener('animationend', () => {
        node.remove();
        this.bump(
          flight.target,
          flight.className.includes('spin')
            ? 'is-spin-bumping'
            : 'is-money-bumping',
        );
      }, { once: true });
    });
  }

  microFreeze(active = true) {
    this.app.classList.toggle('is-micro-freeze', active);
  }

  cameraPunchClass(strength = 'normal') {
    this.machineStage.classList.remove('camera-punch-soft', 'camera-punch-normal', 'camera-punch-heavy');
    void this.machineStage.offsetWidth;
    this.machineStage.classList.add(
      strength === 'heavy'
        ? 'camera-punch-heavy'
        : strength === 'soft'
          ? 'camera-punch-soft'
          : 'camera-punch-normal',
    );
  }

  shake(strength = 'normal') {
    this.wheelShell.classList.remove('shake-soft', 'shake-normal', 'shake-heavy');
    void this.wheelShell.offsetWidth;

    const className = strength === 'heavy'
      ? 'shake-heavy'
      : strength === 'soft'
        ? 'shake-soft'
        : 'shake-normal';

    this.wheelShell.classList.add(className);
  }

  setMuted(muted) {
    this.muteButton.textContent = muted ? '🔇' : '🔊';
    this.muteButton.setAttribute('aria-label', muted ? 'Zapnout zvuk' : 'Vypnout zvuk');
  }

  applyPresentationSettings(settings) {
    this.app.dataset.effects = settings.effects;
    this.app.dataset.motion = settings.ambientMotion ? 'on' : 'off';
    this.app.dataset.preset = settings.presentationPreset ?? 'arcade';
    this.historyPanel.hidden = !settings.showHistory;
  }

  setGameOverVisual(active) {
    this.app.classList.toggle('is-game-over', active);
    if (active) this.setCenterMode('loss');
  }

  async showFinal(total) {
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-visible');
    this.finalAmount.textContent = '0 Kč';

    const duration = 1100;
    const startedAt = performance.now();

    return new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        this.finalAmount.textContent = this.formatMoney(total * eased);

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          this.bump(this.finalAmount, 'is-final-settled');
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  }

  hideFinal() {
    this.overlay.classList.remove('is-visible');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.finalAmount.classList.remove('is-final-settled');
    this.setGameOverVisual(false);
  }

  resetAnimationMemory(state) {
    this.lastTotal = state.total;
    this.lastSpins = state.spins;
    this.lastSpinCount = state.spinCount;
    this.moneyRoller.value = state.total;
    this.setCenterMode('idle', { spins: state.spins });
    this.setSpinPhase('idle');
  }
}
