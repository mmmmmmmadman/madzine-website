// Builds an SVG panel from a module definition.
import { el, text, polar } from './svg.js';
import { createKnob, createSwitch } from './knob.js';
import { createJack } from './jack.js';
import { createKeys } from './keyboard-ui.js';

export const SCALE = 1.6;   // CSS px per panel unit

const WAVE_PATHS = {
  sine: 'M0,4 C2,-1 4,-1 6,4 C8,9 10,9 12,4',
  saw: 'M0,8 L12,0 L12,8',
  pulse: 'M0,8 L0,0 L6,0 L6,8 L12,8 L12,0',
  tri: 'M0,8 L6,0 L12,8',
};

function defs() {
  const d = el('defs');
  const grad = (id, stops, attrs = {}) => {
    const g = el('radialGradient', { id, ...attrs });
    for (const [off, col] of stops) g.appendChild(el('stop', { offset: off, 'stop-color': col }));
    d.appendChild(g);
  };
  grad('skirt', [['0%', '#3a3a3a'], ['70%', '#141414'], ['100%', '#050505']], { cx: '35%', cy: '30%', r: '80%' });
  grad('capSilver', [['0%', '#ffffff'], ['55%', '#d6d6d6'], ['100%', '#7a7a7a']], { cx: '35%', cy: '30%', r: '75%' });
  grad('dialRing', [['60%', '#cfcfcf'], ['85%', '#9c9c9c'], ['100%', '#6d6d6d']], { cx: '40%', cy: '35%', r: '70%' });
  const lin = el('linearGradient', { id: 'metal', x1: '0', y1: '0', x2: '1', y2: '1' });
  for (const [o, c] of [['0%', '#f0f0f0'], ['50%', '#a8a8a8'], ['100%', '#e6e6e6']]) lin.appendChild(el('stop', { offset: o, 'stop-color': c }));
  d.appendChild(lin);
  return d;
}

function tag(x, y, w, h, str) {
  const g = el('g');
  g.appendChild(el('rect', { x, y, width: w, height: h, rx: 1, fill: '#111' }));
  g.appendChild(text(x + w / 2, y + h * 0.72, str, h * 0.62, 'middle', { fill: '#fff', class: 'lbl tag' }));
  return g;
}

function waveIcon(wave, x, y) {
  return el('path', { d: WAVE_PATHS[wave], transform: `translate(${x - 6} ${y - 4}) scale(1)`, fill: 'none', stroke: '#111', 'stroke-width': 0.9, 'stroke-linejoin': 'round' });
}

// Returns { svg, controls: Map<id, {set,get}>, custom: {...} }
export function createPanel(def, moduleId, params, hooks) {
  const svg = el('svg', {
    viewBox: `0 0 ${def.width} ${def.height}`,
    width: def.width * SCALE,
    height: def.height * SCALE,
    class: `panel ${def.brand ? 'brand' : 'utility'}`,
  });
  svg.appendChild(defs());
  svg.appendChild(el('rect', { x: 0, y: 0, width: def.width, height: def.height, fill: def.brand ? '#d8d5cd' : '#c9c6bf', stroke: '#8d8a83', 'stroke-width': 1 }));
  // mounting screws
  for (const [sx, sy] of [[6, 6], [def.width - 6, 6], [6, def.height - 6], [def.width - 6, def.height - 6]]) {
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: 2.6, fill: 'url(#metal)', stroke: '#777', 'stroke-width': 0.4 }));
    svg.appendChild(el('line', { x1: sx - 1.6, y1: sy, x2: sx + 1.6, y2: sy, stroke: '#555', 'stroke-width': 0.5 }));
  }

  const custom = {};
  for (const d of def.decor || []) {
    if (d.type === 'tag') svg.appendChild(tag(d.x, d.y, d.w, d.h, d.text));
    else if (d.type === 'text') svg.appendChild(text(d.x, d.y, d.text, d.size, d.anchor, { ...(d.id ? { 'data-id': d.id } : {}), ...(d.bold ? { class: 'lbl bold' } : {}) }));
    else if (d.type === 'path') svg.appendChild(el('path', { d: d.d, fill: 'none', stroke: '#111', 'stroke-width': d.width ?? 0.7, 'stroke-linecap': 'round' }));
    else if (d.type === 'hline') svg.appendChild(el('line', { x1: 6, y1: d.y, x2: def.width - 6, y2: d.y, stroke: '#111', 'stroke-width': 0.6 }));
    else if (d.type === 'wave') svg.appendChild(waveIcon(d.wave, d.x, d.y));
    else if (d.type === 'meter') custom.meter = createMeter(svg, d);
    else if (d.type === 'keys') custom.keys = createKeys(svg, d, hooks);
    else if (d.type === 'leds') custom.leds = createLeds(svg, d);
    else if (d.type === 'chain') svg.appendChild(chainLabel(d));
    else if (d.type === 'led') custom[d.id || 'led'] = createLed(svg, d);
  }

  const controls = new Map();
  for (const c of def.controls) {
    const v = params[c.id] ?? c.def;
    if (c.type === 'knob') {
      if (c.label && c.labelPos) svg.appendChild(text(c.labelPos[0], c.labelPos[1], c.label, 5.2, 'middle', { class: 'lbl bold' }));
      if (c.icon && c.iconPos) svg.appendChild(waveIcon(c.icon, c.iconPos[0], c.iconPos[1]));
      const k = createKnob(c, v, (nv) => hooks.onParam(moduleId, c.id, nv));
      svg.appendChild(k.g);
      controls.set(c.id, k);
    } else if (c.type === 'switch') {
      const s = createSwitch(c, v, (nv) => hooks.onParam(moduleId, c.id, nv));
      svg.appendChild(s.g);
      controls.set(c.id, s);
    } else if (c.type === 'selector') {
      const s = createSelector(c, v, (nv) => hooks.onParam(moduleId, c.id, nv));
      svg.appendChild(s.g);
      controls.set(c.id, s);
    } else if (c.type === 'button') {
      const b = createButton(c, (nv) => hooks.onParam(moduleId, c.id, nv));
      svg.appendChild(b.g);
      controls.set(c.id, b);
    }
  }
  for (const j of def.jacks) {
    const jg = createJack(j, moduleId);
    // optional ring colour override (e.g. the red Attack pulse banana on the Envelope Shaper)
    if (j.color && j.kind === 'banana') {
      const ring = jg.querySelector('circle');
      if (ring) ring.setAttribute('fill', JACK_RING_COLORS[j.color] || j.color);
    }
    svg.appendChild(jg);
  }

  return { svg, controls, custom };
}

