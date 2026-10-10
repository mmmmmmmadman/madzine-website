// Rotary knob drawn in SVG. Vertical drag, shift = fine, double-click = reset,
// numeric readout on hover (shared tooltip element).
import { el, text, polar } from './svg.js';

const MIN_DEG = -150, MAX_DEG = 150;
const DRAG_PX_FULL_RANGE = 220;   // CSS pixels for 0 -> 10
const FINE_DIVISOR = 8;

const CAP = {
  blue: '#2b5a6b',
  red: '#d9252c',
  green: '#1f6a44',
  silver: 'url(#capSilver)',
  white: '#ebe9e4',
  orange: '#e8961e',
  dark: '#3a3a3a',
};

let tooltip = null;
function getTooltip() {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function hzString(hz) {
  return hz >= 1000 ? (hz / 1000).toFixed(2) + ' kHz' : hz.toFixed(hz < 10 ? 2 : 1) + ' Hz';
}

// Tooltip formats. The Hz laws mirror the DSP files (see TUNING_NOTES.md):
//   freq         Triple VCO:   f = 10^(0.4 k)        1 Hz .. 10 kHz
//   filter-freq  Dual Filter:  f = 20 * 10^(0.3 k)   20 Hz .. 20 kHz (self-oscillation)
//   tempo        Sequencer:    f = 0.1 * 300^(k/10)  0.1 Hz .. 30 Hz
export function formatValue(def, v) {
  if (def.fmt === 'freq') {
    return `${v.toFixed(2)}  (${hzString(Math.pow(10, 0.4 * v))} at 0 V, VCO range)`;
  }
  if (def.fmt === 'filter-freq') {
    return `${v.toFixed(2)}  (${hzString(20 * Math.pow(10, 0.3 * v))} at 0 V)`;
  }
  if (def.fmt === 'tempo') {
    const hz = 0.1 * Math.pow(300, v / 10);
    return `${v.toFixed(2)}  (${hz.toFixed(2)} Hz, ${(hz * 60).toFixed(0)} steps/min)`;
  }
  return v.toFixed(2);
}

// Big knobs (r > 35, the Triple VCO FREQUENCY) copy the hardware dial
// (reference/images/triple-vco.jpg): a black mounting plate with two screws,
// a large numbered metal disc that turns with the knob, the black knob with
// its cap on top of the disc, and a fixed brass index window sitting OUTSIDE
// the disc above it (between the disc and the FREQUENCY label) with a hairline
// pointing down at the disc rim. The disc reads 0..10 over 180 degrees with
// the numbers increasing counter-clockwise, so turning clockwise brings a
// higher number under the window.
const DIAL_MIN_DEG = -90, DIAL_MAX_DEG = 90;

export function createKnob(def, value, onChange) {
  const { x, y, r } = def;
  const dial = def.r > 35;
  const minDeg = dial ? DIAL_MIN_DEG : MIN_DEG, maxDeg = dial ? DIAL_MAX_DEG : MAX_DEG;
  const g = el('g', { class: 'knob', 'data-id': def.id });

  if (!dial) {
    // fixed scale ticks and numbers around the skirt, 0 bottom-left .. 10 bottom-right
    const scale = el('g', { class: 'scale' });
    for (let i = 0; i <= 10; i++) {
      const deg = MIN_DEG + (MAX_DEG - MIN_DEG) * i / 10;
      const [x1, y1] = polar(x, y, r + 1.5, deg);
      const [x2, y2] = polar(x, y, r + 4.5, deg);
      scale.appendChild(el('line', { x1, y1, x2, y2, stroke: '#111', 'stroke-width': 0.7 }));
      const [tx, ty] = polar(x, y, r + 9, deg);
      scale.appendChild(text(tx, ty + 1.6, String(i), 4.2, 'middle'));
    }
    g.appendChild(scale);
  }

  if (dial) {
    // black mounting plate with two screws (lower-left / lower-right as on the photo)
    g.appendChild(el('circle', { cx: x, cy: y, r: r + 2.5, fill: '#161616', stroke: '#000', 'stroke-width': 0.5 }));
    for (const sx of [-1, 1]) {
      const [cx, cy] = polar(x, y, r + 2.2, 180 - sx * 42);
      g.appendChild(el('circle', { cx, cy, r: 3.2, fill: '#161616', stroke: '#000', 'stroke-width': 0.4 }));
      g.appendChild(el('circle', { cx, cy, r: 2.1, fill: 'url(#capSilver)', stroke: '#333', 'stroke-width': 0.3 }));
      g.appendChild(el('line', { x1: cx - 1.3, y1: cy, x2: cx + 1.3, y2: cy, stroke: '#444', 'stroke-width': 0.35 }));
      g.appendChild(el('line', { x1: cx, y1: cy - 1.3, x2: cx, y2: cy + 1.3, stroke: '#444', 'stroke-width': 0.35 }));
    }
  } else {
    // skirt
    g.appendChild(el('circle', { cx: x, cy: y, r, fill: 'url(#skirt)', stroke: '#000', 'stroke-width': 0.5 }));
  }

  // rotating group: dial ring (big knob) or pointer dot (small knob)
  const rot = el('g', { class: 'pointer' });
  if (dial) {
    const rr = r;
    rot.appendChild(el('circle', { cx: x, cy: y, r: rr, fill: 'url(#dialRing)', stroke: '#555', 'stroke-width': 0.4 }));
    const unit = (maxDeg - minDeg) / 10;
    // number i sits at static angle (maxDeg - unit*i): with the ring rotated by
    // deg(v) = minDeg + unit*v the number equal to v is under the index at 0 deg.
    for (let i = 0; i <= 10; i++) {
      const a = maxDeg - unit * i;
      const [x1, y1] = polar(x, y, rr - 3.2, a);
      const [x2, y2] = polar(x, y, rr - 0.3, a);
      rot.appendChild(el('line', { x1, y1, x2, y2, stroke: '#111', 'stroke-width': 0.6 }));
      if (i < 10) {
        for (let s = 1; s < 10; s++) {
          const a2 = a - unit * s / 10;
          const [a1, b1] = polar(x, y, rr - (s === 5 ? 2.4 : 1.6), a2);
          const [a3, b3] = polar(x, y, rr - 0.3, a2);
          rot.appendChild(el('line', { x1: a1, y1: b1, x2: a3, y2: b3, stroke: '#111', 'stroke-width': 0.35 }));
        }
      }
      const [tx, ty] = polar(x, y, rr - 6.2, a);
      rot.appendChild(text(tx, ty, String(i), 3.6, 'middle', { transform: `rotate(${a} ${tx} ${ty})`, 'dominant-baseline': 'middle' }));
    }
  } else {
    rot.appendChild(el('circle', { cx: x, cy: y - r * 0.84, r: r * 0.09 + 0.6, fill: '#fff' }));
  }
  g.appendChild(rot);

  // cap (static, on top of the ring)
  if (dial) {
    g.appendChild(el('circle', { cx: x, cy: y, r: r * 0.6, fill: 'url(#skirt)', stroke: '#000', 'stroke-width': 0.5 }));
  }
  g.appendChild(el('circle', { cx: x, cy: y, r: r * (dial ? 0.44 : 0.62), fill: CAP[def.cap] || CAP.dark, stroke: '#000', 'stroke-width': 0.4 }));
  if (def.cap === 'silver') {
    g.appendChild(el('circle', { cx: x - r * 0.18, cy: y - r * 0.2, r: r * 0.25, fill: '#fff', opacity: 0.55 }));
  }
  if (dial) {
    // fixed brass index window outside the disc at 12 o'clock, hairline
    // pointing down at the rim (the number under the hairline is the value)
    const w = r * 0.46, top = y - r - 11, bot = y - r + 1.5;
    g.appendChild(el('rect', { x: x - w / 2 - 1.2, y: top - 1.2, width: w + 2.4, height: bot - top + 1.2, rx: 1.5, fill: '#161616' }));
    g.appendChild(el('rect', { x: x - w / 2, y: top, width: w, height: bot - top, rx: 0.8, fill: '#b98c5c', stroke: '#111', 'stroke-width': 0.5 }));
    g.appendChild(el('line', { x1: x, y1: top + 1, x2: x, y2: bot + 2.5, stroke: '#111', 'stroke-width': 0.5 }));
    g.appendChild(el('circle', { cx: x, cy: top + 2.6, r: 0.9, fill: 'none', stroke: '#111', 'stroke-width': 0.4 }));
  }

  // hit area
  const hit = el('circle', { cx: x, cy: y, r: r + 2, fill: 'transparent', class: 'knob-hit' });
  g.appendChild(hit);

  let v = clamp(value ?? def.def);
  function clamp(a) { return Math.max(0, Math.min(10, a)); }
  function render() {
    const deg = minDeg + (maxDeg - minDeg) * v / 10;
    rot.setAttribute('transform', `rotate(${deg} ${x} ${y})`);
  }
  function set(nv, fire = true) {
    nv = clamp(nv);
    if (nv === v) return;
    v = nv;
    render();
    if (fire) onChange(v);
  }
  render();

  const tip = getTooltip();
  function showTip(ev) {
    tip.textContent = `${def.label}: ${formatValue(def, v)}`;
    tip.style.display = 'block';
    tip.style.left = (ev.clientX + 14) + 'px';
    tip.style.top = (ev.clientY + 14) + 'px';
  }
  hit.addEventListener('pointerenter', showTip);
  hit.addEventListener('pointermove', (ev) => { if (!dragging) showTip(ev); });
  hit.addEventListener('pointerleave', () => { if (!dragging) tip.style.display = 'none'; });

  let dragging = false, startY = 0, startV = 0, lastY = 0;
  hit.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging = true;
    startY = lastY = ev.clientY;
    startV = v;
    hit.setPointerCapture(ev.pointerId);
    g.classList.add('active');
  });
  hit.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dy = lastY - ev.clientY;
    lastY = ev.clientY;
    const step = 10 / DRAG_PX_FULL_RANGE / (ev.shiftKey ? FINE_DIVISOR : 1);
    set(v + dy * step);
    showTip(ev);
  });
  const end = (ev) => {
    if (!dragging) return;
    dragging = false;
    g.classList.remove('active');
    try { hit.releasePointerCapture(ev.pointerId); } catch (e) {}
    tip.style.display = 'none';
  };
  hit.addEventListener('pointerup', end);
  hit.addEventListener('pointercancel', end);
  hit.addEventListener('dblclick', (ev) => { ev.preventDefault(); set(def.def); });
  hit.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const step = (ev.shiftKey ? 0.02 : 0.1) * (ev.deltaY < 0 ? 1 : -1);
    set(v + step);
    showTip(ev);
  }, { passive: false });

  return { g, set, get: () => v };
}

