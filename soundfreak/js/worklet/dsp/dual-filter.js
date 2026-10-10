// Dual Filter/Oscillator DSP. Pure logic, no DOM. All provisional constants are
// listed in TUNING_NOTES.md (section "Dual Filter/Oscillator").
//
// Each section is a VCS3-style diode ladder lowpass: a chain of N coupled RC
// nodes (N = 3 for 18 dB, 4 for 24 dB) with global feedback through a tanh.
// The chain is solved per sample with trapezoidal (ZDF/TPT) integrators: the
// node voltages satisfy (I - g*M) V = s + g*e1*u, a tridiagonal linear system
// that is solved exactly (Thomas algorithm). The feedback nonlinearity uses the
// linear solution as a prediction of the output, then clips the feedback sum
// with tanh ("nonlinear prediction"), so the chain only ever sees a bounded
// input and can never blow up.
//
// Continuous-time model with node cutoff w (all nodes equal):
//   dV1/dt = w * ((u - V1) + (V2 - V1))
//   dVi/dt = w * ((V(i-1) - Vi) + (V(i+1) - Vi))
//   dVN/dt = w * (V(N-1) - VN)
//   u = tanh(x - k * VN)

// Frequency knob -> self-oscillation Hz, measured 2026-10-10 (analyzer filter-cutoff-law, Filter a,
// Response 10, 24 dB), one point per whole knob value, log-linear between points. The dial is not a
// plain exponential: flat at about 10.6 Hz below knob 1, about 3.2x per unit from 4 to 8, then it
// compresses towards the top (the knob-10 value sits near the interface's 24 kHz limit).
const FREQ_TABLE_HZ = [10.62, 10.76, 12.88, 20.67, 49.36, 240.96, 804.55, 2583.7, 7958.9, 20125.7, 22867.8];
const FREQ_TABLE_LOG = FREQ_TABLE_HZ.map((h) => Math.log10(h));
export function cutoffHzForKnob(k) {
  if (!(k > 0)) return FREQ_TABLE_HZ[0];
  if (k >= 10) return FREQ_TABLE_HZ[10];
  const i = Math.floor(k), fr = k - i;
  return Math.pow(10, FREQ_TABLE_LOG[i] + (FREQ_TABLE_LOG[i + 1] - FREQ_TABLE_LOG[i]) * fr);
}
export function knobForCutoffHz(hz) {
  const l = Math.log10(hz);
  if (l <= FREQ_TABLE_LOG[0]) return 0;
  for (let i = 0; i < 10; i++) if (l <= FREQ_TABLE_LOG[i + 1]) return i + (l - FREQ_TABLE_LOG[i]) / (FREQ_TABLE_LOG[i + 1] - FREQ_TABLE_LOG[i]);
  return 10;
}
const VOLT_PER_OCT = 1.2;        // Frequency CV at amount 10
const FM_OCT_PER_VOLT = 0.4;     // F.M. at amount 10: +-5 V -> +-2 octaves (same as Triple VCO)
const SLEW_SECONDS = 0.02;       // Slew switch: one-pole on the cutoff modulation sum
// Response knob -> loop gain as a fraction of the oscillation threshold. Measured 2026-10-10
// (filter-response + fine free captures + filter-slope, Frequency 5, noise in, spectrum divided by the
// noise source spectrum): no resonance hump up to 4.75 (at most 2 dB), but the -3 dB point climbs from
// about 64 Hz at 0 to 223 Hz at 4.75; self-oscillation from 5 on, output level constant from 6. The gains
// below 5 were chosen so the sim reproduces the measured -3 dB points.
const RESP_KNOBS = [0, 1, 2, 3, 4, 4.25, 4.5, 4.75, 5, 6, 10];
const RESP_GAIN  = [0.04, 0.07, 0.09, 0.13, 0.15, 0.19, 0.21, 0.33, 1.0, 1.3, 1.3];
function respGain(r) {
  if (r <= 0) return RESP_GAIN[0];
  for (let i = 1; i < RESP_KNOBS.length; i++) if (r <= RESP_KNOBS[i]) {
    const t = (r - RESP_KNOBS[i - 1]) / (RESP_KNOBS[i] - RESP_KNOBS[i - 1]);
    return RESP_GAIN[i - 1] + (RESP_GAIN[i] - RESP_GAIN[i - 1]) * t;
  }
  return RESP_GAIN[RESP_GAIN.length - 1];
}
const INPUT_SOFT_CLIP_V = 8;     // summed input soft-clipped: 8 * tanh(x / 8)
const SAT_PER_KOSC = 3.4;         // feedback tanh normalisation = SAT_PER_KOSC * kOsc volts
// Asymmetric feedback limit: sat*(1+a) for positive sums, sat*(1-a) for negative, a = FB_ASYM * min(1, k/kOsc).
// Fitted 2026-10-10 to the self-oscillation captures (even harmonics dominate: h2 -25 dB at knob 5). Scaled by the
// loop gain so that at low Response the limiter stays symmetric (an asymmetric limiter makes a DC term that the
// lowpass passes unattenuated, which spoiled the slope measurements at Response 0).
const FB_ASYM = 0.5;
const RES_MAKEUP = 0.6;          // output gain = 1 + RES_MAKEUP * k / kOsc
const OUT_CLAMP_V = 5;
const MAX_F_RATIO = 0.45;        // cutoff clamped to 0.45 * sample rate
const MIN_F_HZ = 1;
const NOISE_FLOOR_V = 2e-5;      // white noise added to the input sum, about -108 dB re 5 V peak

