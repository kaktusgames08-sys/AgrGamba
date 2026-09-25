export class ParallaxController {
  constructor(root, { enabled = true } = {}) {
    this.root = root;
    this.enabled = enabled;
    this.pointer = { x: 0, y: 0 };
    this.current = { x: 0, y: 0 };
    this.frame = null;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.pointer = { x: 0, y: 0 };
    this.requestFrame();
  }

  onPointerMove(event) {
    if (!this.enabled) return;

    const x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    const y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;

    this.pointer.x = Math.max(-1, Math.min(1, x));
    this.pointer.y = Math.max(-1, Math.min(1, y));
    this.requestFrame();
  }

  onPointerLeave() {
    this.pointer = { x: 0, y: 0 };
    this.requestFrame();
  }

  requestFrame() {
    if (this.frame) return;

    const tick = () => {
      this.frame = null;
      const ease = 0.09;
      this.current.x += (this.pointer.x - this.current.x) * ease;
      this.current.y += (this.pointer.y - this.current.y) * ease;

      this.root?.style.setProperty('--parallax-x', this.current.x.toFixed(4));
      this.root?.style.setProperty('--parallax-y', this.current.y.toFixed(4));

      const moving = Math.abs(this.current.x - this.pointer.x) > 0.002
        || Math.abs(this.current.y - this.pointer.y) > 0.002;

      if (moving) this.frame = requestAnimationFrame(tick);
    };

    this.frame = requestAnimationFrame(tick);
  }

  punch(strength = 'normal') {
    if (!this.root) return;

    const scale = strength === 'heavy' ? 1.025 : strength === 'soft' ? 1.01 : 1.017;

    this.root.animate?.(
      [
        { transform: 'translate3d(var(--stage-x, 0), var(--stage-y, 0), 0) scale(1)' },
        { transform: 'translate3d(var(--stage-x, 0), var(--stage-y, 0), 0) scale(' + scale + ')' },
        { transform: 'translate3d(var(--stage-x, 0), var(--stage-y, 0), 0) scale(.997)' },
        { transform: 'translate3d(var(--stage-x, 0), var(--stage-y, 0), 0) scale(1)' },
      ],
      {
        duration: strength === 'heavy' ? 320 : 240,
        easing: 'cubic-bezier(.18,.78,.28,1)',
      },
    );
  }
}