// Red-tip toggle switch: value 1 = up (labels[0]), 0 = down (labels[1]).
export function createSwitch(def, value, onChange) {
  const { x, y } = def;
  const g = el('g', { class: 'switch', 'data-id': def.id });
  g.appendChild(el('circle', { cx: x, cy: y, r: 4.2, fill: '#444', stroke: '#111', 'stroke-width': 0.5 }));
  g.appendChild(el('circle', { cx: x, cy: y, r: 2.4, fill: '#222' }));
  const lever = el('line', { x1: x, y1: y, x2: x, y2: y - 8, stroke: '#999', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  const tipc = el('circle', { cx: x, cy: y - 8, r: 2.4, fill: '#d9252c', stroke: '#6a0d12', 'stroke-width': 0.4 });
  g.appendChild(lever);
  g.appendChild(tipc);
  const hit = el('rect', { x: x - 8, y: y - 13, width: 16, height: 26, fill: 'transparent' });
  g.appendChild(hit);
  let v = value ? 1 : 0;
  function render() {
    const ty = v ? y - 8 : y + 8;
    lever.setAttribute('y2', ty);
    tipc.setAttribute('cy', ty);
  }
  render();
  hit.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    v = v ? 0 : 1;
    render();
    onChange(v);
  });
  return { g, set: (nv) => { v = nv ? 1 : 0; render(); }, get: () => v };
}
