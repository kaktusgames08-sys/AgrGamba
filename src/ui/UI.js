export class UI {
  constructor() {
    this.money = document.querySelector('#moneyCounter');
    this.spins = document.querySelector('#spinCounter');
    this.centerSpins = document.querySelector('#centerSpinCounter');
    this.history = document.querySelector('#history');
    this.spinButton = document.querySelector('#spinButton');
    this.resultBurst = document.querySelector('#resultBurst');
    this.resultMain = document.querySelector('#resultMain');
    this.resultSub = document.querySelector('#resultSub');
    this.overlay = document.querySelector('#overlay');
    this.finalAmount = document.querySelector('#finalAmount');
    this.restartButton = document.querySelector('#restartButton');
    this.muteButton = document.querySelector('#muteButton');
    this.fullscreenButton = document.querySelector('#fullscreenButton');
    this.wheelShell = document.querySelector('#wheelShell');
    this.lastTotal = null;
    this.lastSpins = null;
    this.hideTimer = null;
  }

  formatMoney(value) {
    return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(Math.round(value)) + ' Kč';
  }

  bump(element, className = 'is-bumping') {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  renderState(state) {
    const totalChanged = this.lastTotal !== null && this.lastTotal !== state.total;
    const spinsChanged = this.lastSpins !== null && this.lastSpins !== state.spins;

    this.money.textContent = this.formatMoney(state.total);
    this.spins.textContent = state.spins;
    this.centerSpins.textContent = state.spins;

    if (totalChanged) this.bump(this.money, 'is-money-bumping');
    if (spinsChanged) {
      this.bump(this.spins, 'is-spin-bumping');
      this.bump(this.centerSpins, 'is-spin-bumping');
    }

    this.lastTotal = state.total;
    this.lastSpins = state.spins;
    this.renderHistory(state.history);
  }

  renderHistory(records) {
    if (!records.length) {
      this.history.innerHTML = '<div class="history-empty">Zatím nic</div>';
      return;
    }

    this.history.innerHTML = records.map((record) => {
      const label = record.type === 'multiplier' ? 'x' + record.multiplier : '+' + record.value + ' Kč';
      const extra = record.extraSpins
        ? '<span>+SPIN</span>'
        : '<span class="history-final">KONEC</span>';
      return '<div class="history-item history-item--' + record.type + '"><strong>' + label + '</strong>' + extra + '</div>';
    }).join('');
  }

  setBusy(busy) {
    this.spinButton.disabled = busy;
    this.spinButton.classList.toggle('is-busy', busy);
  }

  showResult(record) {
    clearTimeout(this.hideTimer);
    const isMultiplier = record.type === 'multiplier';
    this.resultBurst.className = 'result-burst ' + (isMultiplier ? 'is-multiplier' : 'is-money');
    this.resultMain.textContent = isMultiplier
      ? (record.multiplier === 3 ? 'TRIPLE!' : 'DOUBLE!')
      : '+' + record.value + ' Kč';
    this.resultSub.textContent = isMultiplier
      ? this.formatMoney(record.before) + ' → ' + this.formatMoney(record.after) + ' · +1 SPIN'
      : record.extraSpins ? '+1 SPIN' : 'POSLEDNÍ POLÍČKO';

    requestAnimationFrame(() => {
      this.resultBurst.classList.add('is-visible');
    });
  }

  hideResult() {
    if (!this.resultBurst.classList.contains('is-visible')) return;
    this.resultBurst.classList.add('is-leaving');
    this.hideTimer = setTimeout(() => {
      this.resultBurst.classList.remove('is-visible', 'is-leaving');
    }, 220);
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

  async showFinal(total) {
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-visible');
    this.finalAmount.textContent = '0 Kč';

    const duration = 1050;
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
  }

  resetAnimationMemory(state) {
    this.lastTotal = state.total;
    this.lastSpins = state.spins;
  }
}
