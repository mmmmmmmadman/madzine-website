// Triple VCO panel definition. Pure data: shared by the UI (SVG panel) and the
// AudioWorklet (parameter list, jack list). No DOM access allowed here.
//
// Panel coordinates are in "panel units": height 400 = full 4U panel height.
// Proportions measured from reference/images/triple-vco.jpg (panel aspect 1.22:1).

const ROW_TOPS = [20, 137, 263];
const ROW_H = 113;

function oscRow(n) {
  const t = ROW_TOPS[n - 1];
  const p = `o${n}`;
  const isOne = n === 1;
  const w1 = isOne ? 'sine' : 'pulse';
  const w2 = isOne ? 'saw' : 'tri';

  const controls = [
    { id: `${p}_freq`, type: 'knob', label: 'FREQUENCY', cap: 'blue', r: 41, x: 49, y: t + 63, def: 5, fmt: 'freq', labelPos: [56, t + 7] },
    { id: `${p}_sync`, type: 'knob', label: 'SYNC', cap: 'silver', r: 27, x: 142, y: t + 63, def: 0, labelPos: [142, t + 23] },
    { id: `${p}_fm`, type: 'knob', label: 'F.M.', cap: 'red', r: 27, x: 210, y: t + 41, def: 0, labelPos: [210, t + 80] },
    { id: `${p}_shape`, type: 'knob', label: 'SHAPE', cap: 'green', r: 27, x: 281, y: t + 71, def: 5, labelPos: [281, t + 30] },
    { id: `${p}_lvl1`, type: 'knob', label: 'LEVEL', cap: 'silver', r: 26, x: 347, y: t + 46, def: 10, labelPos: [347, t + 6], icon: w1, iconPos: [320, t + 30] },
    { id: `${p}_lvl2`, type: 'knob', label: 'LEVEL', cap: 'silver', r: 26, x: 412, y: t + 68, def: 10, labelPos: [412, t + 28], icon: w2, iconPos: [392, t + 102] },
  ];
  if (n === 3) {
    controls.push({ id: 'o3_lfo', type: 'switch', x: 117, y: t + 22, def: 0, labels: ['LFO', 'VCO'] });
  }

  const jacks = [
    { id: `${p}_cv`, kind: 'banana', dir: 'in', x: 15, y: t + 19, label: '' },
    { id: `${p}_syncin`, kind: 'tj', dir: 'in', x: 181, y: t + 100, label: '' },
    { id: `${p}_fmin`, kind: 'tj', dir: 'in', x: 220, y: t + 100, label: '' },
    { id: `${p}_shapecv`, kind: 'banana', dir: 'in', x: 339, y: t + 100, label: '' },
    { id: `${p}_w1b`, kind: 'banana', dir: 'out', x: 468, y: t + 18, label: '', wave: w1 },
    { id: `${p}_w1tj`, kind: 'tj', dir: 'out', x: 468, y: t + 42, label: '', wave: w1 },
    { id: `${p}_w2b`, kind: 'banana', dir: 'out', x: 468, y: t + 76, label: '', wave: w2 },
    { id: `${p}_w2tj`, kind: 'tj', dir: 'out', x: 468, y: t + 100, label: '', wave: w2 },
  ];

  const decor = [
    { type: 'tag', text: `OSCILLATOR ${n}`, x: 250, y: t + 4, w: 64, h: 10 },
    // as on the photo: 1Hz left of the dial, 10KHz upper right, arrows show the turn direction
    { type: 'text', text: '1Hz', x: 1, y: t + 31, size: 5, anchor: 'start' },
    { type: 'path', d: `M${12},${t + 33} L${7},${t + 39} M${7},${t + 35.5} L${7},${t + 39} L${10.5},${t + 39}`, width: 0.6 },
    { type: 'text', text: '10KHz', x: 92, y: t + 33, size: 5, anchor: 'start' },
    { type: 'path', d: `M${93},${t + 35} L${98},${t + 41} M${98},${t + 37.5} L${98},${t + 41} L${94.5},${t + 41}`, width: 0.6 },
    { type: 'text', text: 'SYNC', x: 181, y: t + 110, size: 4, anchor: 'middle' },
    { type: 'text', text: 'F.M.', x: 220, y: t + 110, size: 4, anchor: 'middle' },
    { type: 'text', text: 'SHAPE', x: 339, y: t + 110, size: 4, anchor: 'middle' },
    { type: 'text', text: 'CV', x: 15, y: t + 10, size: 4, anchor: 'middle' },
    { type: 'wave', wave: w1, x: 452, y: t + 30 },
    { type: 'wave', wave: w2, x: 452, y: t + 88 },
  ];
  if (n < 3) decor.push({ type: 'hline', y: t + ROW_H + 4 });
  if (n === 3) {
    decor.push({ type: 'text', text: 'LFO', x: 117, y: t + 9, size: 4.5, anchor: 'middle' });
    decor.push({ type: 'text', text: 'VCO', x: 117, y: t + 40, size: 4.5, anchor: 'middle' });
  }
  return { controls, jacks, decor };
}

const rows = [oscRow(1), oscRow(2), oscRow(3)];

export default {
  type: 'triple-vco',
  title: 'TRIPLE VCO',
  brand: true,
  width: 488,
  height: 400,
  controls: rows.flatMap(r => r.controls),
  jacks: rows.flatMap(r => r.jacks),
  decor: [
    { type: 'tag', text: 'TRIPLE VCO', x: 404, y: 4, w: 76, h: 11 },
    { type: 'text', text: 'SOUNDFREAK & Electronic Music Studios (Cornwall)', x: 8, y: 396, size: 4.5, anchor: 'start' },
    ...rows.flatMap(r => r.decor),
  ],
};
