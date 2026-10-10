// Sequential Voltage Source panel definition (Buchla 123/140 style). Pure data:
// shared by the UI (SVG panel) and the AudioWorklet. No DOM access allowed here.
//
// Panel units: height 400 = full 4U panel height. Width 732 = 1.5 x Triple VCO.
// Positions measured from reference/images/sequencer.jpg (panel aspect 1.83:1).
//
// Control values sent to the worklet:
//   a1..d8   voltage knobs, 0..10 (volts)
//   steps    2..8 (loop length)
//   mode     0 = START/STOP, 1 = SINGLE PULSE, 2 = LOOP
//   tempo    0..10 knob (0.1 Hz .. 30 Hz exponential, see TUNING_NOTES)
//   extint   1 = INT (up), 0 = EXT (down)
//   btn      manual step button, 1 while pressed, 0 released (not smoothed)

export const ROWS = ['a', 'b', 'c', 'd'];
export const STEP_COUNT = 8;
export const MODE_STARTSTOP = 0;
export const MODE_SINGLE = 1;
export const MODE_LOOP = 2;

// step columns (x) and row baselines (y); even steps sit 28 units lower, as on the panel
const COL_X = [123, 193, 262, 331, 400, 470, 538, 607];
const ROW_Y = [96, 173, 247, 319];
const EVEN_DROP = 28;
const LED_Y = 39;
const PULSE_JACK_Y = 369;
const PULSE_JACK_X = [106, 143, 244, 281, 382, 419, 520, 557];
const VOUT_X = [667, 706];
const VOUT_LABEL_X = 686;

const controls = [];
ROWS.forEach((row, ri) => {
  for (let s = 0; s < STEP_COUNT; s++) {
    controls.push({
      id: `${row}${s + 1}`, type: 'knob', label: `${row.toUpperCase()} ${s + 1}`, cap: 'dark', r: 24,
      x: COL_X[s], y: ROW_Y[ri] + (s % 2 ? EVEN_DROP : 0), def: 0,
    });
  }
});
controls.push(
  { id: 'steps', type: 'selector', x: 688, y: 61, r: 24, values: [2, 3, 4, 5, 6, 7, 8], labels: ['2', '3', '4', '5', '6', '7', '8'], angles: [-135, -90, -45, 0, 45, 90, 135], def: 8, smooth: false },
  { id: 'mode', type: 'selector', x: 40, y: 63, r: 26, values: [MODE_STARTSTOP, MODE_SINGLE, MODE_LOOP], labels: ['START/STOP', 'SINGLE PULSE', 'LOOP'], angles: [-140, 180, 140], def: MODE_LOOP, smooth: false },
  { id: 'btn', type: 'button', x: 41, y: 140, r: 12, def: 0, smooth: false },
  { id: 'extint', type: 'switch', x: 60, y: 280, def: 1, labels: ['INT', 'EXT'], smooth: false },
  { id: 'tempo', type: 'knob', label: 'TEMPO', cap: 'dark', r: 28, x: 41, y: 345, def: 5, fmt: 'tempo', labelPos: [41, 300] },
);

const jacks = [
  { id: 'start_in', kind: 'banana', dir: 'in', x: 22, y: 179, label: '' },
  { id: 'stop_in', kind: 'banana', dir: 'in', x: 62, y: 179, label: '' },
  { id: 'all_1', kind: 'banana', dir: 'out', x: 22, y: 212, label: '' },
  { id: 'all_2', kind: 'banana', dir: 'out', x: 62, y: 212, label: '' },
  { id: 'alt_1', kind: 'banana', dir: 'out', x: 22, y: 245, label: '' },
  { id: 'alt_2', kind: 'banana', dir: 'out', x: 62, y: 245, label: '' },
  { id: 'ext_in', kind: 'banana', dir: 'in', x: 20, y: 280, label: '' },
];
for (let s = 0; s < STEP_COUNT; s++) {
  jacks.push({ id: `pulse_${s + 1}`, kind: 'banana', dir: 'out', x: PULSE_JACK_X[s], y: PULSE_JACK_Y, label: '' });
}
const VOUT_ROWS = [
  { id: 'va', label: 'A', y: 148 },
  { id: 'vb', label: 'B', y: 182 },
  { id: 'vc', label: 'C', y: 216 },
  { id: 'vd', label: 'D', y: 250 },
  { id: 'vabcd', chain: ['A', 'B', 'C', 'D'], y: 284 },
  { id: 'vab', chain: ['A', 'B'], y: 318 },
  { id: 'vcd', chain: ['C', 'D'], y: 352 },
];
for (const r of VOUT_ROWS) {
  jacks.push({ id: `${r.id}_1`, kind: 'banana', dir: 'out', x: VOUT_X[0], y: r.y, label: '' });
  jacks.push({ id: `${r.id}_2`, kind: 'banana', dir: 'out', x: VOUT_X[1], y: r.y, label: '' });
}

