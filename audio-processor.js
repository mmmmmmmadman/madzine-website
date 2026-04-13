class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetSampleRate = 16000;
    // sampleRate is a global in AudioWorkletGlobalScope
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length === 0 || input[0].length === 0) return true;

    const float32 = input[0]; // mono channel
    const ratio = sampleRate / this.targetSampleRate;

    // Resample using linear interpolation
    const outputLength = Math.floor(float32.length / ratio);
    const int16 = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = Math.min(srcFloor + 1, float32.length - 1);
      const frac = srcIndex - srcFloor;

      // Linear interpolation
      const sample = float32[srcFloor] * (1 - frac) + float32[srcCeil] * frac;

      // Clamp and convert to Int16
      const s = Math.max(-1, Math.min(1, sample));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    if (int16.length > 0) {
      this.port.postMessage(int16);
    }

    return true;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
