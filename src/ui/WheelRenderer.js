import {
  randomLandingRotation,
  segmentAngle,
} from '../core/WheelEngine.js';
import { SPIN_DURATION_MS } from '../core/WheelConfig.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const TONES = {
  amber: ['#ffbf3c', '#db6d11'],
  violet: ['#8f4cff', '#5a1fd0'],
  blue: ['#35b9ff', '#1361d5'],
  red: ['#ff5269', '#b81738'],
  purple: ['#d54cff', '#7b1ab4'],
  green: ['#5ce66f', '#168d46'],
  orange: ['#ff8e2e', '#d34016'],
  cyan: ['#3ee7df', '#158d9b'],
  pink: ['#ff60bd', '#bc267f'],
  final: ['#fff08b', '#e33b1c'],
};

function polar(cx, cy, radius, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function wedgePath(cx, cy, radius, startAngle, endAngle) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M ' + cx + ' ' + cy,
    'L ' + start.x + ' ' + start.y,
    'A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 0 ' + end.x + ' ' + end.y,
    'Z',
  ].join(' ');
}

function spinProgress(t) {
  const clamped = Math.min(1, Math.max(0, t));

  // One uninterrupted curve with a longer, readable final crawl.
  // Velocity approaches zero smoothly (no staged snap), while the last
  // few segments remain in motion long enough for genuine close calls.
  return 1 - Math.pow(1 - clamped, 3);
}

function normalizeIndex(index, count) {
  return ((index % count) + count) % count;
}

export class WheelRenderer {
  constructor({
    mount,
    pointer,
    shell,
    audio,
    segments,
    spinDurationMs = SPIN_DURATION_MS,
    onProgress = null,
    onPhaseChange = null,
  }) {
    this.mount = mount;
    this.pointer = pointer;
    this.shell = shell;
    this.audio = audio;
    this.segments = segments;
    this.spinDurationMs = spinDurationMs;
    this.onProgress = onProgress;
    this.onPhaseChange = onPhaseChange;

    this.rotation = 0;
    this.svg = null;
    this.rotor = null;
    this.segmentNodes = [];
    this.lastPointerTickAt = 0;
    this.hotIndex = null;
    this.phase = 'idle';

    this.render();
  }

  setSegments(segments) {
    this.segments = segments;
    this.rotation = 0;
    this.hotIndex = null;
    this.phase = 'idle';
    this.render();
  }

  setSpinDuration(durationMs) {
    this.spinDurationMs = Math.max(
      3200,
      Math.min(8000, Number(durationMs) || SPIN_DURATION_MS),
    );
  }

  setPhase(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.shell?.setAttribute('data-spin-phase', phase);
    this.onPhaseChange?.(phase);
  }

  render() {
    this.segmentNodes = [];

    const size = 760;
    const center = size / 2;
    const radius = 348;
    const slice = segmentAngle(this.segments.length);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'wheel-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      'Kolo neštěstí s peněžními částkami a násobiči',
    );

    const defs = document.createElementNS(SVG_NS, 'defs');

    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', 'segmentGlow');
    filter.innerHTML = '<feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
    defs.appendChild(filter);

    const softGlow = document.createElementNS(SVG_NS, 'filter');
    softGlow.setAttribute('id', 'softGlow');
    softGlow.innerHTML = '<feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
    defs.appendChild(softGlow);

    svg.appendChild(defs);

    const rotor = document.createElementNS(SVG_NS, 'g');
    rotor.setAttribute('class', 'wheel-rotor');
    rotor.style.transformOrigin = '50% 50%';
    rotor.style.willChange = 'transform';

