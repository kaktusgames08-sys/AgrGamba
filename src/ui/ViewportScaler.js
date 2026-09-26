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
    const heightScale = height / 920;
    const scale = Math.max(0.72, Math.min(1.08, Math.min(widthScale, heightScale)));

    this.root.style.setProperty('--ui-scale', scale.toFixed(4));
  }

  destroy() {
    window.removeEventListener('resize', this.boundUpdate);
    window.visualViewport?.removeEventListener('resize', this.boundUpdate);
  }
}
