// Envelope Shaper + Noise Generator DSP. Pure logic, no DOM. All provisional
// constants are listed in TUNING_NOTES.md.
//
// Trapezoid: four linear stages, 0..10 V.
//   Attack  0 -> 10 V over tA
//   On      10 V for tOn
//   Decay   10 -> 0 V over tD
//   Off     0 V for tOff (knob 0..5 = loop, knob >= 5 = infinite = envelope)
// "Attack longer than On": the decay start time measured from the attack start
// is tA + tOn - OVERLAP * max(0, tA - tOn). With OVERLAP = 0.5 and On = 0 the
// decay starts at tA/2 (5 V peak), which gives the manual's triangle LFO.
// "Off depends on Decay" is modelled the same way: the retrigger time measured
// from the decay start is tD + tOff - OVERLAP * max(0, tD - tOff).

const ATTACK_DECAY_MIN = 0.002;      // s at knob 0
const ATTACK_DECAY_RANGE = 500;      // knob 10 = 0.002 * 500 = 1 s
const ON_SECONDS_PER_UNIT = 0.5;     // On knob 0..10 = 0..5 s
const OFF_SECONDS_PER_UNIT = 1.0;    // Off knob 0..5 = 0..5 s
const OFF_INFINITE_KNOB = 5;         // Off knob >= 5 = infinite (envelope mode)
const TIME_SWITCH_MULT = 10;         // 10x switch
const OVERLAP = 0.5;
const TRIGGER_THRESHOLD = 2.5;       // V, rising edge
const VCA_SMOOTH_SECONDS = 0.002;    // Signal CV = one-pole lowpass of trapezoid
const NOISE_LP_MIN_HZ = 20, NOISE_LP_RANGE = 1000;   // colour 0..5: 20 Hz .. 20 kHz
const NOISE_HP_MIN_HZ = 20, NOISE_HP_RANGE = 500;    // colour 5..10: 20 Hz .. 10 kHz
const MAX_FC_FRACTION = 0.45;

export const STAGE_OFF = 0, STAGE_ATTACK = 1, STAGE_ON = 2, STAGE_DECAY = 3;

function attackDecayTime(k) {
  if (k < 0) k = 0; else if (k > 10) k = 10;
  return ATTACK_DECAY_MIN * Math.pow(ATTACK_DECAY_RANGE, k / 10);
}

