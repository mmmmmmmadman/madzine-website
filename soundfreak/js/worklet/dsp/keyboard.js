// KEYBOARD/CV DSP: the cv and gate parameters become the two outputs.

export class KeyboardDSP {
  constructor(sampleRate) {}

  process(inputs, outputs, params, n) {
    const cv = params.cv, gate = params.gate;
    const oc = outputs.cv_out, og = outputs.gate_out;
    for (let i = 0; i < n; i++) {
      oc[i] = cv[i];
      og[i] = gate[i];
    }
  }
}
