// KEYBOARD/CV utility module. Pure data.
// cv and gate are "hidden" controls: they are driven by the on-screen keys,
// the computer keyboard and Web MIDI, and are transported to the worklet like
// any other parameter (gate is not smoothed).

export const KEY_BASE_MIDI = 48; // C3 = 0 V
export const KEY_COUNT = 25;     // two octaves + top C
export const VOLT_PER_OCT = 1.2;
export const GATE_HIGH = 10;

export default {
  type: 'keyboard',
  title: 'KEYBOARD / CV',
  brand: false,
  width: 340,
  height: 400,
  controls: [
    { id: 'cv', type: 'hidden', def: 0, smooth: true },
    { id: 'gate', type: 'hidden', def: 0, smooth: false },
  ],
  jacks: [
    { id: 'cv_out', kind: 'banana', dir: 'out', x: 120, y: 340, label: '1.2V/OCT' },
    { id: 'gate_out', kind: 'banana', dir: 'out', x: 220, y: 340, label: 'GATE' },
  ],
  decor: [
    { type: 'tag', text: 'KEYBOARD / CV', x: 120, y: 6, w: 100, h: 11 },
    { type: 'keys', id: 'keys', x: 20, y: 40, w: 300, h: 200 },
    { type: 'text', text: 'KEYS: A W S E D F T G Y H U J K O L P ;   OCTAVE: Z / X', x: 170, y: 262, size: 4.5, anchor: 'middle' },
    { type: 'text', text: 'MIDI', x: 170, y: 280, size: 4.5, anchor: 'middle', id: 'midi_status' },
  ],
};
