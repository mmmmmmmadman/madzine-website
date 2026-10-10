// AudioWorkletProcessor running the whole patch.
// Messages from the UI:
//   { type: 'graph', modules: [{ id, type, params: {id: value} }], cables: [{ from: {m, j}, to: {m, j} }] }
//   { type: 'param', module, id, value }
// Messages to the UI:
//   { type: 'meter', module, l, r }   peak levels of OUTPUT modules (0..1)
//   { type: 'state', module, state }  whatever a DSP's takeState() returned
//                                     (sequencer: {step, active}; envelope: {ledOn})

import { MODULE_DEFS } from '../modules/index.js';
import { DSP } from './dsp/index.js';

const BLOCK = 128;
const SMOOTH_SECONDS = 0.005;
const METER_INTERVAL_BLOCKS = 6;

class SoundfreakEngine extends AudioWorkletProcessor {
  constructor() {
    super();
    this.modules = new Map();   // id -> instance
    this.order = [];            // instances in evaluation order
    this.cables = [];
    this.smoothCoef = 1 - Math.exp(-1 / (SMOOTH_SECONDS * sampleRate));
    this.blockCount = 0;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(m) {
    if (!m) return;
    if (m.type === 'graph') {
      this.buildGraph(m);
    } else if (m.type === 'param') {
      const inst = this.modules.get(m.module);
      if (inst && inst.params[m.id]) inst.params[m.id].target = m.value;
    }
  }

  createInstance(id, def) {
    const params = {};
    for (const c of def.controls) {
      params[c.id] = { target: c.def, cur: c.def, buf: new Float32Array(BLOCK), smooth: c.smooth !== false };
    }
    const inputs = {}, outputs = {};
    for (const j of def.jacks) {
      (j.dir === 'in' ? inputs : outputs)[j.id] = new Float32Array(BLOCK);
    }
    const bufs = {};
    for (const k in params) bufs[k] = params[k].buf;
    return { id, type: def.type, def, params, paramBufs: bufs, inputs, outputs, dsp: new DSP[def.type](sampleRate), inCables: [] };
  }

  buildGraph({ modules, cables }) {
    const next = new Map();
    for (const spec of modules || []) {
      const def = MODULE_DEFS[spec.type];
      if (!def) continue;
      let inst = this.modules.get(spec.id);
      const fresh = !inst || inst.type !== spec.type;
      if (fresh) inst = this.createInstance(spec.id, def);
      for (const k in (spec.params || {})) {
        const p = inst.params[k];
        if (!p) continue;
        p.target = spec.params[k];
        if (fresh) p.cur = p.target;
      }
      inst.inCables = [];
      next.set(spec.id, inst);
    }
    this.modules = next;

    this.cables = [];
    for (const c of cables || []) {
      const from = next.get(c.from.m), to = next.get(c.to.m);
      if (!from || !to) continue;
      if (!from.outputs[c.from.j] || !to.inputs[c.to.j]) continue;
      const cable = { src: from.outputs[c.from.j], dst: c.to.j, fromId: from.id, toId: to.id };
      this.cables.push(cable);
      to.inCables.push(cable);
    }
    this.order = this.topoSort();
  }

  topoSort() {
    const ids = [...this.modules.keys()];
    const indeg = new Map(ids.map(id => [id, 0]));
    const adj = new Map(ids.map(id => [id, []]));
    for (const c of this.cables) {
      if (c.fromId === c.toId) continue;
      adj.get(c.fromId).push(c.toId);
      indeg.set(c.toId, indeg.get(c.toId) + 1);
    }
    const queue = ids.filter(id => indeg.get(id) === 0);
    const out = [];
    const seen = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      for (const t of adj.get(id)) {
        indeg.set(t, indeg.get(t) - 1);
        if (indeg.get(t) === 0) queue.push(t);
      }
    }
    // Cycles: remaining modules are appended in insertion order. Their inputs
    // from not-yet-processed sources use the previous block (one-block delay).
    for (const id of ids) if (!seen.has(id)) out.push(id);
    return out.map(id => this.modules.get(id));
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const n = out && out[0] ? Math.min(out[0].length, BLOCK) : BLOCK;
    const coef = this.smoothCoef;
    const order = this.order;

    for (let oi = 0; oi < order.length; oi++) {
      const inst = order[oi];
      // parameters -> smoothed per-sample buffers
      for (const k in inst.params) {
        const p = inst.params[k];
        const b = p.buf;
        if (p.smooth) {
          let cur = p.cur;
          const t = p.target;
          for (let i = 0; i < n; i++) {
            cur += (t - cur) * coef;
            b[i] = cur;
          }
          p.cur = cur;
        } else {
          b.fill(p.target, 0, n);
          p.cur = p.target;
        }
      }
      // inputs: sum of all cables arriving at each input jack
      for (const k in inst.inputs) inst.inputs[k].fill(0, 0, n);
      const ic = inst.inCables;
      for (let ci = 0; ci < ic.length; ci++) {
        const dst = inst.inputs[ic[ci].dst];
        const src = ic[ci].src;
        for (let i = 0; i < n; i++) dst[i] += src[i];
      }
      inst.dsp.process(inst.inputs, inst.outputs, inst.paramBufs, n);
    }

    // speakers: sum of all OUTPUT modules
    if (out && out.length) {
      const L = out[0], R = out.length > 1 ? out[1] : null;
      L.fill(0);
      if (R) R.fill(0);
      for (let oi = 0; oi < order.length; oi++) {
        const inst = order[oi];
        if (inst.type !== 'output') continue;
        const dl = inst.dsp.l, dr = inst.dsp.r;
        for (let i = 0; i < n; i++) L[i] += dl[i];
        if (R) for (let i = 0; i < n; i++) R[i] += dr[i];
      }
    }

    this.blockCount++;
    if (this.blockCount % METER_INTERVAL_BLOCKS === 0) {
      for (let oi = 0; oi < order.length; oi++) {
        const inst = order[oi];
        if (inst.type === 'output') {
          const p = inst.dsp.takePeaks();
          this.port.postMessage({ type: 'meter', module: inst.id, l: p.l, r: p.r });
        }
        // generic UI state (LEDs etc.): any DSP with takeState() returning
        // a plain object (or null when nothing changed)
        if (typeof inst.dsp.takeState === 'function') {
          const st = inst.dsp.takeState();
          if (st) this.port.postMessage({ type: 'state', module: inst.id, state: st });
        }
      }
    }
    return true;
  }
}

registerProcessor('soundfreak-engine', SoundfreakEngine);
