// Envelope Shaper + Noise Generator panel definition. Pure data: shared by the
// UI (SVG panel) and the AudioWorklet (parameter list, jack list). No DOM here.
//
// Panel units: height 400 = full 4U panel height. Width 247 (aspect 1.62:1,
// measured from reference/images/envelope-shaper.jpg; photo px * 0.2 = units).

const KNOB_R = 26;

export default {
  type: 'envelope-shaper',
  title: 'ENVELOPE SHAPER',
  brand: true,
  width: 247,
  height: 400,
  controls: [
    // Envelope Shaper
    { id: 'time', type: 'switch', x: 20, y: 104, def: 1, labels: ['1x', '10x'] },
    { id: 'attack', type: 'knob', label: 'ATTACK', cap: 'red', r: KNOB_R, x: 73.6, y: 104, def: 2, labelPos: [73.6, 60] },
    { id: 'decay', type: 'knob', label: 'DECAY', cap: 'red', r: KNOB_R, x: 175.6, y: 104, def: 5, labelPos: [175.6, 60] },
    { id: 'on', type: 'knob', label: 'ON', cap: 'red', r: KNOB_R, x: 73.6, y: 186, def: 2, labelPos: [73.6, 142] },
    { id: 'off', type: 'knob', label: 'OFF', cap: 'red', r: KNOB_R, x: 175.6, y: 186, def: 7, labelPos: [175.6, 142] },
    { id: 'trap_lvl', type: 'knob', label: 'TRAPEZOID', cap: 'silver', r: KNOB_R, x: 73.6, y: 266, def: 10, labelPos: [73.6, 222] },
    { id: 'sig_lvl', type: 'knob', label: 'SIGNAL', cap: 'silver', r: KNOB_R, x: 175.6, y: 266, def: 10, labelPos: [175.6, 222] },
    // Noise Generator
    { id: 'colour', type: 'knob', label: 'COLOUR', cap: 'green', r: KNOB_R, x: 66, y: 348, def: 5, labelPos: [66, 386] },
    { id: 'noise_lvl', type: 'knob', label: 'LEVEL', cap: 'silver', r: KNOB_R, x: 176, y: 348, def: 5, labelPos: [176, 386] },
  ],
  jacks: [
    // Envelope Shaper, top row (left to right)
    { id: 'in1', kind: 'tj', dir: 'in', x: 20, y: 39, label: '' },
    { id: 'in2', kind: 'tj', dir: 'in', x: 50, y: 39, label: '' },
    { id: 'in3', kind: 'tj', dir: 'in', x: 80, y: 39, label: '' },
    { id: 'in4', kind: 'tj', dir: 'in', x: 109, y: 39, label: '' },
    { id: 'attack_in', kind: 'banana', dir: 'in', x: 138, y: 39, label: '', color: 'red' },
    { id: 'decay_cv', kind: 'banana', dir: 'in', x: 197, y: 39, label: '' },
    { id: 'sig_tj', kind: 'tj', dir: 'out', x: 227, y: 39, label: '' },
    // Envelope Shaper, CV outputs
    { id: 'trap_out', kind: 'banana', dir: 'out', x: 20, y: 282, label: '' },
    { id: 'sig_cv', kind: 'banana', dir: 'out', x: 228, y: 282, label: '' },
    // Noise Generator
    { id: 'colour_cv', kind: 'banana', dir: 'in', x: 20, y: 322, label: '' },
    { id: 'noise_out', kind: 'tj', dir: 'out', x: 228, y: 322, label: '' },
  ],
  decor: [
    { type: 'tag', text: 'ENVELOPE SHAPER', x: 84, y: 4, w: 80, h: 10 },
    { type: 'hline', y: 17 },
    { type: 'text', text: 'INPUT', x: 65, y: 26, size: 5.2, anchor: 'middle' },
    { type: 'text', text: 'ATTACK', x: 153, y: 26, size: 5.2, anchor: 'middle' },
    { type: 'text', text: 'SIGNAL', x: 227, y: 26, size: 5.2, anchor: 'middle' },
    { type: 'led', id: 'attack_led', x: 168, y: 40, r: 2.4 },
    { type: 'hline', y: 58 },
    { type: 'text', text: 'Time', x: 20, y: 79, size: 4.5, anchor: 'middle' },
    { type: 'text', text: '1x', x: 20, y: 86, size: 4.5, anchor: 'middle' },
    { type: 'text', text: '10x', x: 20, y: 129, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'Slow', x: 120, y: 137, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'Slow', x: 222, y: 137, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'Long', x: 118, y: 219, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'Manual', x: 224, y: 219, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'LEVEL', x: 124.6, y: 248, size: 5.2, anchor: 'middle' },
    { type: 'hline', y: 300 },
    { type: 'tag', text: 'NOISE GENERATOR', x: 84, y: 303, w: 80, h: 10 },
    { type: 'text', text: 'OUTPUT', x: 227, y: 310, size: 5.2, anchor: 'middle' },
    { type: 'text', text: 'Low', x: 34, y: 379, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'High', x: 112, y: 379, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'SOUNDFREAK & Electronic Music Studios (Cornwall)', x: 123.5, y: 396, size: 4.5, anchor: 'middle' },
  ],
};
