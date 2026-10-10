// On-screen keys, computer keyboard and Web MIDI for the KEYBOARD/CV module.
import { el } from './svg.js';
import { KEY_BASE_MIDI, KEY_COUNT, VOLT_PER_OCT, GATE_HIGH } from '../modules/keyboard.js';

const BLACK = new Set([1, 3, 6, 8, 10]);
const QWERTY = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17 };

// hooks.onParam(moduleId, id, value) is used to send cv / gate.
export function createKeys(svg, d, hooks) {
  const moduleId = hooks.moduleId;
  const whites = [];
  for (let i = 0; i < KEY_COUNT; i++) if (!BLACK.has(i % 12)) whites.push(i);
  const ww = d.w / whites.length;
  const g = el('g', { class: 'keys' });
  const keyEls = new Map();
  const whiteX = new Map();
  whites.forEach((n, idx) => {
    const x = d.x + idx * ww;
    whiteX.set(n, x);
    const r = el('rect', { x, y: d.y, width: ww - 0.6, height: d.h, fill: '#f2f0ea', stroke: '#333', 'stroke-width': 0.5, class: 'key white', 'data-note': n });
    g.appendChild(r);
    keyEls.set(n, r);
  });
  for (let n = 0; n < KEY_COUNT; n++) {
    if (!BLACK.has(n % 12)) continue;
    const prevWhite = n - 1;
    const x = whiteX.get(prevWhite) + ww * 0.65;
    const r = el('rect', { x, y: d.y, width: ww * 0.7, height: d.h * 0.6, fill: '#161616', stroke: '#000', 'stroke-width': 0.5, class: 'key black', 'data-note': n });
    g.appendChild(r);
    keyEls.set(n, r);
  }
  svg.appendChild(g);

  // ---- note state (last-note priority, gate while any key is held) ----
  const held = [];         // stack of midi notes
  let octaveShift = 0;     // computer keyboard octave shift (in octaves)
  let lastCv = 0;

  function midiToCv(midi) {
    return Math.max(0, (midi - KEY_BASE_MIDI) / 12 * VOLT_PER_OCT);
  }
  function refresh() {
    const top = held.length ? held[held.length - 1] : null;
    if (top !== null) {
      lastCv = midiToCv(top);
      hooks.onParam(moduleId, 'cv', lastCv);
    }
    hooks.onParam(moduleId, 'gate', held.length ? GATE_HIGH : 0);
    keyEls.forEach((r, n) => r.classList.toggle('down', held.includes(n + KEY_BASE_MIDI)));
  }
  function noteOn(midi) {
    if (held.includes(midi)) return;
    held.push(midi);
    refresh();
  }
  function noteOff(midi) {
    const i = held.indexOf(midi);
    if (i < 0) return;
    held.splice(i, 1);
    refresh();
  }

  // mouse / touch on keys
  let pointerNote = null;
  const noteAt = (ev) => {
    const t = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!t || !t.classList || !t.classList.contains('key')) return null;
    if (t.ownerSVGElement !== svg) return null;
    return Number(t.getAttribute('data-note')) + KEY_BASE_MIDI;
  };
  g.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    const n = noteAt(ev);
    if (n === null) return;
    pointerNote = n;
    g.setPointerCapture(ev.pointerId);
    noteOn(n);
  });
  g.addEventListener('pointermove', (ev) => {
    if (pointerNote === null) return;
    const n = noteAt(ev);
    if (n !== null && n !== pointerNote) { noteOff(pointerNote); pointerNote = n; noteOn(n); }
  });
  const up = (ev) => {
    if (pointerNote === null) return;
    noteOff(pointerNote);
    pointerNote = null;
    try { g.releasePointerCapture(ev.pointerId); } catch (e) {}
  };
  g.addEventListener('pointerup', up);
  g.addEventListener('pointercancel', up);

  // computer keyboard
  const downKeys = new Map();   // key -> midi
  const onKeyDown = (ev) => {
    if (ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tgt = ev.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return;
    const k = ev.key.toLowerCase();
    if (k === 'z') { octaveShift = Math.max(-2, octaveShift - 1); return; }
    if (k === 'x') { octaveShift = Math.min(3, octaveShift + 1); return; }
    if (!(k in QWERTY)) return;
    ev.preventDefault();
    const midi = KEY_BASE_MIDI + QWERTY[k] + octaveShift * 12;
    if (downKeys.has(k)) return;
    downKeys.set(k, midi);
    noteOn(midi);
  };
  const onKeyUp = (ev) => {
    const k = ev.key.toLowerCase();
    if (!downKeys.has(k)) return;
    noteOff(downKeys.get(k));
    downKeys.delete(k);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { for (const m of [...downKeys.values()]) noteOff(m); downKeys.clear(); });

  // Web MIDI
  const status = svg.querySelector('[data-id="midi_status"]');
  const setStatus = (s) => { if (status) status.textContent = s; };
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then((access) => {
      const bind = () => {
        let count = 0;
        access.inputs.forEach((inp) => {
          count++;
          inp.onmidimessage = (m) => {
            const [st, d1, d2] = m.data;
            const type = st & 0xf0;
            if (type === 0x90 && d2 > 0) noteOn(d1);
            else if (type === 0x80 || (type === 0x90 && d2 === 0)) noteOff(d1);
          };
        });
        setStatus(count ? `MIDI: ${count} input(s)` : 'MIDI: no inputs');
      };
      bind();
      access.onstatechange = bind;
    }, () => setStatus('MIDI: access denied'));
  } else {
    setStatus('MIDI: not available');
  }

  return {
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