    this.segments.forEach((segment, index) => {
      const centerAngle = index * slice;
      const startAngle = centerAngle - slice / 2;
      const endAngle = centerAngle + slice / 2;

      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute(
        'class',
        'wheel-segment wheel-segment--' + segment.tone,
      );
      group.dataset.index = String(index);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute(
        'd',
        wedgePath(center, center, radius, startAngle, endAngle),
      );
      path.setAttribute('fill', 'url(#grad-' + index + ')');
      path.setAttribute('stroke', 'rgba(255,244,199,.7)');
      path.setAttribute('stroke-width', '2');

      const colors = TONES[segment.tone] ?? TONES.amber;
      const grad = document.createElementNS(SVG_NS, 'linearGradient');
      grad.setAttribute('id', 'grad-' + index);
      grad.setAttribute('x1', '0%');
      grad.setAttribute('x2', '100%');

      const stop1 = document.createElementNS(SVG_NS, 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', colors[0]);

      const stop2 = document.createElementNS(SVG_NS, 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', colors[1]);

      grad.append(stop1, stop2);
      defs.appendChild(grad);
      group.appendChild(path);

      const edgePoint = polar(center, center, 326, centerAngle);
      const marker = document.createElementNS(SVG_NS, 'circle');
      marker.setAttribute('cx', edgePoint.x);
      marker.setAttribute('cy', edgePoint.y);
      marker.setAttribute('r', '4.2');
      marker.setAttribute('class', 'wheel-segment__marker');
      group.appendChild(marker);

      const labelRadius = 258;
      const labelPoint = polar(center, center, labelRadius, centerAngle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', labelPoint.x);
      text.setAttribute('y', labelPoint.y);
      text.setAttribute('class', 'wheel-label');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute(
        'transform',
        'rotate('
          + centerAngle
          + ' '
          + labelPoint.x
          + ' '
          + labelPoint.y
          + ')',
      );

      if (segment.type === 'multiplier') {
        const big = document.createElementNS(SVG_NS, 'tspan');
        big.setAttribute('x', labelPoint.x);
        big.setAttribute('dy', '-5');
        big.setAttribute('class', 'wheel-label__big');
        big.textContent = 'x' + segment.multiplier;

        const sub = document.createElementNS(SVG_NS, 'tspan');
        sub.setAttribute('x', labelPoint.x);
        sub.setAttribute('dy', '27');
        sub.setAttribute('class', 'wheel-label__sub');
        sub.textContent = segment.extraSpins ? '+ SPIN' : 'KONEC';

        text.append(big, sub);
      } else {
        const big = document.createElementNS(SVG_NS, 'tspan');
        big.setAttribute('x', labelPoint.x);
        big.setAttribute('dy', '-5');
        big.setAttribute('class', 'wheel-label__big');
        big.textContent = segment.value + ' Kč';

        const sub = document.createElementNS(SVG_NS, 'tspan');
        sub.setAttribute('x', labelPoint.x);
        sub.setAttribute('dy', '27');
        sub.setAttribute('class', 'wheel-label__sub');
        sub.textContent = segment.extraSpins ? '+ SPIN' : 'KONEC';

        text.append(big, sub);
      }

      group.appendChild(text);
      rotor.appendChild(group);
      this.segmentNodes.push(group);
    });

    const hubShadow = document.createElementNS(SVG_NS, 'circle');
    hubShadow.setAttribute('cx', center);
    hubShadow.setAttribute('cy', center);
    hubShadow.setAttribute('r', '130');
    hubShadow.setAttribute('class', 'hub-shadow');
    rotor.appendChild(hubShadow);

    svg.appendChild(rotor);
    this.mount.replaceChildren(svg);
    this.svg = svg;
    this.rotor = rotor;
  }

  setWinner(index) {
    this.segmentNodes.forEach((node, currentIndex) => {
      node.classList.toggle('is-winner', currentIndex === index);
      node.classList.remove('is-under-pointer');
    });

    this.hotIndex = null;
  }

  revealWinner(index) {
    this.setWinner(index);
    this.shell?.classList.remove('is-settling');
    this.shell?.classList.add('has-landed');
    this.setPhase('landed');

    setTimeout(() => {
      this.shell?.classList.remove('has-landed');
    }, 460);
  }

  clearWinner() {
    this.segmentNodes.forEach((node) => {
      node.classList.remove('is-winner', 'is-under-pointer');
    });

    this.hotIndex = null;
    this.shell?.classList.remove(
      'is-spinning',
      'is-anticipating',
      'is-settling',
      'has-landed',
    );
    this.setPhase('idle');
  }

  updatePointerHighlight(rotation) {
    const slice = segmentAngle(this.segments.length);
    const index = normalizeIndex(
      Math.round(-rotation / slice),
      this.segments.length,
    );

    if (index === this.hotIndex) return;

    if (this.hotIndex !== null) {
      this.segmentNodes[this.hotIndex]?.classList.remove('is-under-pointer');
    }

    this.hotIndex = index;
    this.segmentNodes[index]?.classList.add('is-under-pointer');
  }

  bouncePointer() {
    const now = performance.now();
    if (now - this.lastPointerTickAt < 28) return;
    this.lastPointerTickAt = now;

    if (typeof this.pointer.animate === 'function') {
      this.pointer.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(3.6deg)' },
          { transform: 'rotate(-0.45deg)' },
          { transform: 'rotate(0deg)' },
        ],
        {
          duration: 104,
          easing: 'cubic-bezier(.2,.72,.32,1)',
        },
      );
      return;
    }

    this.pointer.classList.remove('is-ticking');
    void this.pointer.offsetWidth;
    this.pointer.classList.add('is-ticking');
  }

  spinRandom(rng = Math.random) {
    this.clearWinner();

    const startRotation = this.rotation;
    const landing = randomLandingRotation(
      startRotation,
      this.segments.length,
      rng,
    );

    const targetRotation = landing.rotation;
    const index = landing.index;
    const distance = targetRotation - startRotation;
    const slice = segmentAngle(this.segments.length);

    const durationJitter = 0.96
      + Math.min(0.999999999999, Math.max(0, rng())) * 0.08;
    const duration = this.spinDurationMs * durationJitter;

    const startedAt = performance.now();
    let lastBoundary = Math.floor(startRotation / slice);

    this.shell?.classList.add('is-spinning');
    this.setPhase('spinning');
    this.audio.spinStart();

    return new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const progress = spinProgress(t);
        const current = startRotation + distance * progress;

        this.rotor.style.transform = 'rotate(' + current + 'deg)';

        this.onProgress?.({
          timeProgress: t,
          wheelProgress: progress,
          rotation: current,
          targetIndex: index,
        });

        const boundary = Math.floor(current / slice);

        if (boundary !== lastBoundary) {
          const remaining = 1 - t;
          const speed = Math.max(0.05, Math.min(1, remaining * 1.35));
          this.audio.tick(speed);
          this.bouncePointer();
          lastBoundary = boundary;
        }

        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }

        this.rotation = targetRotation;
        this.rotor.style.transform = 'rotate(' + targetRotation + 'deg)';
        this.shell?.classList.remove(
          'is-spinning',
          'is-anticipating',
          'is-settling',
        );

        this.updatePointerHighlight(targetRotation);

        resolve({
          index,
          rotation: targetRotation,
          landingOffset: landing.offset,
        });
      };

      requestAnimationFrame(frame);
    });
  }
}
