// Sequential Voltage Source DSP. Pure logic, no DOM. All provisional constants
// are listed in TUNING_NOTES.md.
//
// One position counter `pos` runs over a 4 x STEPS cycle. The current step is
// pos % STEPS (rows A-D output it simultaneously); the chained outputs pick
// the row from floor(pos / STEPS): A-B-C-D uses all four rows in turn,
// A-B and C-D alternate between two rows.

const PULSE_HIGH = 10;              // volts
const TRIGGER_THRESHOLD = 2.5;      // rising edge above this = pulse (ARCHITECTURE.md)
const TEMPO_MIN_HZ = 0.1;
const TEMPO_MAX_HZ = 30;
const TEMPO_CV_OCT_PER_VOLT = 1;    // INT mode: EXT input 1 V = tempo x2
const DEFAULT_INTERVAL_S = 0.1;     // ALL PULSES length reference before any step interval is measured
const ALL_PULSE_DUTY = 0.5;         // ALL PULSES high for this fraction of the step interval

const MODE_STARTSTOP = 0;
const MODE_SINGLE = 1;
const MODE_LOOP = 2;

const ROWS = ['a', 'b', 'c', 'd'];
const TEMPO_RATIO = TEMPO_MAX_HZ / TEMPO_MIN_HZ;

export function tempoHz(knob, cvVolts) {
  return TEMPO_MIN_HZ * Math.pow(TEMPO_RATIO, knob / 10) * Math.pow(2, cvVolts * TEMPO_CV_OCT_PER_VOLT);
}

export class SequencerDSP {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.pos = 0;              // 0 .. 4*steps-1
    this.running = false;      // START/STOP mode state
    this.phase = 0;            // internal clock phase 0..1
    this.prevExt = 0;
    this.prevStart = 0;
    this.prevStop = 0;
    this.prevBtn = 0;
    this.alt = 0;              // ALTERNATE flip-flop
    this.allRemain = 0;        // samples left of the current ALL PULSES high
    this.sinceAdvance = 0;     // samples since the last advance
    this.lastInterval = DEFAULT_INTERVAL_S * sampleRate;
    // state for the UI (LEDs)
    this.step = 0;
    this.active = false;
    this.stateDirty = true;
    // per-block scratch
    this.rowBufs = [null, null, null, null];
    this.pulseOuts = new Array(8);
  }

  process(inputs, outputs, params, n) {
    const sr = this.sr;
    const extIn = inputs.ext_in, startIn = inputs.start_in, stopIn = inputs.stop_in;
    const pSteps = params.steps, pMode = params.mode, pTempo = params.tempo, pExtInt = params.extint, pBtn = params.btn;
    const outAll1 = outputs.all_1, outAll2 = outputs.all_2, outAlt1 = outputs.alt_1, outAlt2 = outputs.alt_2;
    const pulseOuts = this.pulseOuts;
    for (let s = 0; s < 8; s++) pulseOuts[s] = outputs[`pulse_${s + 1}`];
    const va1 = outputs.va_1, vb1 = outputs.vb_1, vc1 = outputs.vc_1, vd1 = outputs.vd_1;
    const vabcd1 = outputs.vabcd_1, vab1 = outputs.vab_1, vcd1 = outputs.vcd_1;

    let pos = this.pos, running = this.running, phase = this.phase;
    let prevExt = this.prevExt, prevStart = this.prevStart, prevStop = this.prevStop, prevBtn = this.prevBtn;
    let alt = this.alt, allRemain = this.allRemain, sinceAdvance = this.sinceAdvance, lastInterval = this.lastInterval;
    let step = this.step, active = this.active;
    const step0 = step, active0 = active;

    for (let i = 0; i < n; i++) {
      let steps = Math.round(pSteps[i]);
      if (steps < 2) steps = 2; else if (steps > 8) steps = 8;
      const cycle = 4 * steps;
      if (pos >= cycle) pos %= cycle;
      const mode = Math.round(pMode[i]);
      const internal = pExtInt[i] > 0.5;
      const ext = extIn[i];

      let advance = false;

      // manual step button (rising edge)
      const b = pBtn[i];
      if (b > 0.5 && prevBtn <= 0.5) advance = true;
      prevBtn = b;

      // START IN / STOP IN (rising edges), only meaningful in START/STOP mode
      const st = startIn[i], sp = stopIn[i];
      if (st > TRIGGER_THRESHOLD && prevStart <= TRIGGER_THRESHOLD) running = true;
      if (sp > TRIGGER_THRESHOLD && prevStop <= TRIGGER_THRESHOLD) running = false;
      prevStart = st;
      prevStop = sp;

      active = mode === MODE_LOOP || (mode === MODE_STARTSTOP && running);

      let periodSamples = 0;
      if (active && mode !== MODE_SINGLE) {
        if (internal) {
          const f = tempoHz(pTempo[i], ext);
          periodSamples = sr / f;
          phase += f / sr;
          if (phase >= 1) { phase -= 1; advance = true; }
        } else if (ext > TRIGGER_THRESHOLD && prevExt <= TRIGGER_THRESHOLD) {
          advance = true;
        }
      } else {
        phase = 0;
      }
      prevExt = ext;

      if (advance) {
        pos = (pos + 1) % cycle;
        lastInterval = sinceAdvance;
        sinceAdvance = 0;
        allRemain = Math.max(1, Math.floor((periodSamples > 0 ? periodSamples : lastInterval) * ALL_PULSE_DUTY));
        alt ^= 1;
      }
      sinceAdvance++;

      step = pos % steps;
      const seg = (pos - step) / steps;   // 0..3

      // pulses
      const all = allRemain > 0 ? PULSE_HIGH : 0;
      if (allRemain > 0) allRemain--;
      outAll1[i] = all;
      outAll2[i] = all;
      const altV = alt ? PULSE_HIGH : 0;
      outAlt1[i] = altV;
      outAlt2[i] = altV;
      for (let s = 0; s < 8; s++) pulseOuts[s][i] = s === step ? PULSE_HIGH : 0;

      // voltages
      const k = step + 1;
      const a = params[`a${k}`][i], bb = params[`b${k}`][i], c = params[`c${k}`][i], d = params[`d${k}`][i];
      va1[i] = a; vb1[i] = bb; vc1[i] = c; vd1[i] = d;
      vabcd1[i] = seg === 0 ? a : seg === 1 ? bb : seg === 2 ? c : d;
      vab1[i] = (seg & 1) ? bb : a;
      vcd1[i] = (seg & 1) ? d : c;
    }

    // second jack of each output pair is a mult
    outputs.va_2.set(va1); outputs.vb_2.set(vb1); outputs.vc_2.set(vc1); outputs.vd_2.set(vd1);
    outputs.vabcd_2.set(vabcd1); outputs.vab_2.set(vab1); outputs.vcd_2.set(vcd1);

    this.pos = pos; this.running = running; this.phase = phase;
    this.prevExt = prevExt; this.prevStart = prevStart; this.prevStop = prevStop; this.prevBtn = prevBtn;
    this.alt = alt; this.allRemain = allRemain; this.sinceAdvance = sinceAdvance; this.lastInterval = lastInterval;
    this.step = step; this.active = active;
    if (step !== step0 || active !== active0) this.stateDirty = true;
  }

  // For the UI LEDs. Returns null when nothing changed since the last call.
  // The engine should call this periodically (same cadence as the meters) and
  // post { type: 'state', module, step, active } when it is not null.
  takeState() {
    if (!this.stateDirty) return null;
    this.stateDirty = false;
    return { step: this.step, active: this.active };
  }
}
