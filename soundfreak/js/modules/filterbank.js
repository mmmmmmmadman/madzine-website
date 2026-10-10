// VCF Filterbank panel definition (Buchla 195 + 107 style). Pure data: shared
// by the UI (SVG panel) and the AudioWorklet. No DOM access allowed here.
//
// Panel coordinates are in "panel units": height 400 = full 4U panel height.
// Proportions measured from reference/images/filterbank.png (panel aspect
// 1.21:1, drawn at 488 x 400 like the Triple VCO). No manual exists for this
// module; labels are copied from the panel print (the second band reads "52").

// Band labels as printed, and the centre frequencies used by the DSP.
export const BANDS = [
  { label: '31', hz: 31 },
  { label: '52', hz: 52 },
  { label: '125', hz: 125 },
  { label: '250', hz: 250 },
  { label: '500', hz: 500 },
  { label: '1K', hz: 1000 },
  { label: '2K', hz: 2000 },
  { label: '4K', hz: 4000 },
  { label: '8K', hz: 8000 },
  { label: '16K', hz: 16000 },
];

// Top jack row
const JACK_ROW_Y = 43;
const JACK_LABEL_Y = 25;
const BAND_JACK_X = [91, 125, 159, 193, 227, 260, 293, 327, 361, 394];

// Knobs: odd bands (52, 250, 1K, 4K, 16K) on the upper row, even bands
// (31, 125, 500, 2K, 8K) plus MASTER OUTPUT on the lower row, as on the panel.
const KNOB_R = 27;
const UPPER_Y = 128, UPPER_LABEL_Y = 173;
const LOWER_Y = 267, LOWER_LABEL_Y = 312;
const BAND_KNOB_X = [39, 80, 121, 161, 203, 243, 284, 324, 367, 407];
const MASTER_X = 448;

// Bottom banana row (level CV per band, then MASTER OUTPUT CV)
const CV_Y = 363;

const controls = [];
const jacks = [];
const decor = [];

// ---- top row: INPUT, band outputs, OUTPUT ----
decor.push({ type: 'tag', text: 'VOLTAGE CONTROLLED FIXED FILTERBANK', x: 168, y: 3, w: 150, h: 10 });
decor.push({ type: 'hline', y: 16 });
decor.push({ type: 'hline', y: 59 });
decor.push({ type: 'path', d: `M75,16 L75,59` });
decor.push({ type: 'path', d: `M410,16 L410,59` });

decor.push({ type: 'text', text: 'INPUT', x: 39, y: JACK_LABEL_Y, size: 5.2, anchor: 'middle' });
decor.push({ type: 'path', d: `M23,${JACK_ROW_Y} L55,${JACK_ROW_Y}` });
jacks.push({ id: 'in1', kind: 'tj', dir: 'in', x: 23, y: JACK_ROW_Y, label: '' });
jacks.push({ id: 'in2', kind: 'tj', dir: 'in', x: 55, y: JACK_ROW_Y, label: '' });

BANDS.forEach((b, i) => {
  decor.push({ type: 'text', text: b.label, x: BAND_JACK_X[i], y: JACK_LABEL_Y, size: 5.2, anchor: 'middle' });
  jacks.push({ id: `b${i}_out`, kind: 'tj', dir: 'out', x: BAND_JACK_X[i], y: JACK_ROW_Y, label: '' });
});

decor.push({ type: 'text', text: 'OUTPUT', x: 450, y: JACK_LABEL_Y, size: 5.2, anchor: 'middle' });
decor.push({ type: 'path', d: `M434,${JACK_ROW_Y} L466,${JACK_ROW_Y}` });
jacks.push({ id: 'out1', kind: 'tj', dir: 'out', x: 434, y: JACK_ROW_Y, label: '' });
jacks.push({ id: 'out2', kind: 'tj', dir: 'out', x: 466, y: JACK_ROW_Y, label: '' });

// ---- band level knobs, CV bananas, connecting lines ----
BANDS.forEach((b, i) => {
  const upper = i % 2 === 1;
  const x = BAND_KNOB_X[i];
  const y = upper ? UPPER_Y : LOWER_Y;
  const ly = upper ? UPPER_LABEL_Y : LOWER_LABEL_Y;
  controls.push({ id: `b${i}`, type: 'knob', label: b.label, cap: 'dark', r: KNOB_R, x, y, def: 10, labelPos: [x, ly] });
  decor.push({ type: 'path', d: `M${x},${ly + 4} L${x},${CV_Y - 9}` });
  jacks.push({ id: `b${i}_cv`, kind: 'banana', dir: 'in', x, y: CV_Y, label: '' });
});

// ---- master output ----
controls.push({ id: 'master', type: 'knob', label: 'MASTER OUTPUT', cap: 'dark', r: KNOB_R, x: MASTER_X, y: LOWER_Y, def: 10, labelPos: [MASTER_X, LOWER_LABEL_Y] });
decor.push({ type: 'path', d: `M${MASTER_X},${LOWER_LABEL_Y + 4} L${MASTER_X},${CV_Y - 9}` });
jacks.push({ id: 'master_cv', kind: 'banana', dir: 'in', x: MASTER_X, y: CV_Y, label: '' });

// ---- footer ----
decor.push({ type: 'hline', y: 383 });
decor.push({ type: 'text', text: 'SOUNDFREAK', x: 244, y: 393, size: 5.2, anchor: 'middle' });

export default {
  type: 'filterbank',
  title: 'VCF FILTERBANK',
  brand: true,
  width: 488,
  height: 400,
  controls,
  jacks,
  decor,
};