const JACK_RING_COLORS = { red: '#c8242a', blue: '#3f7aa6', black: '#161616' };

// Small panel LED. Returns { set(on) }. Starts off.
function createLed(svg, d) {
  const r = d.r ?? 2.4;
  const g = el('g', { class: 'led', 'data-id': d.id });
  g.appendChild(el('circle', { cx: d.x, cy: d.y, r: r + 0.8, fill: '#2a2a2a', stroke: '#000', 'stroke-width': 0.3 }));
  const lamp = el('circle', { cx: d.x, cy: d.y, r, fill: '#5a1a1c' });
  g.appendChild(lamp);
  svg.appendChild(g);
  return {
    set(on) { lamp.setAttribute('fill', on ? '#ff3b3b' : '#5a1a1c'); },
  };
}

function createMeter(svg, d) {
  const g = el('g', { class: 'meter' });
  const barW = (d.w - 12) / 2;
  const bars = [];
  for (let i = 0; i < 2; i++) {
    const bx = d.x + 4 + i * (barW + 4);
    g.appendChild(el('rect', { x: bx, y: d.y, width: barW, height: d.h, fill: '#1a1a1a', stroke: '#444', 'stroke-width': 0.5 }));
    const fill = el('rect', { x: bx + 1, y: d.y + d.h - 1, width: barW - 2, height: 0, fill: '#3fb950' });
    const peak = el('rect', { x: bx + 1, y: d.y + d.h - 1, width: barW - 2, height: 1, fill: '#e0e0e0' });
    g.appendChild(fill);
    g.appendChild(peak);
    bars.push({ fill, peak, hold: 0, holdT: 0 });
  }
  // 0 dB line
  g.appendChild(el('line', { x1: d.x, y1: d.y + 2, x2: d.x + d.w, y2: d.y + 2, stroke: '#d9252c', 'stroke-width': 0.6 }));
  svg.appendChild(g);
  const toH = (lin) => {
    if (lin <= 0.0001) return 0;
    const db = 20 * Math.log10(lin);
    const f = Math.max(0, Math.min(1, (db + 48) / 48));
    return f * (d.h - 2);
  };
  return {
    set(l, r) {
      [l, r].forEach((v, i) => {
        const b = bars[i];
        const h = toH(v);
        b.fill.setAttribute('height', h);
        b.fill.setAttribute('y', d.y + d.h - 1 - h);
        b.fill.setAttribute('fill', v >= 0.99 ? '#d9252c' : v > 0.7 ? '#e0b030' : '#3fb950');
        const now = performance.now();
        if (h >= b.hold || now - b.holdT > 1200) { b.hold = h; b.holdT = now; }
        b.peak.setAttribute('y', d.y + d.h - 1 - b.hold);
      });
    },
  };
}

// ---- Sequential Voltage Source drawing helpers ----

