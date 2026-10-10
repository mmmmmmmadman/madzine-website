// Dual Ring Modulator panel definition. Pure data: shared by the UI (SVG panel)
// and the AudioWorklet (parameter list, jack list). No DOM access allowed here.
//
// Panel coordinates are in "panel units": height 400 = full 4U panel height.
// Proportions measured from reference/images/ring-modulator.jpg (panel aspect
// 1.62:1 tall, i.e. about half the width of the Triple VCO).

const SECTION_TOPS = [0, 183];

function section(n) {
  const t = SECTION_TOPS[n - 1];
  const p = `s${n}`;

  const controls = [
    { id: `${p}_lvl2`, type: 'knob', label: '', cap: 'white', r: 24, x: 123, y: t + 100, def: 10 },
    { id: `${p}_lvl1`, type: 'knob', label: '', cap: 'white', r: 24, x: 61, y: t + 164, def: 10 },
    { id: `${p}_out`, type: 'knob', label: '', cap: 'orange', r: 24, x: 185, y: t + 164, def: 7 },
  ];

  const jacks = [
    { id: `${p}_in1b`, kind: 'banana', dir: 'in', x: 31, y: t + 42, label: '' },
    { id: `${p}_in1tj`, kind: 'tj', dir: 'in', x: 62, y: t + 42, label: '' },
    { id: `${p}_in2b`, kind: 'banana', dir: 'in', x: 92, y: t + 42, label: '' },
    { id: `${p}_in2tj`, kind: 'tj', dir: 'in', x: 123, y: t + 42, label: '' },
    { id: `${p}_out1`, kind: 'tj', dir: 'out', x: 184, y: t + 42, label: '' },
    { id: `${p}_out2`, kind: 'tj', dir: 'out', x: 213, y: t + 42, label: '' },
  ];

  const decor = [
    { type: 'text', text: 'INPUT 1', x: 47, y: t + 28, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'INPUT 2', x: 107, y: t + 28, size: 5.2, anchor: 'middle', bold: true },
    { type: 'text', text: 'OUTPUT', x: 198, y: t + 28, size: 5.2, anchor: 'middle', bold: true },
    { type: 'hline', y: t + 60 },
    // thin lines from the jacks to the knobs, as printed on the real panel
    { type: 'path', d: `M31,${t + 49} L31,${t + 52} L22,${t + 52} L22,${t + 152} Q22,${t + 160} 37,${t + 159}` },
    { type: 'path', d: `M92,${t + 49} L92,${t + 52} L83,${t + 52} L83,${t + 88} Q83,${t + 96} 99,${t + 95}` },
    { type: 'path', d: `M213,${t + 49} L213,${t + 52} L224,${t + 52} L224,${t + 152} Q224,${t + 160} 209,${t + 159}` },
  ];
  if (n === 1) decor.push({ type: 'hline', y: t + 199 });
  return { controls, jacks, decor };
}

const sections = [section(1), section(2)];

export default {
  type: 'dual-ring-mod',
  title: 'DUAL RING MODULATOR',
  brand: true,
  width: 247,
  height: 400,
  controls: sections.flatMap(s => s.controls),
  jacks: sections.flatMap(s => s.jacks),
  decor: [
    { type: 'tag', text: 'DUAL RING MODULATOR', x: 70, y: 4, w: 107, h: 11 },
    { type: 'text', text: 'SOUNDFREAK & Electronic Music Studios (Cornwall)', x: 20, y: 396, size: 4.2, anchor: 'start' },
    ...sections.flatMap(s => s.decor),
  ],
};
