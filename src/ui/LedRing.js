export class LedRing {
  constructor(root, count = 48) {
    this.root = root;
    this.count = count;
    this.mode = 'idle';
    this.progress = 0;
    this.activeIndex = 0;
    this.lastRenderedMode = null;
    this.lastRenderedActiveIndex = null;
    this.bulbStates = [];
    this.render();
  }

  render() {
    if (!this.root) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < this.count; i += 1) {
      const bulb = document.createElement('i');
      bulb.className = 'led-ring__bulb';

      const angle = (i / this.count) * Math.PI * 2 - Math.PI / 2;
      bulb.style.left = (50 + Math.cos(angle) * 48.1) + '%';
      bulb.style.top = (50 + Math.sin(angle) * 48.1) + '%';
      bulb.style.setProperty('--led-angle', (i * 360 / this.count) + 'deg');
      bulb.style.setProperty('--led-index', i);
      fragment.appendChild(bulb);
    }

    this.root.replaceChildren(fragment);
    this.bulbs = [...this.root.children];
    this.bulbStates = new Array(this.bulbs.length).fill('');
    this.lastRenderedMode = null;
    this.lastRenderedActiveIndex = null;
    this.setMode('idle', { force: true });
  }

  setMode(mode, { force = false } = {}) {
    if (!force && mode === this.mode && this.lastRenderedMode === mode) return;

    this.mode = mode;
    if (!this.root) return;

    this.root.dataset.mode = mode;
    this.update({ force });
  }

  setProgress(progress, wheelRotation = 0) {
    this.progress = Math.max(0, Math.min(1, progress));

    if (this.mode !== 'spinning') {
      // Anticipation / settling uses a fixed pointer-focused pattern, so
      // repainting 48 bulbs every animation frame would produce no visual
      // difference. Mode changes already trigger the required repaint.
      return;
    }

    const normalized = ((wheelRotation % 360) + 360) % 360;
    const nextIndex = Math.round((normalized / 360) * this.count) % this.count;

    if (nextIndex === this.activeIndex && this.lastRenderedMode === this.mode) {
      return;
    }

    this.activeIndex = nextIndex;
    this.update();
  }

  flashWinner() {
    this.setMode('winner', { force: true });

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

  stateFor(index, mode) {
    const anticipation = mode === 'anticipating' || mode === 'settling';

    if (mode === 'idle') {
      const pulse = (index + Math.floor(performance.now() / 240)) % 8;
      if (pulse === 0) return 'hot';
      if (pulse === 1 || pulse === 7) return 'warm';
      return '';
    }

    if (mode === 'winner') return 'hot';

    if (anticipation) {
      const pointerDistance = Math.min(index, this.count - index);
      const tighten = mode === 'settling' ? 5 : 9;

      if (pointerDistance <= 1) return 'hot';
      if (pointerDistance <= tighten) return 'warm';
      return 'cold';
    }

    const distance = Math.min(
      Math.abs(index - this.activeIndex),
      this.count - Math.abs(index - this.activeIndex),
    );

    if (distance <= 1) return 'hot';
    if (distance <= 4) return 'warm';
    return 'cold';
  }

  update({ force = false } = {}) {
    if (!this.bulbs?.length) return;

    const mode = this.mode;

    if (
      !force
      && mode === this.lastRenderedMode
      && mode !== 'spinning'
    ) {
      return;
    }

    this.bulbs.forEach((bulb, index) => {
      const nextState = this.stateFor(index, mode);

      if (!force && this.bulbStates[index] === nextState) return;

      this.bulbStates[index] = nextState;
      bulb.className = 'led-ring__bulb'
        + (nextState ? ' is-' + nextState : '');
    });

    this.lastRenderedMode = mode;
    this.lastRenderedActiveIndex = this.activeIndex;
  }
}
