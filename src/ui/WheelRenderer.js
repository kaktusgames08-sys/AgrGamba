import { easeOutQuint, landingRotation, segmentAngle } from '../core/WheelEngine.js';
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
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function wedgePath(cx, cy, radius, startAngle, endAngle) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return ['M ' + cx + ' ' + cy, 'L ' + start.x + ' ' + start.y, 'A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 0 ' + end.x + ' ' + end.y, 'Z'].join(' ');
}

export class WheelRenderer {
  constructor({ mount, pointer, audio, segments }) {
    this.mount = mount;
    this.pointer = pointer;
    this.audio = audio;
    this.segments = segments;
    this.rotation = 0;
    this.svg = null;
    this.rotor = null;
    this.segmentNodes = [];
    this.render();
  }

  render() {
    const size = 760;
    const center = size / 2;
    const radius = 348;
    const slice = segmentAngle(this.segments.length);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'wheel-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Kolo s peněžními výhrami a násobiči');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', 'segmentGlow');
    filter.innerHTML = '<feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
    defs.appendChild(filter);
    svg.appendChild(defs);

    const rotor = document.createElementNS(SVG_NS, 'g');
    rotor.setAttribute('class', 'wheel-rotor');
    rotor.style.transformOrigin = '50% 50%';

    this.segments.forEach((segment, index) => {
      const centerAngle = index * slice;
      const startAngle = centerAngle - slice / 2;
      const endAngle = centerAngle + slice / 2;
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', 'wheel-segment wheel-segment--' + segment.tone);
      group.dataset.index = String(index);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', wedgePath(center, center, radius, startAngle, endAngle));
      path.setAttribute('fill', 'url(#grad-' + index + ')');
      path.setAttribute('stroke', 'rgba(255,244,199,.72)');
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

      const labelRadius = 258;
      const labelPoint = polar(center, center, labelRadius, centerAngle);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', labelPoint.x);
      text.setAttribute('y', labelPoint.y);
      text.setAttribute('class', 'wheel-label');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('transform', 'rotate(' + centerAngle + ' ' + labelPoint.x + ' ' + labelPoint.y + ')');

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
        sub.textContent = '+ SPIN';
        text.append(big, sub);
      } else {
        const big = document.createElementNS(SVG_NS, 'tspan');
        big.setAttribute('x', labelPoint.x);
        big.setAttribute('dy', segment.extraSpins ? '-5' : '5');
        big.setAttribute('class', 'wheel-label__big');
        big.textContent = segment.value + ' Kč';
        text.appendChild(big);
        if (segment.extraSpins) {
          const sub = document.createElementNS(SVG_NS, 'tspan');
          sub.setAttribute('x', labelPoint.x);
          sub.setAttribute('dy', '27');
          sub.setAttribute('class', 'wheel-label__sub');
          sub.textContent = '+ SPIN';
          text.appendChild(sub);
        }
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
    this.segmentNodes.forEach((node, i) => node.classList.toggle('is-winner', i === index));
  }

  clearWinner() {
    this.segmentNodes.forEach((node) => node.classList.remove('is-winner'));
  }

  bouncePointer() {
    this.pointer.classList.remove('is-ticking');
    void this.pointer.offsetWidth;
    this.pointer.classList.add('is-ticking');
  }

  spinTo(index, rng = Math.random) {
    this.clearWinner();
    const startRotation = this.rotation;
    const targetRotation = landingRotation(startRotation, index, this.segments.length, rng);
    const distance = targetRotation - startRotation;
    const slice = segmentAngle(this.segments.length);
    const startedAt = performance.now();
    let lastBoundary = Math.floor(startRotation / slice);

    this.audio.spinStart();

    return new Promise((resolve) => {
      const frame = (now) => {
        const t = Math.min(1, (now - startedAt) / SPIN_DURATION_MS);
        const eased = easeOutQuint(t);
        const current = startRotation + distance * eased;
        this.rotor.style.transform = 'rotate(' + current + 'deg)';

        const boundary = Math.floor(current / slice);
        if (boundary !== lastBoundary) {
          const progressSpeed = Math.max(0.12, 1 - t);
          this.audio.tick(progressSpeed);
          this.bouncePointer();
          lastBoundary = boundary;
        }

        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }

        this.rotation = targetRotation;
        this.rotor.style.transform = 'rotate(' + targetRotation + 'deg)';
        this.setWinner(index);
        this.audio.impact();
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }
}
