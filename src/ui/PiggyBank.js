export class PiggyBank {
  constructor({
    pig = document.querySelector('#piggyBank'),
    total = document.querySelector('#piggyTotal'),
    final = document.querySelector('#piggyFinal'),
    finalAmount = document.querySelector('#piggyFinalAmount'),
    explosion = document.querySelector('#piggyExplosion'),
    source = document.querySelector('#wheelShell'),
    flightLayer = document.querySelector('#rewardFlightLayer'),
  } = {}) {
    this.pig = pig;
    this.total = total;
    this.final = final;
    this.finalAmount = finalAmount;
    this.explosion = explosion;
    this.source = source;
    this.flightLayer = flightLayer;
    this.currentTotal = 0;
  }

  formatMoney(value) {
    return new Intl.NumberFormat('cs-CZ', {
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value) || 0)) + ' Kč';
  }

  setTotal(value, { pulse = false } = {}) {
    this.currentTotal = Math.max(0, Math.round(Number(value) || 0));
    if (this.total) this.total.textContent = this.formatMoney(this.currentTotal);

    if (pulse && this.pig) {
      this.pig.classList.remove('is-fed');
      void this.pig.offsetWidth;
      this.pig.classList.add('is-fed');
      setTimeout(() => this.pig?.classList.remove('is-fed'), 440);
    }
  }

  async feed(amount, resultingTotal = null) {
    const coinCount = Math.max(0, Math.round(Number(amount) || 0));

    if (!coinCount || !this.pig || !this.source || !this.flightLayer) {
      if (resultingTotal !== null) this.setTotal(resultingTotal, { pulse: true });
      return;
    }

    const sourceRect = this.source.getBoundingClientRect();
    const pigRect = this.pig.getBoundingClientRect();

    const sourceX = sourceRect.left + sourceRect.width * 0.5;
    const sourceY = sourceRect.top + sourceRect.height * 0.48;
    const targetX = pigRect.left + pigRect.width * 0.52;
    const targetY = pigRect.top + pigRect.height * 0.28;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const stagger = reducedMotion ? 0 : Math.max(3, Math.min(7, 300 / coinCount));
    const baseDuration = reducedMotion ? 1 : 520;

    for (let i = 0; i < coinCount; i += 1) {
      const coin = document.createElement('div');
      coin.className = 'piggy-coin';
      coin.textContent = '1';

      const spreadX = reducedMotion ? 0 : (Math.random() - 0.5) * 54;
      const spreadY = reducedMotion ? 0 : (Math.random() - 0.5) * 30;
      const endX = targetX - sourceX + spreadX;
      const endY = targetY - sourceY + spreadY;
      const arcX = endX * 0.48 + (Math.random() - 0.5) * 80;
      const arcY = endY * 0.35 - 60 - Math.random() * 55;
      const duration = baseDuration + (reducedMotion ? 0 : Math.random() * 260);

      coin.style.left = sourceX + 'px';
      coin.style.top = sourceY + 'px';
      this.flightLayer.appendChild(coin);

      const animation = coin.animate([
        {
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(.45) rotate(0deg)',
        },
        {
          opacity: 1,
          offset: 0.12,
          transform: 'translate(calc(-50% + ' + arcX + 'px), calc(-50% + ' + arcY + 'px)) scale(1.05) rotate(180deg)',
        },
        {
          opacity: 1,
          offset: 0.88,
          transform: 'translate(calc(-50% + ' + endX + 'px), calc(-50% + ' + endY + 'px)) scale(.76) rotate(520deg)',
        },
        {
          opacity: 0,
          transform: 'translate(calc(-50% + ' + endX + 'px), calc(-50% + ' + endY + 'px)) scale(.25) rotate(600deg)',
        },
      ], {
        duration,
        delay: i * stagger,
        easing: 'cubic-bezier(.18,.78,.26,1)',
        fill: 'forwards',
      });

      animation.finished
        .then(() => coin.remove())
        .catch(() => coin.remove());

      if (i % Math.max(1, Math.floor(coinCount / 6)) === 0) {
        setTimeout(() => this.bumpPig(), i * stagger + duration * 0.88);
      }
    }

    const totalDuration = baseDuration + coinCount * stagger + 220;
    await new Promise((resolve) => setTimeout(resolve, totalDuration));

    if (resultingTotal !== null) {
      this.setTotal(resultingTotal, { pulse: true });
    }
  }

  bumpPig() {
    if (!this.pig || this.pig.classList.contains('is-exploding')) return;

    this.pig.classList.remove('is-fed');
    void this.pig.offsetWidth;
    this.pig.classList.add('is-fed');
    setTimeout(() => this.pig?.classList.remove('is-fed'), 420);
  }

  pulseMultiplier(total) {
    this.setTotal(total, { pulse: true });
    this.pig?.classList.remove('is-multiplied');
    void this.pig?.offsetWidth;
    this.pig?.classList.add('is-multiplied');
    setTimeout(() => this.pig?.classList.remove('is-multiplied'), 620);
  }

  async explode(total) {
    if (!this.pig) return;

    this.setTotal(total);
    this.final?.classList.remove('is-visible');
    this.final?.setAttribute('aria-hidden', 'true');
    this.explosion?.replaceChildren();

    for (let i = 0; i < 24; i += 1) {
      const shard = document.createElement('i');
      shard.className = 'piggy-shard';
      const angle = Math.random() * Math.PI * 2;
      const distance = 65 + Math.random() * 115;
      shard.style.setProperty('--shard-x', Math.cos(angle) * distance + 'px');
      shard.style.setProperty('--shard-y', Math.sin(angle) * distance + 'px');
      shard.style.setProperty('--shard-r', ((Math.random() - 0.5) * 520) + 'deg');
      this.explosion?.appendChild(shard);
    }

    this.pig.classList.remove('is-fed', 'is-multiplied');
    this.pig.classList.add('is-exploding');

    await new Promise((resolve) => setTimeout(resolve, 720));

    if (this.finalAmount) this.finalAmount.textContent = this.formatMoney(total);
    this.final?.setAttribute('aria-hidden', 'false');
    this.final?.classList.add('is-visible');

    await new Promise((resolve) => setTimeout(resolve, 650));
  }

  reset() {
    this.currentTotal = 0;
    this.setTotal(0);
    this.pig?.classList.remove('is-fed', 'is-multiplied', 'is-exploding');
    this.explosion?.replaceChildren();
    this.final?.classList.remove('is-visible');
    this.final?.setAttribute('aria-hidden', 'true');
    if (this.finalAmount) this.finalAmount.textContent = '0 Kč';
  }
}
