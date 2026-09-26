export class PiggyBank {
  constructor({
    pig = document.querySelector('#piggyBank'),
    total = document.querySelector('#piggyTotal'),
    final = document.querySelector('#piggyFinal'),
    finalAmount = document.querySelector('#piggyFinalAmount'),
    explosion = document.querySelector('#piggyExplosion'),
    source = document.querySelector('#wheelShell'),
    app = document.querySelector('#app'),
  } = {}) {
    this.pig = pig;
    this.total = total;
    this.final = final;
    this.finalAmount = finalAmount;
    this.explosion = explosion;
    this.source = source;
    this.app = app;
    this.currentTotal = 0;
    this.feedToken = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'piggy-coin-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.coinSprite = this.createCoinSprite();
    this.resizeCanvas();

    this.boundResize = () => this.resizeCanvas();
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.boundResize, { passive: true });
  }

  formatMoney(value) {
    return new Intl.NumberFormat('cs-CZ', {
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value) || 0)) + ' Kč';
  }

  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;

    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  createCoinSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(14, 11, 2, 20, 20, 18);
    gradient.addColorStop(0, '#fff8c7');
    gradient.addColorStop(0.28, '#ffe075');
    gradient.addColorStop(0.68, '#f2ad2c');
    gradient.addColorStop(1, '#b96312');

    ctx.beginPath();
    ctx.arc(20, 20, 17, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(103,49,5,.72)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(20, 20, 12.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,246,176,.48)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.fillStyle = '#5a2b05';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 20, 20.5);

    return canvas;
  }

  pigScaleForTotal(value) {
    const total = Math.max(0, Number(value) || 0);

    // Slow, readable growth: 0 Kč = 1.00x, ~500 Kč = 1.14x,
    // ~1000 Kč = 1.20x, 2000 Kč+ caps at 1.28x.
    const progress = Math.min(1, Math.sqrt(total / 2000));
    return 1 + progress * 0.28;
  }

  updatePigScale(value = this.currentTotal) {
    if (!this.pig) return;

    const scale = this.pigScaleForTotal(value);
    this.pig.style.setProperty('--piggy-fill-scale', scale.toFixed(4));
    this.pig.dataset.fillLevel = scale >= 1.24
      ? 'full'
      : scale >= 1.14
        ? 'medium'
        : scale > 1.02
          ? 'low'
          : 'empty';
  }

  setTotal(value, { pulse = false } = {}) {
    this.currentTotal = Math.max(0, Math.round(Number(value) || 0));
    if (this.total) this.total.textContent = this.formatMoney(this.currentTotal);
    this.updatePigScale(this.currentTotal);

    if (pulse) this.bumpPig();
  }

  bumpPig() {
    if (!this.pig || this.pig.classList.contains('is-exploding')) return;

    this.pig.classList.remove('is-fed');
    void this.pig.offsetWidth;
    this.pig.classList.add('is-fed');

    setTimeout(() => {
      this.pig?.classList.remove('is-fed');
    }, 420);
  }

  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);
  }

  async feed(amount, resultingTotal = null) {
    const coinCount = Math.max(0, Math.round(Number(amount) || 0));

    if (!coinCount || !this.pig || !this.source || !this.ctx) {
      if (resultingTotal !== null) this.setTotal(resultingTotal, { pulse: true });
      return;
    }

    const token = ++this.feedToken;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      this.setTotal(resultingTotal ?? (this.currentTotal + coinCount), { pulse: true });
      return;
    }

    const sourceRect = this.source.getBoundingClientRect();
    const pigRect = this.pig.getBoundingClientRect();

    const sourceX = sourceRect.left + sourceRect.width * 0.5;
    const sourceY = sourceRect.top + sourceRect.height * 0.49;
    const targetX = pigRect.left + pigRect.width * 0.55;
    const targetY = pigRect.top + pigRect.height * 0.28;
    const startTotal = resultingTotal === null
      ? this.currentTotal
      : Math.max(0, Math.round(resultingTotal - coinCount));

    const stagger = Math.max(1.2, Math.min(7, 260 / Math.max(1, coinCount)));
    const baseDuration = 470;
    const bumpEvery = Math.max(1, Math.floor(coinCount / 7));
    const particles = Array.from({ length: coinCount }, (_, index) => {
      const jitterX = (Math.random() - 0.5) * 58;
      const jitterY = (Math.random() - 0.5) * 22;
      const tx = targetX + jitterX;
      const ty = targetY + jitterY;
      const cx = sourceX + (tx - sourceX) * (0.42 + Math.random() * 0.18)
        + (Math.random() - 0.5) * 90;
      const cy = Math.min(sourceY, ty) - 65 - Math.random() * 80;

      return {
        sx: sourceX + (Math.random() - 0.5) * 18,
        sy: sourceY + (Math.random() - 0.5) * 12,
        cx,
        cy,
        tx,
        ty,
        delay: index * stagger,
        duration: baseDuration + Math.random() * 250,
        spin: (Math.random() - 0.5) * 10,
        scale: 0.72 + Math.random() * 0.35,
        arrived: false,
        bump: index % bumpEvery === 0,
      };
    });

    const startAt = performance.now();
    const totalDuration = Math.max(...particles.map((particle) =>
      particle.delay + particle.duration
    ));

    this.pig.classList.add('is-glowing');

    await new Promise((resolve) => {
      const frame = (now) => {
        if (token !== this.feedToken) {
          this.clearCanvas();
          resolve();
          return;
        }

        this.clearCanvas();
        let active = 0;
        let arrived = 0;

        for (const particle of particles) {
          const local = (now - startAt - particle.delay) / particle.duration;

          if (local < 0) {
            active += 1;
            continue;
          }

          if (local >= 1) {
            particle.arrived = true;
            arrived += 1;
            continue;
          }

          active += 1;
          const t = Math.max(0, Math.min(1, local));
          const eased = 1 - Math.pow(1 - t, 3);
          const oneMinus = 1 - eased;
          const x = oneMinus * oneMinus * particle.sx
            + 2 * oneMinus * eased * particle.cx
            + eased * eased * particle.tx;
          const y = oneMinus * oneMinus * particle.sy
            + 2 * oneMinus * eased * particle.cy
            + eased * eased * particle.ty;
          const alpha = t < 0.08 ? t / 0.08 : Math.min(1, (1 - t) / 0.12);
          const scale = particle.scale * (0.55 + Math.sin(Math.PI * t) * 0.55);

          this.ctx.save();
          this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          this.ctx.translate(x, y);
          this.ctx.rotate(t * particle.spin);
          this.ctx.scale(scale, scale);
          this.ctx.drawImage(this.coinSprite, -20, -20, 40, 40);
          this.ctx.restore();

          if (!particle.arrived && t > 0.93) {
            particle.arrived = true;
            if (particle.bump) this.bumpPig();
          }

          if (particle.arrived) arrived += 1;
        }

        const visibleTotal = Math.min(
          startTotal + arrived,
          resultingTotal ?? (startTotal + coinCount),
        );
        if (visibleTotal !== this.currentTotal) {
          this.currentTotal = visibleTotal;
          if (this.total) this.total.textContent = this.formatMoney(visibleTotal);
          this.updatePigScale(visibleTotal);
        }

        if (active > 0 && now - startAt <= totalDuration + 40) {
          requestAnimationFrame(frame);
        } else {
          this.clearCanvas();
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });

    this.pig.classList.remove('is-glowing');

    if (resultingTotal !== null) {
      this.setTotal(resultingTotal, { pulse: true });
    }
  }

  pulseMultiplier(total) {
    this.setTotal(total, { pulse: true });
    this.pig?.classList.remove('is-multiplied');
    void this.pig?.offsetWidth;
    this.pig?.classList.add('is-multiplied');

    setTimeout(() => {
      this.pig?.classList.remove('is-multiplied');
    }, 620);
  }

  async explode(total) {
    if (!this.pig) return;

    ++this.feedToken;
    this.clearCanvas();
    this.setTotal(total);

    this.final?.classList.remove('is-visible');
    this.final?.setAttribute('aria-hidden', 'true');
    this.explosion?.replaceChildren();

    this.app?.classList.add('is-piggy-finale');
    this.pig.classList.remove('is-fed', 'is-multiplied', 'is-glowing');
    this.pig.classList.add('is-cracking');

    await new Promise((resolve) => setTimeout(resolve, 520));

    for (let i = 0; i < 28; i += 1) {
      const shard = document.createElement('i');
      shard.className = 'piggy-shard';
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 135;
      shard.style.setProperty('--shard-x', Math.cos(angle) * distance + 'px');
      shard.style.setProperty('--shard-y', Math.sin(angle) * distance + 'px');
      shard.style.setProperty('--shard-r', ((Math.random() - 0.5) * 560) + 'deg');
      this.explosion?.appendChild(shard);
    }

    this.pig.classList.add('is-exploding');

    await new Promise((resolve) => setTimeout(resolve, 760));

    if (this.finalAmount) this.finalAmount.textContent = this.formatMoney(total);
    this.final?.setAttribute('aria-hidden', 'false');
    this.final?.classList.add('is-visible');
  }

  reset() {
    ++this.feedToken;
    this.clearCanvas();
    this.currentTotal = 0;
    this.setTotal(0);
    this.app?.classList.remove('is-piggy-finale');
    this.pig?.classList.remove(
      'is-fed',
      'is-multiplied',
      'is-glowing',
      'is-cracking',
      'is-exploding',
    );
    this.explosion?.replaceChildren();
    this.final?.classList.remove('is-visible');
    this.final?.setAttribute('aria-hidden', 'true');

    if (this.finalAmount) this.finalAmount.textContent = '0 Kč';
  }
}
