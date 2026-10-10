// Registry of module definitions. Imported by both the UI and the worklet.
import tripleVco from './triple-vco.js';
import dualFilter from './dual-filter.js';
import envelopeShaper from './envelope-shaper.js';
import dualRingMod from './dual-ring-mod.js';
import sequencer from './sequencer.js';
import filterbank from './filterbank.js';
import output from './output.js';
import keyboard from './keyboard.js';

export const MODULE_DEFS = {
  [tripleVco.type]: tripleVco,
  [dualFilter.type]: dualFilter,
  [envelopeShaper.type]: envelopeShaper,
  [dualRingMod.type]: dualRingMod,
  [sequencer.type]: sequencer,
  [filterbank.type]: filterbank,
  [output.type]: output,
  [keyboard.type]: keyboard,
};

// Order shown in the "add module" menu. { separator: true } draws a divider.
export const MODULE_MENU = [
  { type: 'triple-vco', label: 'Triple VCO' },
  { type: 'dual-filter', label: 'Dual Filter/Oscillator' },
  { type: 'envelope-shaper', label: 'Envelope Shaper' },
  { type: 'dual-ring-mod', label: 'Dual Ring Modulator' },
  { type: 'sequencer', label: 'Sequential Voltage Source' },
  { type: 'filterbank', label: 'VCF Filterbank' },
  { separator: true },
  { type: 'output', label: 'OUTPUT' },
  { type: 'keyboard', label: 'KEYBOARD / CV' },
];

export function findControl(def, id) {
  return def.controls.find(c => c.id === id);
}

export function findJack(def, id) {
  return def.jacks.find(j => j.id === id);
}

export function defaultParams(def) {
  const p = {};
  for (const c of def.controls) p[c.id] = c.def;
  return p;
}
