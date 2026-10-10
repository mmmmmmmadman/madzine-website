// Dual Ring Modulator DSP. Pure logic, no DOM. All provisional constants are
// listed in TUNING_NOTES.md.
//
// Per section:
//   in1 = (banana + Tini-Jax) * lvl1/10          volts
//   in2 = (banana + Tini-Jax) * lvl2/10          volts
//   p   = in1 * in2 / 5                          volts (+-5 V in -> +-5 V out)
//   out = sat(p * outLvl/10)                     light diode-style tanh saturation
//
// Asymmetry (optional, constant switch): Hoffmann-Burchardi, DAFx-09,
// "Asymmetries make the difference", Eq. 20:
//   o = (y + a1 x) tanh(x + a2 y) + a3 x + a4 y,   0 < a1..a4 << 1, paper uses 0.01
// x = Input 1 (carrier), y = Input 2 (modulator), both normalised to +-1.
// We keep the cross-feed (a1, a2) and the leak (a3, a4) terms; the carrier
// tanh of the paper is folded into the output saturation stage below.

const ASYM_ENABLED = true;
const A1 = 0.01;   // fraction of carrier added to the modulator input
const A2 = 0.01;   // fraction of modulator added to the carrier input
const A3 = 0.01;   // carrier leak to the output
const A4 = 0.01;   // modulator leak to the output
const SAT_V = 8;   // out = SAT_V * tanh(p / SAT_V): 5 V in -> 4.44 V out (light)
const CLAMP_V = 5;

class Section {
  // b1, tj1, b2, tj2: input Float32Arrays; lvl1, lvl2, outLvl: param buffers
  // out: Float32Array (volts)
  process(n, b1, tj1, b2, tj2, lvl1, lvl2, outLvl, out) {
    for (let i = 0; i < n; i++) {
      const in1 = (b1[i] + tj1[i]) * (lvl1[i] / 10);
      const in2 = (b2[i] + tj2[i]) * (lvl2[i] / 10);
      let x = in1 / 5, y = in2 / 5;
      let v;
      if (ASYM_ENABLED) {
        const xc = x + A2 * y;
        const ym = y + A1 * x;
        v = xc * ym + A3 * x + A4 * y;
      } else {
        v = x * y;
      }
      // v is normalised (+-1); back to volts: in1*in2/5
      let p = v * 5 * (outLvl[i] / 10);
      p = SAT_V * Math.tanh(p / SAT_V);
      if (p > CLAMP_V) p = CLAMP_V; else if (p < -CLAMP_V) p = -CLAMP_V;
      out[i] = p;
    }
  }
}

export class DualRingModDSP {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.sec = [new Section(), new Section()];
  }

  process(inputs, outputs, params, n) {
    for (let k = 1; k <= 2; k++) {
      const p = `s${k}`;
      const out1 = outputs[`${p}_out1`];
      this.sec[k - 1].process(
        n,
        inputs[`${p}_in1b`], inputs[`${p}_in1tj`], inputs[`${p}_in2b`], inputs[`${p}_in2tj`],
        params[`${p}_lvl1`], params[`${p}_lvl2`], params[`${p}_out`],
        out1,
      );
      // both output jacks carry the same signal (mult)
      outputs[`${p}_out2`].set(out1);
    }
  }
}
