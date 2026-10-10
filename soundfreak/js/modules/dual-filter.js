// Dual Filter/Oscillator panel definition. Pure data: shared by the UI (SVG
// panel) and the AudioWorklet (parameter list, jack list). No DOM access here.
//
// Panel coordinates are in "panel units": height 400 = full 4U panel height.
// Proportions measured from reference/images/dual-filter.jpg (panel aspect
// 1.64:1 high, i.e. 244 x 400 units, half the Triple VCO width).
// Two identical sections, upper (prefix a) and lower (prefix b).

const SECTION_TOPS = [18, 201];
const SECTION_H = 183;

function section(n) {
  const t = SECTION_TOPS[n];
  const p = n === 0 ? 'a' : 'b';

  const controls = [
    { id: `${p}_slew`, type: 'switch', x: 22, y: t + 58, def: 0, labels: ['SLEW ON', 'SLEW OFF'] },
    { id: `${p}_fcv`, type: 'knob', label: 'FREQUENCY CV', cap: 'blue', r: 27, x: 83, y: t + 80, def: 5 },
    { id: `${p}_rcv`, type: 'knob', label: 'RESPONSE CV', cap: 'silver', r: 27, x: 166, y: t + 80, def: 0 },
    { id: `${p}_db`, type: 'switch', x: 221, y: t + 58, def: 0, labels: ['24 dB', '18 dB'] },
    { id: `${p}_freq`, type: 'knob', label: 'FREQUENCY', cap: 'blue', r: 24, x: 40, y: t + 146, def: 5, fmt: 'filter-freq', labelPos: [29, t + 107] },
    { id: `${p}_fm`, type: 'knob', label: 'F.M.', cap: 'red', r: 24, x: 122, y: t + 146, def: 0, labelPos: [122, t + 107] },
    { id: `${p}_resp`, type: 'knob', label: 'RESPONSE', cap: 'dark', r: 24, x: 206, y: t + 146, def: 0, labelPos: [217, t + 107] },
  ];

  const jacks = [
    { id: `${p}_in1`, kind: 'tj', dir: 'in', x: 24, y: t + 24, label: '' },
    { id: `${p}_in2`, kind: 'tj', dir: 'in', x: 53, y: t + 24, label: '' },
    { id: `${p}_fcvin`, kind: 'banana', dir: 'in', x: 84, y: t + 24, label: '' },
    { id: `${p}_fmin`, kind: 'tj', dir: 'in', x: 122, y: t + 24, label: '' },
    { id: `${p}_rcvin`, kind: 'banana', dir: 'in', x: 159, y: t + 24, label: '' },
    { id: `${p}_out1`, kind: 'tj', dir: 'out', x: 190, y: t + 24, label: '' },
    { id: `${p}_out2`, kind: 'tj', dir: 'out', x: 219, y: t + 24, label: '' },
  ];

  const decor = [
    // jack row headings
    { type: 'text', text: 'INPUT', x: 38.5, y: t + 6, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'FREQUENCY', x: 84, y: t + 6, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'F.M.', x: 122, y: t + 6, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'RESPONSE', x: 159, y: t + 6, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'OUTPUT', x: 204.5, y: t + 6, size: 5.2, anchor: 'middle', bold: true },
    // mult links between the paired jacks, and CV-to-knob ticks
    { type: 'path', d: `M31,${t + 24} L46,${t + 24}`, width: 0.7 },
    { type: 'path', d: `M197,${t + 24} L212,${t + 24}`, width: 0.7 },
    { type: 'path', d: `M84,${t + 32} L84,${t + 41}`, width: 0.7 },
    { type: 'path', d: `M159,${t + 32} L159,${t + 41}`, width: 0.7 },
    { type: 'hline', y: t + 41 },
    // switch labels
    { type: 'text', text: 'SLEW', x: 22, y: t + 78, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'dB', x: 221, y: t + 78, size: 5.2, anchor: 'middle', bold: true },
    // Response scale end labels with small arrows
    { type: 'text', text: 'Low Pass', x: 182, y: t + 178, size: 4.2, anchor: 'end', bold: true },
    { type: 'path', d: `M171,${t + 167} L176,${t + 172} M176,${t + 169} L176,${t + 172} L173,${t + 172}`, width: 0.6 },
    { type: 'text', text: 'Osc', x: 230, y: t + 178, size: 4.2, anchor: 'start', bold: true },
    { type: 'path', d: `M237,${t + 167} L232,${t + 172} M232,${t + 169} L232,${t + 172} L235,${t + 172}`, width: 0.6 },
  ];
  if (n === 0) decor.push({ type: 'hline', y: t + SECTION_H });
  return { controls, jacks, decor };
}

const sections = [section(0), section(1)];

export default {
  type: 'dual-filter',
  title: 'DUAL FILTER/OSCILLATOR',
  brand: true,
  width: 244,
  height: 400,
  controls: sections.flatMap(s => s.controls),
  jacks: sections.flatMap(s => s.jacks),
  decor: [
    { type: 'tag', text: 'DUAL FILTER/OSCILLATOR', x: 62, y: 4, w: 120, h: 11 },
    { type: 'hline', y: 18 },
    { type: 'text', text: 'SOUNDFREAK & Electronic Music Studios (Cornwall)', x: 8, y: 396, size: 4.5, anchor: 'start' },
    ...sections.flatMap(s => s.decor),
  ],
};
