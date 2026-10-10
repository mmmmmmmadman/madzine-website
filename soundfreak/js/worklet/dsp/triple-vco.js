// Triple VCO DSP. Pure logic, no DOM. All provisional constants are listed in
// TUNING_NOTES.md.

import { SHAPE_KNOBS, TABLE_LEN, SINE_TABLES, TRI2_TABLES, TRI3_TABLES } from './shape-tables.js';

const FM_OCT_PER_VOLT = 0.355; // at F.M. knob = 10 (measured 2026-10-10, vco-fm-depth + free captures)
const FM_HP_HZ = 2.0;          // F.M. input is AC coupled: one-pole high-pass, corner fitted to the LFO-rate sweep
// Pulse width measured 2026-10-10 (vco-shape, vco-shape-cv-pulse): 45 % at Shape 5,
// narrowing about 15.5 % per knob unit (and per volt of Shape CV), fully collapsed
// to a flat voltage at about 8 and above, fully high at about 2 and below.
const PW_AT_5 = 0.45;
const PW_PER_UNIT = 0.155;
// Shape CV: 1 V = 1 knob unit; negative voltages do nothing (measured).
// Sync, measured 2026-10-10 (three vco-sync runs, Osc 2 triangle as slave).
// The core is modelled as a triangle integrator between two comparator thresholds.
// The Sync input is added to the comparator, so it shifts both thresholds by
// SYNC_GAIN * (knob/10) * volts. A step of the input therefore ends the current
// half-cycle early or late depending on the slope, which gives a phase kick without
// any discontinuity in the triangle (peaks just change height). This locks the slave
// only near a whole multiple of the source (lock at 2x within about 7 % at knob 7.5
// and 10, pulled but not locked at 5), gives a smooth period wobble with a saw source,
// a two-value period alternation with a pulse source, and no lock when 14 % away.
// There is no phase reset at any knob setting. The pulse width of the source matters:
// at 2:1 a 50 % pulse cancels its own kicks (user observation, source Shape 7 used).
// SYNC_GAIN: threshold shift (triangle swing = 2) per volt at knob 10.
const SYNC_GAIN = 0.040;
const MAX_PHASE_INC = 0.45;

// Level knob law measured on the hardware (2026-10-10, Osc 1 saw, ES-8 input):
// gain relative to Level 10, in dB, at knob 0..10. The knob never goes silent:
// at 0..2 the oscillator still bleeds through about 24 dB down.
const LEVEL_DB = [-24.0, -24.0, -24.0, -17.9, -10.9, -6.6, -3.7, -1.9, -0.4, -0.1, 0.0];
const LEVEL_GAIN = LEVEL_DB.map((d) => Math.pow(10, d / 20));

// Linear interpolation of the gain table between whole knob positions.
function levelGain(level) {
  if (level <= 0) return LEVEL_GAIN[0];
  if (level >= 10) return LEVEL_GAIN[10];
  const i = Math.floor(level);
  const f = level - i;
  return LEVEL_GAIN[i] + (LEVEL_GAIN[i + 1] - LEVEL_GAIN[i]) * f;
}

// polyBLEP correction for a discontinuity of size 2 at phase 0.
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

// Read the measured cycle for Shape k (0..10) at table phase tp (0..1): linear
// interpolation inside the table and between the two nearest measured Shape positions.
function tableLookup(tables, k, tp) {
  const x = tp * TABLE_LEN;
  let i0 = Math.floor(x);
  const fr = x - i0;
  if (i0 >= TABLE_LEN) i0 = TABLE_LEN - 1;
  const i1 = i0 + 1 < TABLE_LEN ? i0 + 1 : 0;
  const pos = k / 2.5;                       // SHAPE_KNOBS are 2.5 apart
  let a = Math.floor(pos);
  if (a >= SHAPE_KNOBS.length - 1) a = SHAPE_KNOBS.length - 2;
  const fk = pos - a;
  const ta = tables[a], tb = tables[a + 1];
  const va = ta[i0] + (ta[i1] - ta[i0]) * fr;
  const vb = tb[i0] + (tb[i1] - tb[i0]) * fr;
  return va + (vb - va) * fk;
}

class Osc {
  constructor(sampleRate, index) {
    this.sr = sampleRate;
    this.index = index;
    this.v = -1;      // triangle core voltage, swing -1..1 with no sync
    this.up = true;   // core direction
    this.fmX = 0;     // F.M. input high-pass state (last input, last output)
    this.fmY = 0;
    this.fmA = Math.exp(-2 * Math.PI * FM_HP_HZ / sampleRate);
  }

