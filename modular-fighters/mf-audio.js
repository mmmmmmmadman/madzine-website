/* Modular Fighters - audio engine (window.MFAudio)
 * Pure browser Web Audio, no build step, no modules.
 * Contract: SPEC.md in this folder.
 *
 * Notes on intentional choices (see SPEC deviations in the hand-off report):
 * - Edge inputs (sync, mode_trig, gate, trig, clock) are detected by polling an
 *   AnalyserNode every 25 ms with hysteresis (rise > 0.5, fall < 0.25). Every
 *   sample since the previous poll is scanned, so pulses shorter than the poll
 *   interval are still caught; at most one rise and one fall are acted on per poll.
 * - OscillatorNode has no hard sync; VCO sync is a phase reset done by replacing
 *   the oscillators on a detected rising edge (poll rate, not audio rate).
 * - Web Audio mutes cycles that contain no DelayNode. A cable that would close a
 *   cycle is kept only if some path of that cycle enters a DELAY module through
 *   its "in" port; that cable then gets a one-render-quantum DelayNode plus a
 *   saturating WaveShaper so the loop is legal and bounded. Every other
 *   cycle-closing cable is dropped (both in play() and in score()).
 */
(function () {
  'use strict';

  var TYPES = {
    VCO:   { inputs: ['fm', 'sync', 'mode_trig'], outputs: ['saw', 'sqr', 'tri'] },
    MIX4:  { inputs: ['in1', 'in2', 'in3', 'in4'], outputs: ['out'] },
    LPF:   { inputs: ['in', 'cutoff_cv'], outputs: ['out'] },
    FOLD:  { inputs: ['in', 'fold_cv'], outputs: ['out'] },
    DELAY: { inputs: ['in', 'time_cv'], outputs: ['outL', 'outR'] },
    ADSR:  { inputs: ['gate'], outputs: ['env'] },
    AR:    { inputs: ['trig'], outputs: ['env'] },
    SEQ5:  { inputs: ['clock'], outputs: ['cv', 'gate'] },
    DRAW:  { inputs: [], outputs: ['cv'] }
  };
  var MOD_PORTS = { fm: 1, gate: 1, trig: 1, clock: 1, mode_trig: 1 };
  var VCO_RANGE = { vco: [20, 2000], lfo: [0.05, 20] };
  var TICK_MS = 25;          // scheduler / edge-poll interval
  var LOOKAHEAD = 0.15;      // seconds scheduled ahead for SEQ5 / DRAW
  var FADE = 0.05;           // slot replace fade (SPEC: 50 ms)
  var RISE_TH = 0.5, FALL_TH = 0.25;
  // Up to three graphs can sound at once (foe, the last sent "me", and the live
  // "preview" of the patch being built). Every slot uses the same gain so a
  // preview promoted to "me" keeps its level; 0.6 keeps three full-scale graphs
  // at 1.8 into the master compressor (two at 0.7 = 1.4 before the preview slot).
  var SLOT_NAMES = ['me', 'foe', 'preview'];
  var SLOT_GAIN = 0.6;
  var PREVIEW_DEBOUNCE_MS = 80;   // onChange fires on every cable / param edit

  var ctx = null, comp = null, hard = null, recDest = null;
  var slotGain = { me: null, foe: null, preview: null };
  var slots = { me: null, foe: null, preview: null };
  var previewTimer = 0, previewPending = null;
  var recorder = null, recChunks = [], recMime = '';
  var idSeq = 0;

  // ---------- small helpers ----------
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function rndLog(lo, hi) { return lo * Math.pow(hi / lo, Math.random()); }
  function isModPort(p) { return MOD_PORTS[p] === 1 || /_cv$/.test(p); }
  function round3(v) { return Math.round(v * 1000) / 1000; }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 6;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    hard = ctx.createGain();
    hard.gain.value = 0.5;
    comp.connect(hard);
    hard.connect(ctx.destination);
    if (ctx.createMediaStreamDestination) {
      recDest = ctx.createMediaStreamDestination();
      hard.connect(recDest);
    }
    SLOT_NAMES.forEach(function (s) {
      var g = ctx.createGain();
      g.gain.value = SLOT_GAIN;
      g.connect(comp);
      slotGain[s] = g;
    });
    return ctx;
  }

  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    return '';
  }

  function startRecorder() {
    if (!recDest || !window.MediaRecorder) return;
    if (recorder && recorder.state !== 'inactive') return;
    recChunks = [];
    recMime = pickMime();
    try {
      recorder = recMime ? new MediaRecorder(recDest.stream, { mimeType: recMime })
                         : new MediaRecorder(recDest.stream);
    } catch (e) {
      recorder = null;
      return;
    }
    if (!recMime) recMime = recorder.mimeType || 'audio/webm';
    recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
    recorder.start(1000);
  }

  // Hold the current value of an AudioParam at time t; returns the time from
  // which new automation should be scheduled.
  function hold(param, t) {
    var now = ctx.currentTime;
    if (param.cancelAndHoldAtTime) {
      param.cancelAndHoldAtTime(t);
      return t;
    }
    if (t <= now + 0.001) {
      var v = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(v, t);
      return t;
    }
    param.cancelScheduledValues(t + 0.001);
    return t + 0.001;
  }

  // ---------- patch sanitising + cycle policy (shared by play and score) ----------
  function sanitize(patch) {
    var mods = {}, list = [];
    var srcMods = (patch && patch.modules) || [];
    for (var i = 0; i < srcMods.length; i++) {
      var m = srcMods[i];
      if (!m || typeof m.id !== 'string' || m.id === 'OUT' || !TYPES[m.type] || mods[m.id]) continue;
      mods[m.id] = m;
      list.push(m);
    }
    var adj = {}, cables = [], seen = {};
    var srcCables = (patch && patch.cables) || [];
    for (var j = 0; j < srcCables.length; j++) {
      var c = srcCables[j];
      if (!c || !c.from || !c.to) continue;
      var fm = mods[c.from.mod];
      if (!fm || TYPES[fm.type].outputs.indexOf(c.from.port) < 0) continue;
      var toMod = c.to.mod, toPort = c.to.port;
      var key = c.from.mod + '.' + c.from.port + '>' + toMod + '.' + toPort;
      if (seen[key]) continue;
      var cab = { from: { mod: c.from.mod, port: c.from.port }, to: { mod: toMod, port: toPort }, loop: false };
      if (toMod === 'OUT') {
        if (toPort !== 'L' && toPort !== 'R') continue;
        seen[key] = 1;
        cables.push(cab);
        continue;
      }
      var tm = mods[toMod];
      if (!tm || TYPES[tm.type].inputs.indexOf(toPort) < 0) continue;
      var r = reachCheck(adj, mods, toMod, c.from.mod, tm.type === 'DELAY' && toPort === 'in');
      if (r.any) {
        if (!r.withDelay) continue;          // illegal cycle: drop cable
        cab.loop = true;                     // feedback through DELAY: allowed
      }
      seen[key] = 1;
      cables.push(cab);
      (adj[c.from.mod] = adj[c.from.mod] || []).push({ to: toMod, port: toPort });
    }
    return { mods: mods, list: list, cables: cables };
  }

  // Is there a path start -> target in adj? Is there one that enters a DELAY via "in"?
  function reachCheck(adj, mods, start, target, startFlag) {
    var res = { any: false, withDelay: false };
    var visited = {};
    var stack = [[start, startFlag]];
    while (stack.length) {
      var s = stack.pop(), node = s[0], flag = s[1];
      var vk = node + (flag ? '#1' : '#0');
      if (visited[vk]) continue;
      visited[vk] = 1;
      if (node === target) {
        res.any = true;
        if (flag) { res.withDelay = true; return res; }
      }
      var es = adj[node] || [];
      for (var i = 0; i < es.length; i++) {
        var e = es[i];
        var f2 = flag || (mods[e.to] && mods[e.to].type === 'DELAY' && e.port === 'in');
        stack.push([e.to, f2]);
      }
    }
    return res;
  }

  // ---------- score ----------
  function score(patch) {
    var s = sanitize(patch);
    var radj = {};
    s.cables.forEach(function (c) { (radj[c.to.mod] = radj[c.to.mod] || []).push(c.from.mod); });
    var reach = { OUT: true }, stack = ['OUT'], count = 0;
    while (stack.length) {
      var n = stack.pop();
      var fs = radj[n] || [];
      for (var i = 0; i < fs.length; i++) {
        if (!reach[fs[i]]) { reach[fs[i]] = true; count++; stack.push(fs[i]); }
      }
    }
    if (count === 0) return 0;
    var toOut = 0, modC = 0;
    s.cables.forEach(function (c) {
      if (c.to.mod === 'OUT') toOut++;
      else if (reach[c.to.mod] && isModPort(c.to.port)) modC++;
    });
    return Math.min(100, Math.round(count * 6 + toOut * 4 + modC * 8));
  }

  // ---------- graph ----------
  function Graph(slot) {
    this.slot = slot;
    this.nodes = [];
    this.sources = [];
    this.detectors = [];
    this.tickers = [];
    this.disposers = [];
    this.mods = {};
    this.patched = {};
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(slotGain[slot]);
    this.sink = ctx.createGain();       // keeps analysers pulled, inaudible
    this.sink.gain.value = 0;
    this.sink.connect(this.out);
    this.nodes.push(this.out, this.sink);
    this.timer = null;
    this.dead = false;
  }
  Graph.prototype.gain = function (v) {
    var g = ctx.createGain();
    g.gain.value = v;
    this.nodes.push(g);
    return g;
  };
  Graph.prototype.constant = function (v) {
    var c = ctx.createConstantSource();
    c.offset.value = v;
    c.start();
    this.nodes.push(c);
    this.sources.push(c);
    return c;
  };
  // Edge detector on an input GainNode (only created if that port is patched).
  Graph.prototype.detect = function (modId, port, inputNode, handlers) {
    if (!this.patched[modId + '.' + port]) return;
    var an = ctx.createAnalyser();
    an.fftSize = 4096;
    inputNode.connect(an);
    an.connect(this.sink);
    this.nodes.push(an);
    this.detectors.push({ an: an, buf: new Float32Array(an.fftSize), high: false,
                          last: ctx.currentTime, h: handlers });
  };
  Graph.prototype.tick = function () {
    if (this.dead) return;
    var now = ctx.currentTime, sr = ctx.sampleRate;
    for (var i = 0; i < this.detectors.length; i++) {
      var d = this.detectors[i];
      d.an.getFloatTimeDomainData(d.buf);
      var n = Math.round((now - d.last) * sr);
      d.last = now;
      n = clamp(n, 128, d.buf.length);
      var rose = false, fell = false, fellAfterRise = false;
      for (var k = d.buf.length - n; k < d.buf.length; k++) {
        var v = d.buf[k];
        if (!d.high && v > RISE_TH) { d.high = true; rose = true; }
        else if (d.high && v < FALL_TH) { d.high = false; fell = true; if (rose) fellAfterRise = true; }
      }
      if (fell && !fellAfterRise && d.h.fall) d.h.fall(now);
      if (rose && d.h.rise) d.h.rise(now);
      if (fellAfterRise && d.h.fall) d.h.fall(now);
    }
    for (var j = 0; j < this.tickers.length; j++) this.tickers[j](now);
  };
  // fadeIn: seconds; play() keeps 5 ms, preview() uses FADE so a rebuild
  // crossfades with the outgoing graph (which fades out over FADE in kill()).
  Graph.prototype.start = function (fadeIn) {
    var self = this, t = ctx.currentTime;
    this.out.gain.setValueAtTime(0, t);
    this.out.gain.linearRampToValueAtTime(1, t + (fadeIn || 0.005));
    this.tick();
    this.timer = setInterval(function () { self.tick(); }, TICK_MS);
  };
  Graph.prototype.kill = function () {
    if (this.dead) return;
    this.dead = true;
    if (this.timer) clearInterval(this.timer);
    var self = this, t = ctx.currentTime;
    var p = this.out.gain;
    hold(p, t);
    p.linearRampToValueAtTime(0, t + FADE);
    setTimeout(function () {
      self.disposers.forEach(function (fn) { try { fn(); } catch (e) {} });
      self.sources.forEach(function (s) { try { s.stop(); } catch (e) {} });
      self.nodes.forEach(function (nd) { try { nd.disconnect(); } catch (e) {} });
      self.nodes = []; self.sources = []; self.detectors = []; self.tickers = [];
    }, FADE * 1000 + 30);
  };

  // ---------- module builders ----------
  // Each returns { inputs:{port:AudioNode}, outputs:{port:AudioNode}, set(key,value) }
  var WAVE = { saw: 'sawtooth', sqr: 'square', tri: 'triangle' };

  function buildVCO(g, m) {
    var p = m.params || (m.params = {});
    var st = { mode: p.mode === 'lfo' ? 'lfo' : 'vco', fmAmt: clamp(num(p.fmAmt, 0), 0, 1) };
    st.freq = clamp(num(p.freq, st.mode === 'lfo' ? 1 : 220), VCO_RANGE[st.mode][0], VCO_RANGE[st.mode][1]);
    var fmIn = g.gain(1), fmScale = g.gain(st.fmAmt * st.freq);
    fmIn.connect(fmScale);
    var syncIn = g.gain(1), trigIn = g.gain(1);
    var offset = g.constant(st.mode === 'lfo' ? 0.5 : 0);
    var scales = {}, outs = {};
    Object.keys(WAVE).forEach(function (k) {
      scales[k] = g.gain(st.mode === 'lfo' ? 0.5 : 1);
      outs[k] = g.gain(1);
      scales[k].connect(outs[k]);
      offset.connect(outs[k]);
    });
    var oscs = null;
    function makeOscs(t) {
      var o = {};
      Object.keys(WAVE).forEach(function (k) {
        var osc = ctx.createOscillator();
        osc.type = WAVE[k];
        osc.frequency.value = st.freq;
        fmScale.connect(osc.frequency);
        osc.connect(scales[k]);
        osc.start(t);
        o[k] = osc;
      });
      return o;
    }
    function killOscs(o, t) {
      Object.keys(o).forEach(function (k) {
        var osc = o[k];
        osc.onended = function () {
          try { fmScale.disconnect(osc.frequency); } catch (e) {}
          try { osc.disconnect(); } catch (e) {}
        };
        try { osc.stop(t); } catch (e) {}
      });
    }
    oscs = makeOscs(ctx.currentTime);
    g.disposers.push(function () {
      Object.keys(oscs).forEach(function (k) {
        try { oscs[k].stop(); } catch (e) {}
        try { oscs[k].disconnect(); } catch (e) {}
      });
    });

    function applyFreq() {
      var t = ctx.currentTime;
      Object.keys(oscs).forEach(function (k) { oscs[k].frequency.setTargetAtTime(st.freq, t, 0.005); });
      fmScale.gain.setTargetAtTime(st.fmAmt * st.freq, t, 0.005);
      p.freq = round3(st.freq);
    }
    function applyMode() {
      var t = ctx.currentTime, lfo = st.mode === 'lfo';
      Object.keys(scales).forEach(function (k) { scales[k].gain.setTargetAtTime(lfo ? 0.5 : 1, t, 0.003); });
      offset.offset.setTargetAtTime(lfo ? 0.5 : 0, t, 0.003);
      p.mode = st.mode;
    }
    // Toggle keeps the knob's relative (log) position and maps it to the other range.
    function toggleMode(target) {
      var nm = target || (st.mode === 'vco' ? 'lfo' : 'vco');
      if (nm === st.mode) return;
      var a = VCO_RANGE[st.mode], b = VCO_RANGE[nm];
      var pos = Math.log(st.freq / a[0]) / Math.log(a[1] / a[0]);
      st.mode = nm;
      st.freq = b[0] * Math.pow(b[1] / b[0], clamp(pos, 0, 1));
      applyMode();
      applyFreq();
    }
    g.detect(m.id, 'mode_trig', trigIn, { rise: function () { toggleMode(); } });
    g.detect(m.id, 'sync', syncIn, {
      rise: function (t) {
        var old = oscs;
        oscs = makeOscs(t);
        killOscs(old, t);
      }
    });
    return {
      inputs: { fm: fmIn, sync: syncIn, mode_trig: trigIn },
      outputs: outs,
      set: function (key, v) {
        if (key === 'freq') {
          st.freq = clamp(num(v, st.freq), VCO_RANGE[st.mode][0], VCO_RANGE[st.mode][1]);
          applyFreq();
        } else if (key === 'mode') {
          toggleMode(v === 'lfo' ? 'lfo' : 'vco');
        } else if (key === 'fmAmt') {
          st.fmAmt = clamp(num(v, st.fmAmt), 0, 1);
          p.fmAmt = st.fmAmt;
          applyFreq();
        }
      }
    };
  }

  function buildMIX4(g, m) {
    var p = m.params || (m.params = {});
    var out = g.gain(1), ins = {};
    for (var i = 1; i <= 4; i++) {
      var k = 'in' + i;
      ins[k] = g.gain(clamp(num(p['lvl' + i], 0.8), 0, 1));
      ins[k].connect(out);
    }
    return {
      inputs: ins,
      outputs: { out: out },
      set: function (key, v) {
        var mm = /^lvl([1-4])$/.exec(key);
        if (!mm) return;
        var val = clamp(num(v, 0), 0, 1);
        p[key] = val;
        ins['in' + mm[1]].gain.setTargetAtTime(val, ctx.currentTime, 0.01);
      }
    };
  }

  function buildLPF(g, m) {
    var p = m.params || (m.params = {});
    var st = { cutoff: clamp(num(p.cutoff, 1000), 20, 20000), res: clamp(num(p.res, 0), 0, 1),
               cvAmt: clamp(num(p.cvAmt, 0.5), 0, 1) };
    var inp = g.gain(1), cvIn = g.gain(1), cvScale = g.gain(st.cvAmt * 5000);
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = st.cutoff;
    f.Q.value = st.res * 18;           // lowpass Q is resonance in dB
    g.nodes.push(f);
    inp.connect(f);
    cvIn.connect(cvScale);
    cvScale.connect(f.frequency);
    var out = g.gain(1);
    f.connect(out);
    return {
      inputs: { in: inp, cutoff_cv: cvIn },
      outputs: { out: out },
      set: function (key, v) {
        var t = ctx.currentTime;
        if (key === 'cutoff') { st.cutoff = clamp(num(v, st.cutoff), 20, 20000); p.cutoff = st.cutoff; f.frequency.setTargetAtTime(st.cutoff, t, 0.01); }
        else if (key === 'res') { st.res = clamp(num(v, st.res), 0, 1); p.res = st.res; f.Q.setTargetAtTime(st.res * 18, t, 0.01); }
        else if (key === 'cvAmt') { st.cvAmt = clamp(num(v, st.cvAmt), 0, 1); p.cvAmt = st.cvAmt; cvScale.gain.setTargetAtTime(st.cvAmt * 5000, t, 0.01); }
      }
    };
  }

  // Triangle fold: identity on [-1,1], folds back beyond. Curve covers +-FOLD_SPAN.
  var FOLD_SPAN = 16, foldCurve = null;
  function getFoldCurve() {
    if (foldCurve) return foldCurve;
    var N = 8193;
    foldCurve = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var x = (i / (N - 1) * 2 - 1) * FOLD_SPAN;
      var ph = (x + 1) / 4;
      ph = ph - Math.floor(ph);
      foldCurve[i] = 1 - 4 * Math.abs(ph - 0.5);
    }
    return foldCurve;
  }

  function buildFOLD(g, m) {
    var p = m.params || (m.params = {});
    var st = { fold: clamp(num(p.fold, 0.3), 0, 1), cvAmt: clamp(num(p.cvAmt, 0.5), 0, 1) };
    var inp = g.gain(1), pre = g.gain(1 + st.fold * 8);
    var cvIn = g.gain(1), cvScale = g.gain(st.cvAmt * 8);
    var down = g.gain(1 / FOLD_SPAN);
    var ws = ctx.createWaveShaper();
    ws.curve = getFoldCurve();
    ws.oversample = '4x';
    g.nodes.push(ws);
    inp.connect(pre);
    cvIn.connect(cvScale);
    cvScale.connect(pre.gain);
    pre.connect(down);
    down.connect(ws);
    var out = g.gain(1);
    ws.connect(out);
    return {
      inputs: { in: inp, fold_cv: cvIn },
      outputs: { out: out },
      set: function (key, v) {
        var t = ctx.currentTime;
        if (key === 'fold') { st.fold = clamp(num(v, st.fold), 0, 1); p.fold = st.fold; pre.gain.setTargetAtTime(1 + st.fold * 8, t, 0.01); }
        else if (key === 'cvAmt') { st.cvAmt = clamp(num(v, st.cvAmt), 0, 1); p.cvAmt = st.cvAmt; cvScale.gain.setTargetAtTime(st.cvAmt * 8, t, 0.01); }
      }
    };
  }

  function buildDELAY(g, m) {
    var p = m.params || (m.params = {});
    var st = { time: clamp(num(p.time, 0.3), 0.05, 1.5), fb: clamp(num(p.fb, 0.4), 0, 0.9),
               mix: clamp(num(p.mix, 0.5), 0, 1) };
    var inp = g.gain(1), cvIn = g.gain(1);
    var dL = ctx.createDelay(3), dR = ctx.createDelay(3);
    dL.delayTime.value = st.time;
    dR.delayTime.value = st.time * 0.75;
    g.nodes.push(dL, dR);
    var cvL = g.gain(0.5), cvR = g.gain(0.5 * 0.75);   // time_cv: 0.5 s per unit
    cvIn.connect(cvL); cvIn.connect(cvR);
    cvL.connect(dL.delayTime); cvR.connect(dR.delayTime);
    var fbL = g.gain(st.fb), fbR = g.gain(st.fb);
    inp.connect(dL); inp.connect(dR);
    dL.connect(fbL); fbL.connect(dL);
    dR.connect(fbR); fbR.connect(dR);
    var dry = g.gain(1 - st.mix), wetL = g.gain(st.mix), wetR = g.gain(st.mix);
    var outL = g.gain(1), outR = g.gain(1);
    inp.connect(dry);
    dry.connect(outL); dry.connect(outR);
    dL.connect(wetL); wetL.connect(outL);
    dR.connect(wetR); wetR.connect(outR);
    return {
      inputs: { in: inp, time_cv: cvIn },
      outputs: { outL: outL, outR: outR },
      set: function (key, v) {
        var t = ctx.currentTime;
        if (key === 'time') {
          st.time = clamp(num(v, st.time), 0.05, 1.5); p.time = st.time;
          dL.delayTime.setTargetAtTime(st.time, t, 0.05);
          dR.delayTime.setTargetAtTime(st.time * 0.75, t, 0.05);
        } else if (key === 'fb') {
          st.fb = clamp(num(v, st.fb), 0, 0.9); p.fb = st.fb;
          fbL.gain.setTargetAtTime(st.fb, t, 0.01); fbR.gain.setTargetAtTime(st.fb, t, 0.01);
        } else if (key === 'mix') {
          st.mix = clamp(num(v, st.mix), 0, 1); p.mix = st.mix;
          dry.gain.setTargetAtTime(1 - st.mix, t, 0.01);
          wetL.gain.setTargetAtTime(st.mix, t, 0.01); wetR.gain.setTargetAtTime(st.mix, t, 0.01);
        }
      }
    };
  }

  function buildADSR(g, m) {
    var p = m.params || (m.params = {});
    var st = { a: 0, d: 0, s: 0, r: 0, riseAt: -1 };
    function read() {
      st.a = clamp(num(p.a, 0.01), 0.001, 5);
      st.d = clamp(num(p.d, 0.2), 0.001, 5);
      st.s = clamp(num(p.s, 0.6), 0, 1);
      st.r = clamp(num(p.r, 0.3), 0.001, 10);
    }
    read();
    var env = g.constant(0), gateIn = g.gain(1);
    g.detect(m.id, 'gate', gateIn, {
      rise: function (t) {
        var o = env.offset, t0 = hold(o, t);
        o.linearRampToValueAtTime(1, t0 + st.a);
        o.setTargetAtTime(st.s, t0 + st.a, st.d / 4);
        st.riseAt = t0;
      },
      fall: function (t) {
        // A gate shorter than the attack still completes the attack.
        var tf = Math.max(t, st.riseAt + st.a);
        var o = env.offset, t0 = hold(o, tf);
        o.setTargetAtTime(0, t0, st.r / 4);
      }
    });
    return {
      inputs: { gate: gateIn },
      outputs: { env: env },
      set: function (key, v) { if (key === 'a' || key === 'd' || key === 's' || key === 'r') { p[key] = num(v, p[key]); read(); } }
    };
  }

  function buildAR(g, m) {
    var p = m.params || (m.params = {});
    var st = { a: 0, r: 0 };
    function read() {
      st.a = clamp(num(p.a, 0.005), 0.001, 5);
      st.r = clamp(num(p.r, 0.3), 0.001, 10);
    }
    read();
    var env = g.constant(0), trigIn = g.gain(1);
    g.detect(m.id, 'trig', trigIn, {
      rise: function (t) {
        var o = env.offset, t0 = hold(o, t);
        o.linearRampToValueAtTime(1, t0 + st.a);
        o.setTargetAtTime(0, t0 + st.a, st.r / 4);
      }
    });
    return {
      inputs: { trig: trigIn },
      outputs: { env: env },
      set: function (key, v) { if (key === 'a' || key === 'r') { p[key] = num(v, p[key]); read(); } }
    };
  }

  function readSteps(arr) {
    var s = [];
    for (var i = 0; i < 5; i++) s.push(clamp(num(arr && arr[i], 0), 0, 1));
    return s;
  }

  function buildSEQ5(g, m) {
    var p = m.params || (m.params = {});
    var st = { steps: readSteps(p.steps), rate: clamp(num(p.rate, 4), 0.1, 30), idx: 0, next: 0 };
    var cv = g.constant(st.steps[0]), gate = g.constant(0), clockIn = g.gain(1);
    var external = !!g.patched[m.id + '.clock'];
    function stepAt(t, gateLen) {
      cv.offset.setValueAtTime(st.steps[st.idx], t);
      gate.offset.setValueAtTime(1, t);
      gate.offset.setValueAtTime(0, t + gateLen);
      st.idx = (st.idx + 1) % 5;
    }
    if (external) {
      g.detect(m.id, 'clock', clockIn, {
        rise: function (t) {
          cv.offset.cancelScheduledValues(t);
          gate.offset.cancelScheduledValues(t);
          stepAt(t, 0.06);
        }
      });
    } else {
      st.next = ctx.currentTime + 0.01;
      g.tickers.push(function (now) {
        if (st.next < now) st.next = now + 0.005;
        while (st.next < now + LOOKAHEAD) {
          var per = 1 / st.rate;
          stepAt(st.next, per * 0.5);
          st.next += per;
        }
      });
    }
    return {
      inputs: { clock: clockIn },
      outputs: { cv: cv, gate: gate },
      set: function (key, v) {
        if (key === 'steps') { st.steps = readSteps(v); p.steps = st.steps.slice(); }
        else if (key === 'rate') { st.rate = clamp(num(v, st.rate), 0.1, 30); p.rate = st.rate; }
      }
    };
  }

  function readShape(sh) {
    var out = new Float32Array(64);
    for (var i = 0; i < 64; i++) out[i] = clamp(num(sh && sh[i], 0), 0, 1);
    return out;
  }

  function buildDRAW(g, m) {
    var p = m.params || (m.params = {});
    var st = { shape: readShape(p.shape), rate: clamp(num(p.rate, 1), 0.05, 20), next: 0 };
    var cv = g.constant(st.shape[0]);
    var GAP = 2 / ctx.sampleRate;
    st.next = ctx.currentTime + 0.01;
    g.tickers.push(function (now) {
      if (st.next < now) st.next = now + 0.005;
      var guard = 0;
      while (st.next < now + LOOKAHEAD && guard++ < 64) {
        var dur = 1 / st.rate;
        try {
          cv.offset.setValueCurveAtTime(st.shape, st.next, dur);
          st.next += dur + GAP;
        } catch (e) {
          cv.offset.cancelScheduledValues(now);
          st.next = now + 0.01;
          break;
        }
      }
    });
    return {
      inputs: {},
      outputs: { cv: cv },
      set: function (key, v) {
        if (key === 'shape') { st.shape = readShape(v); p.shape = Array.prototype.slice.call(st.shape); }
        else if (key === 'rate') { st.rate = clamp(num(v, st.rate), 0.05, 20); p.rate = st.rate; }
      }
    };
  }

  var BUILDERS = { VCO: buildVCO, MIX4: buildMIX4, LPF: buildLPF, FOLD: buildFOLD, DELAY: buildDELAY,
                   ADSR: buildADSR, AR: buildAR, SEQ5: buildSEQ5, DRAW: buildDRAW };

  // Saturating curve for feedback cables (bounded loops).
  var satCurve = null;
  function getSatCurve() {
    if (satCurve) return satCurve;
    var N = 2049;
    satCurve = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var x = (i / (N - 1) * 2 - 1) * 4;
      satCurve[i] = Math.tanh(x);
    }
    return satCurve;
  }

  // Graph structure only (module ids/types + kept cables). Params are left out on
  // purpose: while patching they reach the preview graph through previewParam(),
  // so a param edit must not rebuild (and re-trigger) the graph.
  function signature(s) {
    var ms = s.list.map(function (m) { return m.id + ':' + m.type; }).sort();
    var cs = s.cables.map(function (c) {
      return c.from.mod + '.' + c.from.port + '>' + c.to.mod + '.' + c.to.port + (c.loop ? '~' : '');
    }).sort();
    return ms.join(',') + '|' + cs.join(',');
  }

  function build(slot, patch) {
    var s = sanitize(patch);
    var g = new Graph(slot);
    s.cables.forEach(function (c) { if (c.to.mod !== 'OUT') g.patched[c.to.mod + '.' + c.to.port] = true; });
    // Private deep copy of params so live edits never mutate the caller's patch.
    s.list.forEach(function (m) {
      var copy = { id: m.id, type: m.type, params: JSON.parse(JSON.stringify(m.params || {})) };
      if (m.params && m.params.shape && typeof m.params.shape.length === 'number') {
        copy.params.shape = Array.prototype.slice.call(m.params.shape);
      }
      g.mods[m.id] = { type: m.type, def: copy, inst: BUILDERS[m.type](g, copy) };
    });
    g.sig = signature(s);
    var outL = g.gain(1), outR = g.gain(1);
    [outL, outR].forEach(function (n) {
      n.channelCount = 1;
      n.channelCountMode = 'explicit';
      n.channelInterpretation = 'speakers';
    });
    var merger = ctx.createChannelMerger(2);
    g.nodes.push(merger);
    outL.connect(merger, 0, 0);
    outR.connect(merger, 0, 1);
    merger.connect(g.out);
    s.cables.forEach(function (c) {
      var src = g.mods[c.from.mod].inst.outputs[c.from.port];
      var dst = c.to.mod === 'OUT' ? (c.to.port === 'L' ? outL : outR) : g.mods[c.to.mod].inst.inputs[c.to.port];
      if (!src || !dst) return;
      if (c.loop) {
        var d = ctx.createDelay(1);
        d.delayTime.value = 128 / ctx.sampleRate;
        var sat = ctx.createWaveShaper();
        sat.curve = getSatCurve();
        var pre = g.gain(0.25), post = g.gain(1);
        g.nodes.push(d, sat);
        src.connect(pre); pre.connect(sat); sat.connect(post); post.connect(d); d.connect(dst);
      } else {
        src.connect(dst);
      }
    });
    return g;
  }

  // ---------- random modules / auto patch ----------
  var WEIGHTS = [['VCO', 3], ['MIX4', 1.5], ['LPF', 2], ['FOLD', 1.2], ['DELAY', 1.2],
                 ['ADSR', 1], ['AR', 1], ['SEQ5', 1.2], ['DRAW', 1]];
  function pickType() {
    var tot = 0, i;
    for (i = 0; i < WEIGHTS.length; i++) tot += WEIGHTS[i][1];
    var r = Math.random() * tot;
    for (i = 0; i < WEIGHTS.length; i++) { r -= WEIGHTS[i][1]; if (r <= 0) return WEIGHTS[i][0]; }
    return 'VCO';
  }
  function randomShape() {
    var a = [], v = Math.random(), i;
    for (i = 0; i < 64; i++) { v += (Math.random() - 0.5) * 0.5; a.push(v); }
    for (var pass = 0; pass < 2; pass++) {
      var b = [];
      for (i = 0; i < 64; i++) b.push((a[(i + 63) % 64] + a[i] * 2 + a[(i + 1) % 64]) / 4);
      a = b;
    }
    var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), span = hi - lo || 1;
    return a.map(function (x) { return round3((x - lo) / span); });   // spans exactly 0..1
  }
  function randomParams(type) {
    switch (type) {
      case 'VCO':
        var lfo = Math.random() < 0.25;
        return { freq: round3(lfo ? rndLog(0.05, 20) : rndLog(20, 2000)), mode: lfo ? 'lfo' : 'vco', fmAmt: round3(Math.random()) };
      case 'MIX4':
        return { lvl1: round3(rnd(0.3, 1)), lvl2: round3(rnd(0.3, 1)), lvl3: round3(rnd(0.3, 1)), lvl4: round3(rnd(0.3, 1)) };
      case 'LPF':
        return { cutoff: Math.round(rndLog(200, 8000)), res: round3(rnd(0, 0.8)), cvAmt: round3(Math.random()) };
      case 'FOLD':
        return { fold: round3(Math.random()), cvAmt: round3(Math.random()) };
      case 'DELAY':
        return { time: round3(rnd(0.05, 1.5)), fb: round3(rnd(0, 0.85)), mix: round3(rnd(0.2, 0.7)) };
      case 'ADSR':
        return { a: round3(rndLog(0.005, 0.5)), d: round3(rndLog(0.05, 1)), s: round3(Math.random()), r: round3(rndLog(0.05, 1.5)) };
      case 'AR':
        return { a: round3(rndLog(0.002, 0.3)), r: round3(rndLog(0.05, 1.5)) };
      case 'SEQ5':
        return { steps: [0, 1, 2, 3, 4].map(function () { return round3(Math.random()); }), rate: round3(rnd(1, 8)) };
      case 'DRAW':
        return { shape: randomShape(), rate: round3(rndLog(0.2, 4)) };
    }
    return {};
  }
  function makeModule(type) {
    idSeq++;
    return { id: 'm' + idSeq.toString(36) + Math.floor(Math.random() * 1296).toString(36), type: type, params: randomParams(type) };
  }
  function randomModules(n) {
    n = Math.round(clamp(num(n, 10), 1, 32));
    var types = [], i;
    for (i = 0; i < n; i++) types.push(pickType());
    if (types.indexOf('VCO') < 0) types[Math.floor(Math.random() * n)] = 'VCO';
    if (n > 1 && types.indexOf('MIX4') < 0 && types.indexOf('LPF') < 0) {
      var vcoCount = types.filter(function (t) { return t === 'VCO'; }).length;
      var cand = [];
      for (i = 0; i < n; i++) if (types[i] !== 'VCO' || vcoCount > 1) cand.push(i);
      types[cand[Math.floor(Math.random() * cand.length)]] = Math.random() < 0.5 ? 'LPF' : 'MIX4';
    }
    return types.map(makeModule);
  }

  function autoPatch(modules) {
    var mods = (modules || []).map(function (m) {
      var c = { id: m.id, type: m.type, params: JSON.parse(JSON.stringify(m.params || {})) };
      if (m.params && m.params.shape && typeof m.params.shape.length === 'number') {
        c.params.shape = Array.prototype.slice.call(m.params.shape);
      }
      return c;
    });
    var vco = null, lpf = null, i;
    for (i = 0; i < mods.length; i++) {
      if (!vco && mods[i].type === 'VCO') vco = mods[i];
      if (!lpf && mods[i].type === 'LPF') lpf = mods[i];
    }
    var cables = [];
    if (vco) {
      vco.params.mode = 'vco';
      vco.params.freq = round3(rnd(110, 440));
      if (lpf) {
        cables.push({ from: { mod: vco.id, port: 'saw' }, to: { mod: lpf.id, port: 'in' } });
        cables.push({ from: { mod: lpf.id, port: 'out' }, to: { mod: 'OUT', port: 'L' } });
        cables.push({ from: { mod: lpf.id, port: 'out' }, to: { mod: 'OUT', port: 'R' } });
      } else {
        cables.push({ from: { mod: vco.id, port: 'saw' }, to: { mod: 'OUT', port: 'L' } });
        cables.push({ from: { mod: vco.id, port: 'saw' }, to: { mod: 'OUT', port: 'R' } });
      }
    }
    return { modules: mods, cables: cables };
  }

  // ---------- slot control ----------
  var lastError = null;   // last build() failure (play/preview return false); read via MFAudio.lastError
  function startSlot(slot, patch, fadeIn) {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    var old = slots[slot];
    slots[slot] = null;
    if (old) old.kill();
    var g = null;
    try {
      g = build(slot, patch);
    } catch (e) {
      lastError = String(e && (e.stack || e.message) || e);
      if (g) g.kill();
      return false;
    }
    slots[slot] = g;
    g.start(fadeIn);
    return true;
  }
  function cancelPreviewTimer() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = 0;
    previewPending = null;
  }
  function flushPreview() {
    var patch = previewPending;
    cancelPreviewTimer();
    if (!patch) return;
    if (score(patch) <= 0) {
      if (slots.preview) { slots.preview.kill(); slots.preview = null; }
      return;
    }
    var cur = slots.preview;
    if (cur && !cur.dead) {
      var sig = null;
      try { sig = signature(sanitize(patch)); } catch (e) { sig = null; }
      if (sig === cur.sig) return;            // only params changed: already applied live
    }
    startSlot('preview', patch, FADE);
  }

  // ---------- public API ----------
  var MFAudio = {
    TYPES: TYPES,

    init: function () {
      try { ensureCtx(); } catch (e) { return Promise.reject(e); }
      startRecorder();
      return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    },

    play: function (slot, patch) {
      if (slot !== 'me' && slot !== 'foe') return false;
      return startSlot(slot, patch, 0.005);
    },

    stop: function (slot) {
      var list = slot ? [slot] : SLOT_NAMES;
      list.forEach(function (s) {
        if (s === 'preview') cancelPreviewTimer();
        if (slots[s]) { slots[s].kill(); slots[s] = null; }
      });
    },

    // Live preview of the patch being built. Debounced; rebuilds only when the
    // graph structure changed (params arrive through previewParam). Nothing
    // reaching OUT stops the preview slot.
    preview: function (patch) {
      previewPending = patch;
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(flushPreview, PREVIEW_DEBOUNCE_MS);
    },

    // Promote the playing preview graph to "me" without rebuilding it. With a
    // patch argument, the promotion only happens if the preview graph has the
    // same structure (so the sound matches what is sent). Returns false when
    // there is nothing to promote; the caller then falls back to play("me").
    commitPreview: function (patch) {
      if (previewTimer) flushPreview();
      var g = slots.preview;
      if (!g || g.dead) return false;
      if (patch !== undefined) {
        var sig = null;
        try { sig = signature(sanitize(patch)); } catch (e) { sig = null; }
        if (sig !== g.sig) return false;
      }
      var old = slots.me;
      slots.me = null;
      if (old) old.kill();                       // 50 ms fade, as play() does
      // both slot gains are SLOT_GAIN: connect first, then disconnect, so the
      // graph is never off the bus
      g.out.connect(slotGain.me);
      try { g.out.disconnect(slotGain.preview); } catch (e) {}
      g.slot = 'me';
      slots.preview = null;
      slots.me = g;
      return true;
    },

    // Debug: which slots currently hold a live graph.
    slots: function () {
      var r = {};
      SLOT_NAMES.forEach(function (s) { r[s] = !!(slots[s] && !slots[s].dead); });
      return r;
    },

    score: score,
    autoPatch: autoPatch,
    randomModules: randomModules,

    stopRecording: function () {
      return new Promise(function (resolve) {
        function finish() {
          var type = (recMime || 'audio/webm').split(';')[0];
          resolve(new Blob(recChunks, { type: type }));
        }
        if (!recorder || recorder.state === 'inactive') { finish(); return; }
        recorder.onstop = finish;
        try { recorder.requestData(); } catch (e) {}
        recorder.stop();
      });
    },

    // Live param edit: the module being edited lives in the preview graph; fall
    // back to the playing "me" graph. No-op if neither holds that module.
    previewParam: function (modId, key, value) {
      var list = ['preview', 'me'];
      for (var i = 0; i < list.length; i++) {
        var g = slots[list[i]];
        if (g && !g.dead && g.mods[modId]) { g.mods[modId].inst.set(key, value); return; }
      }
    }
  };
  Object.defineProperty(MFAudio, 'recordingActive', {
    get: function () { return !!(recorder && recorder.state === 'recording'); },
    enumerable: true
  });
  Object.defineProperty(MFAudio, 'lastError', {
    get: function () { return lastError; },
    enumerable: true
  });

  window.MFAudio = MFAudio;
})();
