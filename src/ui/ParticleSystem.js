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
  }

  setEffectLevel(level) {
    this.effectLevel = EFFECT_MULTIPLIERS[level] ? level : 'high';
  }

  burst({ count = 30, intense = false, variant = 'reward' } = {}) {
    const multiplier = EFFECT_MULTIPLIERS[this.effectLevel] ?? 1;
    const amount = Math.max(4, Math.min(90, Math.round(count * multiplier)));

    for (let i = 0; i < amount; i += 1) {
      const particle = document.createElement('i');
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

      this.layer.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }

  screenFlash(strength = 'normal', variant = 'reward') {
    if (this.effectLevel === 'low' && strength !== 'strong') return;

    this.flash.dataset.strength = strength;
    this.flash.dataset.variant = variant;
    this.flash.classList.remove('is-active');
    void this.flash.offsetWidth;
    this.flash.classList.add('is-active');
  }
}
