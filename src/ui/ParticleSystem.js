const EFFECT_MULTIPLIERS = {
  low: 0.42,
  medium: 0.72,
  high: 1,
};

export class ParticleSystem {
  constructor(layer, flash) {
    this.layer = layer;
    this.flash = flash;
    this.effectLevel = 'high';
    this.pool = [];
    this.flashToken = 0;
  }

  setEffectLevel(level) {
    this.effectLevel = EFFECT_MULTIPLIERS[level] ? level : 'high';
  }

  createParticle() {
    const particle = document.createElement('i');

    particle.addEventListener('animationend', () => {
      if (!particle.isConnected) return;
      particle.remove();
      particle.className = 'particle';
      particle.removeAttribute('style');

      if (this.pool.length < 96) {
        this.pool.push(particle);
      }
    });

    return particle;
  }

  acquireParticle() {
    return this.pool.pop() ?? this.createParticle();
  }

  burst({ count = 30, intense = false, variant = 'reward' } = {}) {
    const multiplier = EFFECT_MULTIPLIERS[this.effectLevel] ?? 1;
    const amount = Math.max(4, Math.min(90, Math.round(count * multiplier)));
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < amount; i += 1) {
      const particle = this.acquireParticle();
      particle.className = 'particle particle--' + variant;

      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * (intense ? 330 : 210);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      particle.style.setProperty('--x', x + 'px');
      particle.style.setProperty('--y', y + 'px');
      particle.style.setProperty('--r', (Math.random() * 420 - 210) + 'deg');
      particle.style.setProperty('--delay', (Math.random() * 0.08) + 's');
      particle.style.setProperty('--particle-scale', (0.7 + Math.random() * 0.65).toFixed(2));
      particle.style.left = (47 + Math.random() * 6) + '%';
      particle.style.top = (44 + Math.random() * 7) + '%';

      fragment.appendChild(particle);
    }

    this.layer.appendChild(fragment);
  }

  screenFlash(strength = 'normal', variant = 'reward') {
    if (this.effectLevel === 'low' && strength !== 'strong') return;

    this.flash.dataset.strength = strength;
    this.flash.dataset.variant = variant;

    const token = ++this.flashToken;
    this.flash.classList.remove('is-active');

    requestAnimationFrame(() => {
      if (token === this.flashToken) {
        this.flash.classList.add('is-active');
      }
    });
  }
}
