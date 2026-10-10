// OUTPUT module DSP: scales +-5 V audio to +-1 speaker range and tracks peaks.

export class OutputDSP {
  constructor(sampleRate) {
    this.l = new Float32Array(128);
    this.r = new Float32Array(128);
    this.peakL = 0;
    this.peakR = 0;
  }

  process(inputs, outputs, params, n) {
    const L = inputs.in_l, R = inputs.in_r, lv = params.level;
    let pl = this.peakL, pr = this.peakR;
    for (let i = 0; i < n; i++) {
      let g = lv[i] / 10;
      g = g * g;
      let l = (L[i] / 5) * g;
      let r = (R[i] / 5) * g;
      if (l > 1) l = 1; else if (l < -1) l = -1;
      if (r > 1) r = 1; else if (r < -1) r = -1;
      this.l[i] = l;
      this.r[i] = r;
      const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
      if (al > pl) pl = al;
      if (ar > pr) pr = ar;
    }
    this.peakL = pl;
    this.peakR = pr;
  }

  takePeaks() {
    const p = { l: this.peakL, r: this.peakR };
    this.peakL = 0;
    this.peakR = 0;
    return p;
  }
}
