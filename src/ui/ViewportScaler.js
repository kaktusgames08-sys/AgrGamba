export class ViewportScaler {
  constructor(root = document.documentElement) {
    this.root = root;
    this.boundUpdate = () => this.update();
    this.update();
    window.addEventListener('resize', this.boundUpdate, { passive: true });
    window.visualViewport?.addEventListener('resize', this.boundUpdate, { passive: true });
  }

  update() {
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;

    const widthScale = width / 1720;
    // The full desktop composition now includes the Hardcore control.
    // Base the scale on a taller design canvas so 100% browser zoom
    // still keeps the whole game inside one viewport.
    const heightScale = height / 1000;
    const scale = Math.max(0.66, Math.min(1.06, Math.min(widthScale, heightScale)));

    this.root.style.setProperty('--ui-scale', scale.toFixed(4));
  }

  destroy() {
    window.removeEventListener('resize', this.boundUpdate);
    window.visualViewport?.removeEventListener('resize', this.boundUpdate);
  }
}
