// OUTPUT utility module (not Soundfreak-branded). Pure data.

export default {
  type: 'output',
  title: 'OUTPUT',
  brand: false,
  width: 120,
  height: 400,
  controls: [
    { id: 'level', type: 'knob', label: 'LEVEL', cap: 'dark', r: 26, x: 60, y: 230, def: 7, labelPos: [60, 186] },
  ],
  jacks: [
    { id: 'in_l', kind: 'tj', dir: 'in', x: 36, y: 330, label: 'L' },
    { id: 'in_r', kind: 'tj', dir: 'in', x: 84, y: 330, label: 'R' },
  ],
  decor: [
    { type: 'tag', text: 'OUTPUT', x: 30, y: 6, w: 60, h: 11 },
    { type: 'meter', id: 'meter', x: 30, y: 50, w: 60, h: 110 },
    { type: 'text', text: 'L', x: 42, y: 172, size: 5, anchor: 'middle' },
    { type: 'text', text: 'R', x: 78, y: 172, size: 5, anchor: 'middle' },
    { type: 'text', text: 'INPUT', x: 60, y: 355, size: 5, anchor: 'middle' },
  ],
};
