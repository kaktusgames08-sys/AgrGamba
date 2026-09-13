const COLOR_SETS = {
  agra: ['#ffcf3f', '#ffe08a', '#ff9d3f'],
  chat: ['#35f0e0', '#8affee', '#3fa8ff'],
  loss: ['#ff3b4e', '#ff8a8a'],
  neutral: ['#ff3ec8', '#35f0e0', '#ffcf3f'],
};

export class ParticleSystem {
  constructor(layerEl, settingsManager) {
    this.layer = layerEl;
    this.settings = settingsManager;
    this.active = new Set();
  }

  _countFor(base) {
    const level = this.settings.get('particles');
    if (level === 'low') return Math.round(base * 0.3);
    if (level === 'normal') return Math.round(base * 0.6);
    return base; // insane
  }

  burst(kind = 'neutral', baseCount = 60) {
    const count = this._countFor(baseCount);
    const colors = COLOR_SETS[kind] || COLOR_SETS.neutral;
    const width = this.layer.clientWidth || window.innerWidth;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.background = color;
      el.style.left = `${Math.random() * width}px`;
      const dur = 1.2 + Math.random() * 1.4;
      const delay = Math.random() * 0.25;
      el.style.animationDuration = `${dur}s`;
      el.style.animationDelay = `${delay}s`;
      el.style.opacity = String(0.7 + Math.random() * 0.3);
      const rotate = Math.random() > 0.5 ? '' : 'border-radius: 50%;';
      el.setAttribute('style', el.getAttribute('style') + rotate);
      this.layer.appendChild(el);
      this.active.add(el);
      setTimeout(() => {
        el.remove();
        this.active.delete(el);
      }, (dur + delay) * 1000 + 100);
    }
  }

  clearAll() {
    this.active.forEach((el) => el.remove());
    this.active.clear();
  }
}
