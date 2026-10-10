// VCF Filterbank DSP (Buchla 195 + 107 style). Pure logic, no DOM. All
// provisional constants are listed in TUNING_NOTES.md.
//
// Ten parallel fixed bandpass filters (TPT state-variable, 2nd order, unity
// peak gain). Each band: level = clamp((knob + cv) / 10, 0, 1), individual
// Tini-Jax output = band * level. Mix = sum of all band outputs *
// clamp((master knob + master cv) / 10, 0, 1). All outputs clamped to +-5 V.

import { BANDS } from '../../modules/filterbank.js';

const BAND_Q = Math.SQRT2;       // adjacent octave bands meet at -3 dB (1 octave wide)
const MAX_FC_RATIO = 0.45;       // centre frequency clamped to 0.45 * sample rate
const CLIP_V = 5;

class Band {
  constructor(sampleRate, hz) {
    let fc = hz;
    if (fc > MAX_FC_RATIO * sampleRate) fc = MAX_FC_RATIO * sampleRate;
    const g = Math.tan(Math.PI * fc / sampleRate);
    const k = 1 / BAND_Q;
    this.k = k;
    this.a1 = 1 / (1 + g * (g + k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
    this.ic1eq = 0;
    this.ic2eq = 0;
  }

  // Returns the unity-peak bandpass output for one input sample.
  tick(v0) {
    const v3 = v0 - this.ic2eq;
    const v1 = this.a1 * this.ic1eq + this.a2 * v3;
    const v2 = this.ic2eq + this.a2 * this.ic1eq + this.a3 * v3;
    this.ic1eq = 2 * v1 - this.ic1eq;
    this.ic2eq = 2 * v2 - this.ic2eq;
    return this.k * v1;
  }
}

function clip(v) {
  if (v > CLIP_V) return CLIP_V;
  if (v < -CLIP_V) return -CLIP_V;
  return v;
}

export class FilterbankDSP {
  constructor(sampleRate) {
    this.bands = BANDS.map(b => new Band(sampleRate, b.hz));
  }

  process(inputs, outputs, params, n) {
    const in1 = inputs.in1, in2 = inputs.in2;
    const masterKnob = params.master, masterCv = inputs.master_cv;
    const out1 = outputs.out1;
    const nb = this.bands.length;

    out1.fill(0, 0, n);
    for (let b = 0; b < nb; b++) {
      const band = this.bands[b];
      const knob = params[`b${b}`];
      const cv = inputs[`b${b}_cv`];
      const out = outputs[`b${b}_out`];
      for (let i = 0; i < n; i++) {
        let lvl = (knob[i] + cv[i]) / 10;
        if (lvl < 0) lvl = 0; else if (lvl > 1) lvl = 1;
        const y = clip(band.tick(in1[i] + in2[i]) * lvl);
        out[i] = y;
        out1[i] += y;
      }
    }
    for (let i = 0; i < n; i++) {
      let m = (masterKnob[i] + masterCv[i]) / 10;
      if (m < 0) m = 0; else if (m > 1) m = 1;
      out1[i] = clip(out1[i] * m);
    }
    // the two OUTPUT jacks carry the same signal
    outputs.out2.set(out1);
  }
}
