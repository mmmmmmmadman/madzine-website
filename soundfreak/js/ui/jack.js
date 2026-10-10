// Jack graphics. Banana = plastic ring (black for inputs, blue for outputs as on
// the real panel). Tini-Jax = metal hex nut with a hole. The cable drag
// interaction is handled by the rack (event delegation on .jack elements).
import { el, text } from './svg.js';

export const JACK_R = 7;

export function createJack(def, moduleId) {
  const { x, y } = def;
  const g = el('g', {
    class: `jack jack-${def.kind} jack-${def.dir}`,
    'data-module': moduleId,
    'data-jack': def.id,
    'data-kind': def.kind,
    'data-dir': def.dir,
  });
  if (def.kind === 'banana') {
    const ring = def.dir === 'out' ? '#3f7aa6' : '#161616';
    g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R, fill: ring, stroke: '#000', 'stroke-width': 0.5 }));
    g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R * 0.62, fill: def.dir === 'out' ? '#2a5878' : '#0a0a0a' }));
    g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R * 0.3, fill: '#000' }));
  } else {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      pts.push(`${(x + JACK_R * Math.cos(a)).toFixed(2)},${(y + JACK_R * Math.sin(a)).toFixed(2)}`);
    }
    g.appendChild(el('polygon', { points: pts.join(' '), fill: 'url(#metal)', stroke: '#555', 'stroke-width': 0.5 }));
    g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R * 0.6, fill: '#bbb', stroke: '#666', 'stroke-width': 0.4 }));
    g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R * 0.32, fill: '#000' }));
  }
  if (def.label) g.appendChild(text(x, y + JACK_R + 5.5, def.label, 4.2));
  g.appendChild(el('circle', { cx: x, cy: y, r: JACK_R + 2, fill: 'transparent', class: 'jack-hit' }));
  return g;
}
