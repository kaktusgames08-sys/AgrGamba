export class ParticleSystem {
  constructor(layer, flash) {
    this.layer = layer;
    this.flash = flash;
  }

  burst({ count = 36, intense = false } = {}) {
    const amount = Math.min(110, count);
    for (let i = 0; i < amount; i += 1) {
      const particle = document.createElement('i');
      particle.className = 'particle';
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * (intense ? 420 : 250);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      particle.style.setProperty('--x', x + 'px');
      particle.style.setProperty('--y', y + 'px');
      particle.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      particle.style.setProperty('--delay', (Math.random() * 0.12) + 's');
      particle.style.left = (46 + Math.random() * 8) + '%';
      particle.style.top = (44 + Math.random() * 8) + '%';
      this.layer.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }

  screenFlash(strength = 'normal') {
    this.flash.dataset.strength = strength;
    this.flash.classList.remove('is-active');
    void this.flash.offsetWidth;
    this.flash.classList.add('is-active');
  }
}