export class EnvelopeShaperDSP {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.dt = 1 / sampleRate;
    this.stage = STAGE_OFF;
    this.level = 0;        // trapezoid, V
    this.tStage = 0;       // seconds since the current stage started
    this.remaining = 0;    // On / Off stage: seconds left when the stage was entered
    this.prevTrig = 0;
    this.vca = 0;          // smoothed control, V
    this.vcaCoef = 1 - Math.exp(-1 / (VCA_SMOOTH_SECONDS * sampleRate));
    this.lpState = 0;
    this.hpState = 0;
    this.hpPrevIn = 0;
    this.ledOn = false;
    this.ledReported = null;   // last ledOn value handed to the UI
  }

  // For the panel LED. Returns null when nothing changed since the last call;
  // the engine calls this periodically and posts { type: 'state', ... }.
  takeState() {
    if (this.ledOn === this.ledReported) return null;
    this.ledReported = this.ledOn;
    return { ledOn: this.ledOn };
  }

  process(inputs, outputs, params, n) {
    const dt = this.dt;
    const in1 = inputs.in1, in2 = inputs.in2, in3 = inputs.in3, in4 = inputs.in4;
    const trig = inputs.attack_in, decayCv = inputs.decay_cv, colourCv = inputs.colour_cv;
    const pA = params.attack, pD = params.decay, pOn = params.on, pOff = params.off;
    const pTime = params.time, pTrapLvl = params.trap_lvl, pSigLvl = params.sig_lvl;
    const pColour = params.colour, pNoiseLvl = params.noise_lvl;
    const outSig = outputs.sig_tj, outTrap = outputs.trap_out, outSigCv = outputs.sig_cv, outNoise = outputs.noise_out;

    let stage = this.stage, level = this.level, tStage = this.tStage, remaining = this.remaining;
    let prevTrig = this.prevTrig, vca = this.vca;
    const vcaCoef = this.vcaCoef;
    let lp = this.lpState, hp = this.hpState, hpPrevIn = this.hpPrevIn;
    const maxFc = MAX_FC_FRACTION * this.sr;

    for (let i = 0; i < n; i++) {
      // ---- times ----
      const mult = pTime[i] > 0.5 ? 1 : TIME_SWITCH_MULT;
      const tA = attackDecayTime(pA[i]) * mult;
      const tD = attackDecayTime(pD[i] + decayCv[i]) * mult;
      let kOn = pOn[i]; if (kOn < 0) kOn = 0; else if (kOn > 10) kOn = 10;
      const tOn = kOn * ON_SECONDS_PER_UNIT * mult;
      const kOff = pOff[i];
      const looping = kOff < OFF_INFINITE_KNOB;
      const tOff = (kOff < 0 ? 0 : kOff) * OFF_SECONDS_PER_UNIT * mult;

      // ---- trigger (rising edge) ----
      const tr = trig[i];
      if (tr > TRIGGER_THRESHOLD && prevTrig <= TRIGGER_THRESHOLD) {
        stage = STAGE_ATTACK;
        tStage = 0;
      }
      prevTrig = tr;

      // ---- stage machine ----
      if (stage === STAGE_ATTACK) {
        level += 10 * dt / tA;
        tStage += dt;
        const dStart = tA + tOn - OVERLAP * Math.max(0, tA - tOn);
        if (tStage >= dStart) {
          if (level > 10) level = 10;
          stage = STAGE_DECAY;
          tStage = 0;
        } else if (level >= 10) {
          level = 10;
          stage = STAGE_ON;
          remaining = dStart - tStage;
          tStage = 0;
        }
      } else if (stage === STAGE_ON) {
        level = 10;
        tStage += dt;
        if (tStage >= remaining) {
          stage = STAGE_DECAY;
          tStage = 0;
        }
      } else if (stage === STAGE_DECAY) {
        level -= 10 * dt / tD;
        tStage += dt;
        const rStart = tD + tOff - OVERLAP * Math.max(0, tD - tOff);
        if (looping && tStage >= rStart) {
          if (level < 0) level = 0;
          stage = STAGE_ATTACK;
          tStage = 0;
        } else if (level <= 0) {
          level = 0;
          stage = STAGE_OFF;
          remaining = rStart - tStage;
          tStage = 0;
        }
      } else {
        level = 0;
        if (looping) {
          tStage += dt;
          if (tStage >= remaining) {
            stage = STAGE_ATTACK;
            tStage = 0;
          }
        }
      }

      // ---- VCA control (slightly smoother than the trapezoid) ----
      vca += (level - vca) * vcaCoef;

      // ---- outputs ----
      const sum = in1[i] + in2[i] + in3[i] + in4[i];
      outSig[i] = sum * (vca / 10) * (pSigLvl[i] / 10);
      outTrap[i] = level * (pTrapLvl[i] / 10);
      outSigCv[i] = vca;

      // ---- noise ----
      let c = pColour[i] + colourCv[i];
      if (c < 0) c = 0; else if (c > 10) c = 10;
      const white = (Math.random() * 2 - 1) * 5;
      let y;
      if (c < 5) {
        let fc = NOISE_LP_MIN_HZ * Math.pow(NOISE_LP_RANGE, c / 5);
        if (fc > maxFc) fc = maxFc;
        const a = 1 - Math.exp(-2 * Math.PI * fc * dt);
        lp += (white - lp) * a;
        y = lp;
      } else {
        let fc = NOISE_HP_MIN_HZ * Math.pow(NOISE_HP_RANGE, (c - 5) / 5);
        if (fc > maxFc) fc = maxFc;
        const a = Math.exp(-2 * Math.PI * fc * dt);
        hp = a * (hp + white - hpPrevIn);
        hpPrevIn = white;
        y = hp;
      }
      outNoise[i] = y * (pNoiseLvl[i] / 10);
    }

    this.stage = stage;
    this.level = level;
    this.tStage = tStage;
    this.remaining = remaining;
    this.prevTrig = prevTrig;
    this.vca = vca;
    this.lpState = lp;
    this.hpState = hp;
    this.hpPrevIn = hpPrevIn;
    this.ledOn = stage === STAGE_ON;
  }
}
