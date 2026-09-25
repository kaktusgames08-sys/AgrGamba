function digitsOnly(value) {
  return String(Math.max(0, Math.round(Number(value) || 0)));
}

function buildTrack() {
  return Array.from({ length: 20 }, (_, index) =>
    '<span>' + (index % 10) + '</span>',
  ).join('');
}

export class RollingCounter {
  constructor(root, { suffix = '' } = {}) {
    this.root = root;
    this.suffix = suffix;
    this.value = 0;
    this.animation = null;
  }

  set(value, { animate = false, duration = 620 } = {}) {
    const next = Math.max(0, Math.round(Number(value) || 0));

    if (!animate || !this.root) {
      this.value = next;
      this.renderStatic(next);
      return;
    }

    this.animateTo(next, duration);
  }

  renderStatic(value) {
    if (!this.root) return;

    const formatted = new Intl.NumberFormat('cs-CZ', {
      maximumFractionDigits: 0,
    }).format(value);

    this.root.textContent = formatted + this.suffix;
  }

  animateTo(next, duration = 620) {
    if (!this.root) return;

    const fromDigits = digitsOnly(this.value);
    const toDigits = digitsOnly(next);
    const length = Math.max(fromDigits.length, toDigits.length);
    const from = fromDigits.padStart(length, '0');
    const to = toDigits.padStart(length, '0');

    this.root.innerHTML = '';

    const group = document.createElement('span');
    group.className = 'rolling-number';

    for (let index = 0; index < length; index += 1) {
      const fromDigit = Number(from[index]);
      const toDigit = Number(to[index]);

      const viewport = document.createElement('span');
      viewport.className = 'rolling-digit';

      const track = document.createElement('span');
      track.className = 'rolling-digit__track';
      track.innerHTML = buildTrack();
      track.style.transform = 'translateY(-' + fromDigit + 'em)';

      viewport.appendChild(track);
      group.appendChild(viewport);

      requestAnimationFrame(() => {
        const extraLoops = 10 + (length - index) * 10;
        track.style.transition = 'transform ' + duration + 'ms cubic-bezier(.12,.72,.2,1)';
        track.style.transform = 'translateY(-' + (extraLoops + toDigit) + 'em)';
      });
    }

    if (this.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'rolling-number__suffix';
      suffix.textContent = this.suffix;
      group.appendChild(suffix);
    }

    this.root.appendChild(group);
    this.value = next;

    clearTimeout(this.animation);
    this.animation = setTimeout(() => {
      this.renderStatic(next);
    }, duration + 50);
  }
}