// Rotary selector with a fixed set of positions. def: { x, y, r, values[], labels[], angles[] }.
// Click = next position (wraps), wheel = previous/next. Value sent = values[index].
function createSelector(def, value, onChange) {
  const { x, y, r } = def;
  const g = el('g', { class: 'selector switch', 'data-id': def.id });
  const count = def.values.length;
  const scale = el('g', { class: 'scale' });
  for (let i = 0; i < count; i++) {
    const deg = def.angles[i];
    const [x1, y1] = polar(x, y, r + 1.5, deg);
    const [x2, y2] = polar(x, y, r + 4.5, deg);
    scale.appendChild(el('line', { x1, y1, x2, y2, stroke: '#111', 'stroke-width': 0.7 }));
    // numeric positions get their number printed next to the tick (word labels are decor)
    if (def.labels[i].length <= 2) {
      const [tx, ty] = polar(x, y, r + 9, deg);
      scale.appendChild(text(tx, ty + 1.6, def.labels[i], 4.2, 'middle'));
    }
  }
  g.appendChild(scale);
  g.appendChild(el('circle', { cx: x, cy: y, r, fill: 'url(#skirt)', stroke: '#000', 'stroke-width': 0.5 }));
  g.appendChild(el('circle', { cx: x, cy: y, r: r * 0.62, fill: '#3a3a3a', stroke: '#000', 'stroke-width': 0.4 }));
  const rot = el('g', { class: 'pointer' });
  rot.appendChild(el('circle', { cx: x, cy: y - r * 0.84, r: r * 0.09 + 0.6, fill: '#fff' }));
  g.appendChild(rot);
  const hit = el('circle', { cx: x, cy: y, r: r + 2, fill: 'transparent' });
  g.appendChild(hit);

  let idx = Math.max(0, def.values.indexOf(value ?? def.def));
  if (idx < 0) idx = 0;
  function render() {
    rot.setAttribute('transform', `rotate(${def.angles[idx]} ${x} ${y})`);
  }
  function setIndex(i, fire = true) {
    i = ((i % count) + count) % count;
    if (i === idx) return;
    idx = i;
    render();
    if (fire) onChange(def.values[idx]);
  }
  render();
  hit.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    setIndex(idx + 1);
  });
  hit.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    setIndex(idx + (ev.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  return {
    g,
    set: (nv) => { const i = def.values.indexOf(nv); if (i >= 0) { idx = i; render(); } },
    get: () => def.values[idx],
  };
}

// Momentary push button (chrome ring, red cap). Sends 1 on press, 0 on release.
function createButton(def, onChange) {
  const { x, y, r } = def;
  const g = el('g', { class: 'pushbutton switch', 'data-id': def.id });
  g.appendChild(el('circle', { cx: x, cy: y, r, fill: 'url(#metal)', stroke: '#555', 'stroke-width': 0.5 }));
  const cap = el('circle', { cx: x, cy: y, r: r * 0.55, fill: '#d9252c', stroke: '#6a0d12', 'stroke-width': 0.5 });
  g.appendChild(cap);
  const hit = el('circle', { cx: x, cy: y, r: r + 2, fill: 'transparent' });
  g.appendChild(hit);
  let down = false;
  const press = (ev) => {
    if (ev.button !== 0 || down) return;
    ev.preventDefault();
    ev.stopPropagation();
    down = true;
    cap.setAttribute('fill', '#9a1419');
    try { hit.setPointerCapture(ev.pointerId); } catch (e) {}
    onChange(1);
  };
  const release = (ev) => {
    if (!down) return;
    down = false;
    cap.setAttribute('fill', '#d9252c');
    try { hit.releasePointerCapture(ev.pointerId); } catch (e) {}
    onChange(0);
  };
  hit.addEventListener('pointerdown', press);
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', release);
  return { g, set: () => {}, get: () => (down ? 1 : 0) };
}

// Row of step LEDs. d: { xs[], y, r }. custom.leds.set(step, active) lights one.
function createLeds(svg, d) {
  const g = el('g', { class: 'leds' });
  const lamps = [];
  for (const x of d.xs) {
    g.appendChild(el('circle', { cx: x, cy: d.y, r: d.r + 3, fill: '#161616', stroke: '#000', 'stroke-width': 0.5 }));
    const lamp = el('circle', { cx: x, cy: d.y, r: d.r, fill: '#5a1010' });
    g.appendChild(lamp);
    lamps.push(lamp);
  }
  svg.appendChild(g);
  let cur = -1;
  return {
    set(step) {
      if (step === cur) return;
      if (cur >= 0 && lamps[cur]) lamps[cur].setAttribute('fill', '#5a1010');
      cur = step;
      if (cur >= 0 && lamps[cur]) lamps[cur].setAttribute('fill', '#ff2a2a');
    },
  };
}

// Letters joined by small arrows, e.g. A -> B -> C -> D, centred on (x, y).
function chainLabel(d) {
  const g = el('g');
  const size = d.size || 4.5;
  const letterW = size * 0.75, arrowW = size * 1.2, gap = size * 0.3;
  const total = d.letters.length * letterW + (d.letters.length - 1) * (arrowW + gap * 2);
  let cx = d.x - total / 2;
  d.letters.forEach((L, i) => {
    g.appendChild(text(cx + letterW / 2, d.y, L, size, 'middle'));
    cx += letterW;
    if (i < d.letters.length - 1) {
      const ax = cx + gap, ay = d.y - size * 0.35;
      g.appendChild(el('path', {
        d: `M${ax},${ay} L${ax + arrowW},${ay} M${ax + arrowW - size * 0.35},${ay - size * 0.3} L${ax + arrowW},${ay} L${ax + arrowW - size * 0.35},${ay + size * 0.3}`,
        fill: 'none', stroke: '#111', 'stroke-width': 0.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }));
      cx += gap * 2 + arrowW;
    }
  });
  return g;
}