  // inputs: cv, syncin, fmin, shapecv (Float32Array)
  // params: freq, sync, fm, shape, lvl1, lvl2, lfo (Float32Array, lfo may be null)
  // out1/out2: Float32Array to write wave 1 / wave 2 (volts, +-5 V max)
  process(n, cv, syncin, fmin, shapecv, freq, sync, fm, shape, lvl1, lvl2, lfo, out1, out2) {
    const sr = this.sr;
    const isOne = this.index === 1;
    let v = this.v;
    let up = this.up;
    let fmX = this.fmX, fmY = this.fmY;
    const fmA = this.fmA;

    for (let i = 0; i < n; i++) {
      // ---- frequency ----
      const base = (lfo && lfo[i] > 0.5) ? 0.01 : 1;
      let octaves = cv[i] / 1.2;                       // 1.2 V/oct
      fmY = fmA * (fmY + fmin[i] - fmX); fmX = fmin[i];   // AC-coupled F.M. input
      octaves += fmY * (fm[i] / 10) * FM_OCT_PER_VOLT;     // exponential FM
      let f = base * Math.pow(10, 0.4 * freq[i]) * Math.pow(2, octaves);
      let dt = f / sr;
      if (dt > MAX_PHASE_INC) dt = MAX_PHASE_INC;
      if (dt < 0) dt = 0;

      // ---- shape ----
      const scv = shapecv[i] > 0 ? shapecv[i] : 0;
      let k = shape[i] + scv;
      if (k < 0) k = 0; else if (k > 10) k = 10;
      // The core itself stays symmetric; the measured Shape waveforms are applied as tables.
      const m = 0.5;

      // ---- sync: comparator thresholds shifted by the sync input ----
      const off = SYNC_GAIN * (sync[i] / 10) * syncin[i];
      const hi = 1 + off;
      const lo = -1 + off;

      // ---- core: triangle integrator with exact (reflected) turning points ----
      const upStep = 2 * dt / m;
      const downStep = 2 * dt / (1 - m);
      if (up) v += upStep; else v -= downStep;
      for (let guard = 0; guard < 4; guard++) {
        if (up && v >= hi) { v = hi - (v - hi) * (downStep / upStep); up = false; }
        else if (!up && v <= lo) { v = lo + (lo - v) * (upStep / downStep); up = true; }
        else break;
      }

      // phase from the core voltage against the unshifted window (0 = bottom turn, m = top turn);
      // it stays continuous when the thresholds move, overshoot just flattens the peak
      let phase = up ? m * (v + 1) / 2 : m + (1 - m) * (1 - v) / 2;
      if (phase < 0) phase = 0; else if (phase >= 1) phase = 0.999999;

      // Table phase: the measured cycles start at the rising zero crossing of the
      // triangle, which is a quarter cycle after the bottom turn of the core.
      let tp = phase + 0.75;
      if (tp >= 1) tp -= 1;

      let w1, w2;
      if (isOne) {
        // sine: measured cycle, interpolated between the five Shape positions
        w1 = tableLookup(SINE_TABLES, k, tp);
        // sawtooth (rising), polyBLEP
        w2 = 2 * phase - 1 - blep(phase, dt);
      } else {
        // pulse: measured width law, goes high at the triangle's rising zero crossing
        let pw = PW_AT_5 - PW_PER_UNIT * (k - 5);
        if (pw < 0) pw = 0; else if (pw > 1) pw = 1;
        let pulse;
        if (pw <= 0) pulse = -1;
        else if (pw >= 1) pulse = 1;
        else {
          pulse = tp < pw ? 1 : -1;
          pulse += blep(tp, dt);
          let t2 = tp - pw;
          if (t2 < 0) t2 += 1;
          pulse -= blep(t2, dt);
        }
        w1 = pulse;
        // triangle: measured cycle per oscillator, interpolated between Shape positions
        w2 = tableLookup(this.index === 2 ? TRI2_TABLES : TRI3_TABLES, k, tp);
      }

      out1[i] = w1 * 5 * levelGain(lvl1[i]);
      out2[i] = w2 * 5 * levelGain(lvl2[i]);
    }
    this.v = v;
    this.up = up;
    this.fmX = fmX; this.fmY = fmY;
  }
}

export class TripleVCO {
  constructor(sampleRate) {
    this.osc = [new Osc(sampleRate, 1), new Osc(sampleRate, 2), new Osc(sampleRate, 3)];
  }

  process(inputs, outputs, params, n) {
    for (let k = 1; k <= 3; k++) {
      const p = `o${k}`;
      const o = this.osc[k - 1];
      const out1 = outputs[`${p}_w1b`];
      const out2 = outputs[`${p}_w2b`];
      o.process(
        n,
        inputs[`${p}_cv`], inputs[`${p}_syncin`], inputs[`${p}_fmin`], inputs[`${p}_shapecv`],
        params[`${p}_freq`], params[`${p}_sync`], params[`${p}_fm`], params[`${p}_shape`],
        params[`${p}_lvl1`], params[`${p}_lvl2`], k === 3 ? params.o3_lfo : null,
        out1, out2,
      );
      // banana and Tini-Jax outputs carry the same signal
      outputs[`${p}_w1tj`].set(out1);
      outputs[`${p}_w2tj`].set(out2);
    }
  }
}
