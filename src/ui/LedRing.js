export class LedRing {
  constructor(root, count = 48) {
    this.root = root;
    this.count = count;
    this.mode = 'idle';
    this.progress = 0;
    this.activeIndex = 0;
    this.render();
  }

  render() {
    if (!this.root) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < this.count; i += 1) {
      const bulb = document.createElement('i');
      bulb.className = 'led-ring__bulb';
      bulb.style.setProperty('--led-angle', (i * 360 / this.count) + 'deg');
      bulb.style.setProperty('--led-index', i);
      fragment.appendChild(bulb);
    }

    this.root.replaceChildren(fragment);
    this.bulbs = [...this.root.children];
    this.setMode('idle');
  }

  setMode(mode) {
    this.mode = mode;
    if (!this.root) return;
    this.root.dataset.mode = mode;
    this.update();
  }

  setProgress(progress, wheelRotation = 0) {
    this.progress = Math.max(0, Math.min(1, progress));

    if (this.mode === 'spinning' || this.mode === 'anticipating' || this.mode === 'settling') {
      const normalized = ((wheelRotation % 360) + 360) % 360;
      this.activeIndex = Math.round((normalized / 360) * this.count) % this.count;
    }

    this.update();
  }

  flashWinner() {
    this.setMode('winner');

    if (typeof this.root?.animate === 'function') {
      this.root.animate(
        [
          { filter: 'brightness(.15)' },
          { filter: 'brightness(1.6)' },
          { filter: 'brightness(1)' },
        ],
        { duration: 360, easing: 'cubic-bezier(.18,.84,.28,1)' },
      );
    }
  }

  update() {
    if (!this.bulbs?.length) return;

    const mode = this.mode;
    const anticipation = mode === 'anticipating' || mode === 'settling';

    this.bulbs.forEach((bulb, index) => {
      bulb.classList.remove('is-hot', 'is-warm', 'is-cold');

      if (mode === 'idle') {
        const pulse = (index + Math.floor(performance.now() / 240)) % 8;
        if (pulse === 0) bulb.classList.add('is-hot');
        else if (pulse === 1 || pulse === 7) bulb.classList.add('is-warm');
        return;
      }

      if (mode === 'winner') {
        bulb.classList.add('is-hot');
        return;
      }

      const distance = Math.min(
        Math.abs(index - this.activeIndex),
        this.count - Math.abs(index - this.activeIndex),
      );

      if (anticipation) {
        const pointerIndex = 0;
        const pointerDistance = Math.min(index, this.count - index);
        const tighten = mode === 'settling' ? 5 : 9;

        if (pointerDistance <= 1) bulb.classList.add('is-hot');
        else if (pointerDistance <= tighten) bulb.classList.add('is-warm');
        else bulb.classList.add('is-cold');
        return;
      }

      if (distance <= 1) bulb.classList.add('is-hot');
      else if (distance <= 4) bulb.classList.add('is-warm');
      else bulb.classList.add('is-cold');
    });
  }
}