const decor = [
  { type: 'tag', text: 'SEQUENTIAL VOLTAGE SOURCE', x: 290, y: 4, w: 152, h: 11 },
  { type: 'text', text: 'SOUNDFREAK', x: 366, y: 393, size: 4.5, anchor: 'middle' },
  { type: 'leds', id: 'leds', xs: COL_X, y: LED_Y, r: 8 },
  // mode selector labels
  { type: 'text', text: 'START', x: 14, y: 96, size: 4.5, anchor: 'middle' },
  { type: 'text', text: 'STOP', x: 14, y: 102, size: 4.5, anchor: 'middle' },
  { type: 'text', text: 'SINGLE', x: 41, y: 106, size: 4.5, anchor: 'middle' },
  { type: 'text', text: 'PULSE', x: 41, y: 112, size: 4.5, anchor: 'middle' },
  { type: 'text', text: 'LOOP', x: 67, y: 96, size: 4.5, anchor: 'middle' },
  // left column
  { type: 'text', text: 'START IN', x: 22, y: 167, size: 4.2, anchor: 'middle' },
  { type: 'text', text: 'STOP IN', x: 62, y: 167, size: 4.2, anchor: 'middle' },
  { type: 'text', text: 'ALL PULSES OUT', x: 42, y: 200, size: 4.2, anchor: 'middle' },
  { type: 'text', text: 'ALTERNATE OUT', x: 42, y: 233, size: 4.2, anchor: 'middle' },
  { type: 'text', text: 'EXT', x: 22, y: 264, size: 4.2, anchor: 'middle' },
  { type: 'text', text: 'INT', x: 62, y: 264, size: 4.2, anchor: 'middle' },
  // STEPS
  { type: 'text', text: 'STEPS', x: 688, y: 22, size: 5.2, anchor: 'middle' },
  // row letters
  // x = 78 keeps the letter clear of the first knob's "2" tick label (knob x 123, r 24)
  { type: 'text', text: 'A', x: 78, y: 99, size: 5.2, anchor: 'middle' },
  { type: 'text', text: 'B', x: 78, y: 176, size: 5.2, anchor: 'middle' },
  { type: 'text', text: 'C', x: 78, y: 250, size: 5.2, anchor: 'middle' },
  { type: 'text', text: 'D', x: 78, y: 322, size: 5.2, anchor: 'middle' },
  // voltage outputs
  { type: 'text', text: 'VOLTAGE', x: VOUT_LABEL_X, y: 119, size: 5, anchor: 'middle' },
  { type: 'text', text: 'OUTPUTS', x: VOUT_LABEL_X, y: 126, size: 5, anchor: 'middle' },
];
for (const r of VOUT_ROWS) {
  if (r.chain) decor.push({ type: 'chain', letters: r.chain, x: VOUT_LABEL_X, y: r.y - 10, size: 4.5 });
  else decor.push({ type: 'text', text: r.label, x: VOUT_LABEL_X, y: r.y - 10, size: 5, anchor: 'middle' });
}
for (let s = 0; s < STEP_COUNT; s++) {
  decor.push({ type: 'text', text: String(s + 1), x: PULSE_JACK_X[s] - 12, y: PULSE_JACK_Y + 2, size: 5, anchor: 'middle' });
  if (s % 2 === 0) decor.push({ type: 'text', text: 'PULSE OUT', x: (PULSE_JACK_X[s] + PULSE_JACK_X[s + 1]) / 2, y: PULSE_JACK_Y - 12, size: 4.2, anchor: 'middle' });
}

export default {
  type: 'sequencer',
  title: 'SEQUENTIAL VOLTAGE SOURCE',
  brand: true,
  width: 732,
  height: 400,
  controls,
  jacks,
  decor,
};
