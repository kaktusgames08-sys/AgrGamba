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
  }

  formatMoney(value) {
    return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(Math.round(value)) + ' Kč';
  }

  renderState(state) {
    this.money.textContent = this.formatMoney(state.total);
    this.spins.textContent = state.spins;
    this.centerSpins.textContent = state.spins;
    this.money.classList.remove('is-bumping');
    this.spins.classList.remove('is-bumping');
    this.centerSpins.classList.remove('is-bumping');
    void this.money.offsetWidth;
    this.money.classList.add('is-bumping');
    this.spins.classList.add('is-bumping');
    this.centerSpins.classList.add('is-bumping');
    this.renderHistory(state.history);
  }

  renderHistory(records) {
    if (!records.length) {
      this.history.innerHTML = '<div class="history-empty">Zatím nic</div>';
      return;
    }
    this.history.innerHTML = records.map((record) => {
      const label = record.type === 'multiplier' ? 'x' + record.multiplier : '+' + record.value + ' Kč';
      const extra = record.extraSpins ? '<span>+SPIN</span>' : '<span class="history-final">FINÁLE</span>';
      return '<div class="history-item history-item--' + record.type + '"><strong>' + label + '</strong>' + extra + '</div>';
    }).join('');
  }

  setBusy(busy) {
    this.spinButton.disabled = busy;
    this.spinButton.classList.toggle('is-busy', busy);
  }

  showResult(record) {
    const isMultiplier = record.type === 'multiplier';
    this.resultBurst.className = 'result-burst is-visible ' + (isMultiplier ? 'is-multiplier' : 'is-money');
    this.resultMain.textContent = isMultiplier ? (record.multiplier === 3 ? 'TRIPLE!' : 'DOUBLE!') : '+' + record.value + ' Kč';
    this.resultSub.textContent = isMultiplier
      ? this.formatMoney(record.before) + ' → ' + this.formatMoney(record.after) + ' · +1 SPIN'
      : record.extraSpins ? '+1 SPIN' : 'FINÁLNÍ POLE';
  }

  hideResult() {
    this.resultBurst.classList.remove('is-visible');
  }

  shake(strength = 'normal') {
    this.wheelShell.classList.remove('shake-normal', 'shake-heavy');
    void this.wheelShell.offsetWidth;
    this.wheelShell.classList.add(strength === 'heavy' ? 'shake-heavy' : 'shake-normal');
  }

  setMuted(muted) {
    this.muteButton.textContent = muted ? '🔇' : '🔊';
    this.muteButton.setAttribute('aria-label', muted ? 'Zapnout zvuk' : 'Vypnout zvuk');
  }

  async showFinal(total) {
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-visible');
    this.finalAmount.textContent = '0 Kč';
    const duration = 1500;
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        this.finalAmount.textContent = this.formatMoney(total * eased);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  hideFinal() {
    this.overlay.classList.remove('is-visible');
    this.overlay.setAttribute('aria-hidden', 'true');
  }
}