// Per pole count: rho = self-oscillation frequency / node cutoff, kOsc = loop gain
// at which the linear chain starts to oscillate. Computed from the model above
// (scratch script, see TUNING_NOTES). rho(3) = sqrt(6).
const POLES = {
  3: { rho: 2.449490, kOsc: 29.0 },
  4: { rho: 1.195229, kOsc: 18.387755 },
};

class Section {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.s = new Float64Array(4);      // integrator states
    this.vs = new Float64Array(4);     // A^-1 s
    this.vu = new Float64Array(4);     // A^-1 (g e1)
    this.c = new Float64Array(4);      // Thomas scratch
    this.slewState = 0;
    this.noise = 0x9e3779b9;
    this.slewCoef = 1 - Math.exp(-1 / (SLEW_SECONDS * sampleRate));
  }

  // inputs:  in1, in2, fcvin, fmin, rcvin
  // params:  freq, fcv, fm, resp, rcv, slew, db
  // out:     Float32Array (volts, clamped +-5 V)
  process(n, in1, in2, fcvin, fmin, rcvin, freq, fcv, fm, resp, rcv, slew, db, out) {
    const sr = this.sr;
    const s = this.s, vs = this.vs, vu = this.vu, c = this.c;
    const slewCoef = this.slewCoef;
    let slewState = this.slewState;
    let noise = this.noise;
    const maxF = MAX_F_RATIO * sr;

    for (let i = 0; i < n; i++) {
      const N = db[i] > 0.5 ? 4 : 3;
      const pole = POLES[N];
      const rho = pole.rho, kOsc = pole.kOsc;

      // ---- cutoff ----
      let mod = fcvin[i] * (fcv[i] / 10) / VOLT_PER_OCT + fmin[i] * (fm[i] / 10) * FM_OCT_PER_VOLT;
      if (slew[i] > 0.5) {
        slewState += (mod - slewState) * slewCoef;
        mod = slewState;
      } else {
        slewState = mod;
      }
      let f = cutoffHzForKnob(freq[i]) * Math.pow(2, mod);
      if (!(f >= MIN_F_HZ)) f = MIN_F_HZ;      // also catches NaN
      else if (f > maxF) f = maxF;
      const g = Math.tan(Math.PI * f / sr) / rho;

      // ---- response ----
      let r = resp[i] + rcvin[i] * (rcv[i] / 10);
      if (!(r >= 0)) r = 0; else if (r > 10) r = 10;
      const k = kOsc * respGain(r);

      // ---- input ----
      let x = in1[i] + in2[i];
      x = INPUT_SOFT_CLIP_V * Math.tanh(x / INPUT_SOFT_CLIP_V);
      // noise floor so self-oscillation can start from silence (all-zero
      // state is an exact fixed point of the model, unlike real hardware)
      noise = (noise * 1664525 + 1013904223) >>> 0;
      x += (noise / 4294967296 - 0.5) * NOISE_FLOOR_V;

      // ---- solve (I - gM) V = s + g e1 u for two right-hand sides ----
      // A: diag = 1 + 2g (nodes 1..N-1), 1 + g (node N); off-diagonal = -g.
      const dMid = 1 + 2 * g, dLast = 1 + g, off = -g;
      // forward sweep
      let denom = dMid;
      c[0] = off / denom;
      vs[0] = s[0] / denom;
      vu[0] = g / denom;
      for (let j = 1; j < N; j++) {
        const dj = j === N - 1 ? dLast : dMid;
        denom = dj - off * c[j - 1];
        c[j] = off / denom;
        vs[j] = (s[j] - off * vs[j - 1]) / denom;
        vu[j] = (0 - off * vu[j - 1]) / denom;
      }
      // back substitution
      for (let j = N - 2; j >= 0; j--) {
        vs[j] -= c[j] * vs[j + 1];
        vu[j] -= c[j] * vu[j + 1];
      }
      const p = vs[N - 1], q = vu[N - 1];

      // ---- feedback with nonlinear prediction ----
      const yEst = (p + q * x) / (1 + k * q);
      const sat = SAT_PER_KOSC * kOsc;
      const v = x - k * yEst;
      const a = FB_ASYM * (k < kOsc ? k / kOsc : 1);
      const sv = v >= 0 ? sat * (1 + a) : sat * (1 - a);
      const u = sv * Math.tanh(v / sv);

      // ---- commit ----
      let y = 0;
      for (let j = 0; j < N; j++) {
        const v = vs[j] + vu[j] * u;
        s[j] = 2 * v - s[j];
        y = v;
      }
      y *= 1 + RES_MAKEUP * k / kOsc;
      if (y > OUT_CLAMP_V) y = OUT_CLAMP_V; else if (y < -OUT_CLAMP_V) y = -OUT_CLAMP_V;
      out[i] = y;
    }
    this.slewState = slewState;
    this.noise = noise;
  }
}

export class DualFilterDSP {
  constructor(sampleRate) {
    this.sec = [new Section(sampleRate), new Section(sampleRate)];
  }

  process(inputs, outputs, params, n) {
    for (let k = 0; k < 2; k++) {
      const p = k === 0 ? 'a' : 'b';
      const out1 = outputs[`${p}_out1`];
      this.sec[k].process(
        n,
        inputs[`${p}_in1`], inputs[`${p}_in2`], inputs[`${p}_fcvin`], inputs[`${p}_fmin`], inputs[`${p}_rcvin`],
        params[`${p}_freq`], params[`${p}_fcv`], params[`${p}_fm`], params[`${p}_resp`], params[`${p}_rcv`],
        params[`${p}_slew`], params[`${p}_db`],
        out1,
      );
      // the two outputs are a mult
      outputs[`${p}_out2`].set(out1);
    }
  }
}
