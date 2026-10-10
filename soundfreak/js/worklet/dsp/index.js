import { TripleVCO } from './triple-vco.js';
import { DualFilterDSP } from './dual-filter.js';
import { EnvelopeShaperDSP } from './envelope-shaper.js';
import { DualRingModDSP } from './dual-ring-mod.js';
import { SequencerDSP } from './sequencer.js';
import { FilterbankDSP } from './filterbank.js';
import { OutputDSP } from './output.js';
import { KeyboardDSP } from './keyboard.js';

export const DSP = {
  'triple-vco': TripleVCO,
  'dual-filter': DualFilterDSP,
  'envelope-shaper': EnvelopeShaperDSP,
  'dual-ring-mod': DualRingModDSP,
  'sequencer': SequencerDSP,
  'filterbank': FilterbankDSP,
  'output': OutputDSP,
  'keyboard': KeyboardDSP,
};
