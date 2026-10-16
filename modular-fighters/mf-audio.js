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
    MIXVCA: { inputs: ['in1', 'in2', 'in3', 'in4', 'cv1', 'cv2', 'cv3', 'cv4'], outputs: ['out'] },
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
  var idSeq = 0;

  // ---------- small helpers ----------
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function rndLog(lo, hi) { return lo * Math.pow(hi / lo, Math.random()); }
  // cv1..cv4 are the MIXVCA per-channel VCA inputs (no output port is named cvN)
  function isModPort(p) { return MOD_PORTS[p] === 1 || /_cv$/.test(p) || /^cv[1-4]$/.test(p); }
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
    SLOT_NAMES.forEach(function (s) {
      var g = ctx.createGain();
      g.gain.value = SLOT_GAIN;
      g.connect(comp);
      slotGain[s] = g;
    });
    return ctx;
  }

  // ---------- recording: master PCM -> MP3 (lamejs), MediaRecorder fallback ----------
  // The master output (after the compressor and the 0.5 trim, i.e. exactly what
  // is heard) is captured as stereo float PCM by an AudioWorklet (ScriptProcessor
  // if AudioWorklet is missing) and MP3-encoded on the main thread in ~1 s
  // batches, so only about one second of PCM is held at a time.
  // lamejs 1.2.1 is loaded from cdnjs, version pinned, with an SRI hash.
  // License of lamejs is LGPL-3.0 (its package.json), loaded unmodified as a
  // separate file. If it cannot load, or the context rate is not an MP3 rate,
  // the old MediaRecorder path (webm/opus or mp4) is used instead.
  var LAME_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
  var LAME_SRI = 'sha384-xuasJXVcyv3hZq0eYpelEkBC8l4yufatZXDsKuyCU2rqfhDCb+ftuE/mSfZAteiK';
  var MP3_KBPS = 128;
  var MP3_RATES = { 8000: 1, 11025: 1, 12000: 1, 16000: 1, 22050: 1, 24000: 1, 32000: 1, 44100: 1, 48000: 1 };
  var MP3_BLOCK = 1152;                 // samples per MPEG-1 frame
  var CAP_FRAMES = 4096;                // frames per chunk posted by the worklet
  var BACKLOG_MAX_S = 120;              // PCM kept while lamejs is still loading
  var lameState = 'idle';               // idle | loading | ready | failed
  var lameWaiters = [];
  var cap = null;                       // { node, ready, worklet, post(cmd) }
  var capTarget = null, capNext = null; // session receiving PCM / session queued behind a stop
  var capStopWait = null;               // resolver of the pending worklet stop
  var rec = null;                       // active recording session
  var lastBlob = null;
  var recDest = null;

  function loadLame() {
    if (lameState !== 'idle') return;
    if (window.lamejs && window.lamejs.Mp3Encoder) { lameState = 'ready'; return; }
    if (typeof document === 'undefined' || !document.createElement) { lameState = 'failed'; return; }
    lameState = 'loading';
    var s = document.createElement('script');
    s.src = LAME_URL;
    s.integrity = LAME_SRI;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = function () { lameDone(!!(window.lamejs && window.lamejs.Mp3Encoder)); };
    s.onerror = function () { lameDone(false); };
    (document.head || document.documentElement).appendChild(s);
  }
  function lameDone(ok) {
    lameState = ok ? 'ready' : 'failed';
    var w = lameWaiters;
    lameWaiters = [];
    w.forEach(function (fn) { try { fn(ok); } catch (e) {} });
  }

  var WORKLET_SRC =
    "class MFCapture extends AudioWorkletProcessor {\n" +
    "  constructor() {\n" +
    "    super(); this.on = false; this.n = 0;\n" +
    "    this.L = new Float32Array(" + CAP_FRAMES + "); this.R = new Float32Array(" + CAP_FRAMES + ");\n" +
    "    this.port.onmessage = (e) => {\n" +
    "      if (e.data === 'start') { this.on = true; this.n = 0; }\n" +
    "      else if (e.data === 'stop') { this.flush(); this.on = false; this.port.postMessage('stopped'); }\n" +
    "    };\n" +
    "  }\n" +
    "  flush() {\n" +
    "    if (!this.n) return;\n" +
    "    var l = this.L.slice(0, this.n), r = this.R.slice(0, this.n);\n" +
    "    this.port.postMessage([l, r], [l.buffer, r.buffer]); this.n = 0;\n" +
    "  }\n" +
    "  process(inputs) {\n" +
    "    if (!this.on) return true;\n" +
    "    var inp = inputs[0], a = inp && inp[0], b = inp && (inp[1] || inp[0]);\n" +
    "    var len = a ? a.length : 128;\n" +   // no channels = silent input: still advance time
    "    for (var i = 0; i < len; i++) {\n" +
    "      this.L[this.n] = a ? a[i] : 0; this.R[this.n] = b ? b[i] : 0;\n" +
    "      if (++this.n === " + CAP_FRAMES + ") this.flush();\n" +
    "    }\n" +
    "    return true;\n" +
    "  }\n" +
    "}\n" +
    "registerProcessor('mf-capture', MFCapture);\n";

  // Linear-interpolation resampler for context rates that MP3 cannot carry
  // (88.2 / 96 / 176.4 / 192 kHz audio interfaces). Position and the last input
  // sample of each channel are carried across batches, so batch borders leave no seam.
  // Coordinates: index 0 = last sample of the previous batch, index i+1 = a[i].
  // No anti-alias filter before decimation (content above 24 kHz folds back).
  function makeResampler(inRate, outRate) {
    return { step: inRate / outRate, t: 1, pl: 0, pr: 0, init: false };
  }
  function resampleChunk(st, a, b) {
    var n = a.length;
    if (!n) return [a, b];
    if (!st.init) { st.init = true; st.pl = a[0]; st.pr = b[0]; st.t = 1; }
    var cap = Math.max(0, Math.ceil((n - st.t) / st.step) + 1);
    var oL = new Float32Array(cap), oR = new Float32Array(cap), k = 0;
    var t = st.t, step = st.step;
    while (t < n && k < cap) {
      var i = Math.floor(t), f = t - i;
      var l0 = i === 0 ? st.pl : a[i - 1], r0 = i === 0 ? st.pr : b[i - 1];
      oL[k] = l0 + (a[i] - l0) * f;
      oR[k] = r0 + (b[i] - r0) * f;
      k++;
      t += step;
    }
    st.t = t - n;
    st.pl = a[n - 1]; st.pr = b[n - 1];
    return [oL.subarray(0, k), oR.subarray(0, k)];
  }

  function onCapChunk(l, r) {
    var s = capTarget;
    if (!s || !s.pcm) return;
    if (s.rs) { var o = resampleChunk(s.rs, l, r); l = o[0]; r = o[1]; }
    s.qL.push(l); s.qR.push(r); s.qN += l.length; s.frames += l.length;
    if (s.enc) {
      if (s.qN >= s.encRate) encodeQueue(s);
    } else if (s.qN > BACKLOG_MAX_S * s.encRate && s.mr) {
      dropPcm(s);                          // lamejs never came: keep the MediaRecorder take
    }
  }
  function onCapStopped() {
    if (!capStopWait) return;              // late reply after the 500 ms timeout already handled it
    var w = capStopWait;
    capStopWait = null;
    capTarget = capNext;
    capNext = null;
    if (capTarget) cap.post('start');
    if (w) w();
  }

  function setupScriptCapture() {
    var sp = ctx.createScriptProcessor(4096, 2, 2);
    sp.channelCount = 2; sp.channelCountMode = 'explicit'; sp.channelInterpretation = 'speakers';
    var on = false;
    sp.onaudioprocess = function (ev) {
      var ob = ev.outputBuffer;
      for (var c = 0; c < ob.numberOfChannels; c++) ob.getChannelData(c).fill(0);
      if (!on) return;
      var ib = ev.inputBuffer;
      var l = new Float32Array(ib.getChannelData(0));
      var r = new Float32Array(ib.numberOfChannels > 1 ? ib.getChannelData(1) : ib.getChannelData(0));
      onCapChunk(l, r);
    };
    hard.connect(sp);
    sp.connect(ctx.destination);
    return {
      node: sp, worklet: false, ready: Promise.resolve(),
      post: function (cmd) {
        if (cmd === 'start') on = true;
        else if (cmd === 'stop') { on = false; setTimeout(onCapStopped, 0); }
      }
    };
  }

  function ensureCapture() {
    if (cap) return cap;
    var useWorklet = !!(ctx.audioWorklet && window.AudioWorkletNode && window.Blob && window.URL);
    if (!useWorklet) {
      if (!ctx.createScriptProcessor) return null;
      cap = setupScriptCapture();
      return cap;
    }
    var queued = [];
    var c = { node: null, worklet: true, ready: null,
              post: function (cmd) { if (c.node) c.node.port.postMessage(cmd); else queued.push(cmd); } };
    cap = c;
    var url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
    c.ready = ctx.audioWorklet.addModule(url).then(function () {
      var n = new AudioWorkletNode(ctx, 'mf-capture', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
        channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers'
      });
      n.port.onmessage = function (e) {
        if (e.data === 'stopped') onCapStopped();
        else if (e.data && e.data.length === 2) onCapChunk(e.data[0], e.data[1]);
      };
      hard.connect(n);
      n.connect(ctx.destination);         // output stays silent; keeps the node pulled
      c.node = n;
      queued.forEach(function (cmd) { n.port.postMessage(cmd); });
      queued = [];
    }, function () {
      // AudioWorklet unusable: same commands go to a ScriptProcessor instead
      var sp = ctx.createScriptProcessor ? setupScriptCapture() : null;
      c.worklet = false;
      c.post = sp ? sp.post : function (cmd) { if (cmd === 'stop') setTimeout(onCapStopped, 0); };
      c.node = sp && sp.node;
      queued.forEach(function (cmd) { c.post(cmd); });
      queued = [];
    }).then(function () { try { URL.revokeObjectURL(url); } catch (e) {} });
    return c;
  }

  function f2i(src, dst) {
    for (var i = 0; i < src.length; i++) {
      var v = src[i];
      v = v > 1 ? 1 : (v < -1 ? -1 : (v === v ? v : 0));
      dst[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
  }
  function encodeQueue(s) {
    if (!s.enc || !s.qN) return;
    var L = new Int16Array(s.qN), R = new Int16Array(s.qN), off = 0;
    for (var i = 0; i < s.qL.length; i++) {
      f2i(s.qL[i], L.subarray(off, off + s.qL[i].length));
      f2i(s.qR[i], R.subarray(off, off + s.qR[i].length));
      off += s.qL[i].length;
    }
    s.qL = []; s.qR = []; s.qN = 0;
    for (var k = 0; k < L.length; k += MP3_BLOCK) {
      var out = s.enc.encodeBuffer(L.subarray(k, k + MP3_BLOCK), R.subarray(k, k + MP3_BLOCK));
      if (out.length) s.mp3.push(out);
    }
  }
  function dropPcm(s) {
    s.pcm = false;
    s.qL = []; s.qR = []; s.qN = 0;
    s.enc = null;
  }

  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    return '';
  }
  function startMR() {
    if (!window.MediaRecorder || !ctx.createMediaStreamDestination) return null;
    if (!recDest) { recDest = ctx.createMediaStreamDestination(); hard.connect(recDest); }
    var mime = pickMime(), r;
    try {
      r = mime ? new MediaRecorder(recDest.stream, { mimeType: mime }) : new MediaRecorder(recDest.stream);
    } catch (e) { return null; }
    var m = { rec: r, chunks: [], mime: mime || r.mimeType || 'audio/webm' };
    r.ondataavailable = function (ev) { if (ev.data && ev.data.size) m.chunks.push(ev.data); };
    r.start(1000);
    return m;
  }
  function stopMR(m, keep) {
    return new Promise(function (resolve) {
      function finish() { resolve(keep ? new Blob(m.chunks, { type: m.mime.split(';')[0] }) : null); }
      if (!m || !m.rec || m.rec.state === 'inactive') { if (m) finish(); else resolve(null); return; }
      m.rec.onstop = finish;
      try { if (keep) m.rec.requestData(); } catch (e) {}
      try { m.rec.stop(); } catch (e) { finish(); }
    });
  }
  function newEncoder(rate) {
    try { return new window.lamejs.Mp3Encoder(2, rate, MP3_KBPS); } catch (e) { return null; }
  }

  function startRecorder() {
    if (rec) return;
    // an earlier load failure (offline moment, blocked request) is retried for every new take
    if (lameState === 'failed' && !(window.lamejs && window.lamejs.Mp3Encoder)) lameState = 'idle';
    loadLame();
    // MP3 rates are encoded as they are; any other context rate (e.g. 96 kHz) is
    // resampled to 48 kHz before encoding instead of falling back to MediaRecorder
    var encRate = MP3_RATES[ctx.sampleRate] === 1 ? ctx.sampleRate : 48000;
    var s = { pcm: false, enc: null, mp3: [], qL: [], qR: [], qN: 0, frames: 0, mr: null, encRate: encRate,
              rs: encRate !== ctx.sampleRate ? makeResampler(ctx.sampleRate, encRate) : null };
    rec = s;
    var mp3Possible = lameState !== 'failed';
    var c = mp3Possible ? ensureCapture() : null;
    if (c) {
      s.pcm = true;
      if (capStopWait) capNext = s;           // previous take still flushing
      else { capTarget = s; c.post('start'); }
      if (lameState === 'ready') {
        s.enc = newEncoder(s.encRate);
        if (!s.enc) { dropPcm(s); s.mr = startMR(); }
      } else {
        s.mr = startMR();                     // backup take until lamejs answers
        lameWaiters.push(function (ok) {
          if (!s.pcm) return;
          if (ok) s.enc = newEncoder(s.encRate);
          if (s.enc) {
            if (s.mr) { stopMR(s.mr, false); s.mr = null; }
            if (s.qN >= s.encRate) encodeQueue(s);
          } else {
            dropPcm(s);
            if (!s.mr && rec === s) s.mr = startMR();
          }
        });
      }
    } else {
      s.mr = startMR();
    }
  }

  function stopCaptureFor(s) {
    return new Promise(function (resolve) {
      if (capTarget !== s) { if (capNext === s) capNext = null; resolve(); return; }
      var done = false;
      function fin() { if (done) return; done = true; resolve(); }
      capStopWait = fin;
      cap.post('stop');
      setTimeout(function () { if (!done && capStopWait === fin) onCapStopped(); }, 500);
    });
  }

  function stopRecorder() {
    var s = rec;
    if (!s) return Promise.resolve(lastBlob || new Blob([], { type: 'audio/mpeg' }));
    rec = null;
    var stopCap = s.pcm ? stopCaptureFor(s) : Promise.resolve();
    return stopCap.then(function () {
      if (s.pcm && !s.enc && lameState === 'loading') {
        // lamejs still on its way: wait up to 5 s for it, else use the backup take
        return new Promise(function (resolve) {
          var t = setTimeout(resolve, 5000);
          lameWaiters.push(function () { clearTimeout(t); resolve(); });
        });
      }
    }).then(function () {
      if (s.pcm && s.enc) {
        encodeQueue(s);
        var tail = s.enc.flush();
        if (tail.length) s.mp3.push(tail);
        s.enc = null;
        if (s.mr) stopMR(s.mr, false);
        return new Blob(s.mp3, { type: 'audio/mpeg' });
      }
      dropPcm(s);
      return stopMR(s.mr, true).then(function (b) { return b || new Blob([], { type: 'audio/mpeg' }); });
    }).then(function (blob) {
      lastBlob = blob;
      return blob;
    });
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
    this.seed = {};                     // id -> snapshot of the same module in the graph this one replaces
    this.audible = false;               // any cable reaches OUT
  }
  Graph.prototype.seedFor = function (m) {
    var sd = this.seed[m.id];
    return sd && sd.type === m.type ? sd : null;
  };
  // Envelope tap for the panel oscilloscope: level = peak of the last ~43 ms (main thread read only).
  Graph.prototype.levelTap = function (node) {
    var an = ctx.createAnalyser();
    an.fftSize = 2048;
    node.connect(an);
    an.connect(this.sink);
    this.nodes.push(an);
    var buf = new Float32Array(an.fftSize);
    return function () {
      an.getFloatTimeDomainData(buf);
      var mx = 0;
      for (var i = 0; i < buf.length; i++) { var v = buf[i]; if (v > mx) mx = v; }
      return clamp(mx, 0, 1);
    };
  };
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

  // 3-point curve over input -1..1: [0, 0, 1] -> clamp(x, 0, 1); inputs beyond
  // +-1 are held at the curve ends by WaveShaper itself.
  var unipolarCurve = null;
  function getUnipolarCurve() {
    if (!unipolarCurve) unipolarCurve = new Float32Array([0, 0, 1]);
    return unipolarCurve;
  }

  // MIX VCA: per channel  inN -> level gain (lvlN) -> vca gain -> out.
  // cvN patched: vca gain base 0, cv clamped 0..1 drives vca.gain, so the
  // effective gain is lvlN * clamp(cv, 0, 1). cvN not patched: vca gain 1.
  function buildMIXVCA(g, m) {
    var p = m.params || (m.params = {});
    var out = g.gain(1), ins = {}, lvls = {};
    for (var i = 1; i <= 4; i++) {
      var lvl = g.gain(clamp(num(p['lvl' + i], 0.8), 0, 1));
      var cvIn = g.gain(1);
      var vca;
      if (g.patched[m.id + '.cv' + i]) {
        vca = g.gain(0);
        var ws = ctx.createWaveShaper();
        ws.curve = getUnipolarCurve();
        g.nodes.push(ws);
        cvIn.connect(ws);
        ws.connect(vca.gain);
      } else {
        vca = g.gain(1);
      }
      lvl.connect(vca);
      vca.connect(out);
      ins['in' + i] = lvl;
      ins['cv' + i] = cvIn;
      lvls[i] = lvl;
    }
    return {
      inputs: ins,
      outputs: { out: out },
      set: function (key, v) {
        var mm = /^lvl([1-4])$/.exec(key);
        if (!mm) return;
        var val = clamp(num(v, 0), 0, 1);
        p[key] = val;
        lvls[mm[1]].gain.setTargetAtTime(val, ctx.currentTime, 0.01);
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
    var level = g.levelTap(env);
    return {
      inputs: { gate: gateIn },
      outputs: { env: env },
      set: function (key, v) { if (key === 'a' || key === 'd' || key === 's' || key === 'r') { p[key] = num(v, p[key]); read(); } },
      state: function () { return { level: level() }; }
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
    var level = g.levelTap(env);
    return {
      inputs: { trig: trigIn },
      outputs: { env: env },
      set: function (key, v) { if (key === 'a' || key === 'r') { p[key] = num(v, p[key]); read(); } },
      state: function () { return { level: level() }; }
    };
  }

  function readSteps(arr) {
    var s = [];
    for (var i = 0; i < 5; i++) s.push(clamp(num(arr && arr[i], 0), 0, 1));
    return s;
  }

  // SEQ5: internal clock at RATE when "clock" is not patched (runs in silent preview graphs
  // too, so the step position is live from the moment the panel shows the module); a patched
  // clock takes over. hist = scheduled steps, read by state() for the panel animation and by
  // snapshot() so a rebuilt graph continues on the same step and the same beat.
  function buildSEQ5(g, m) {
    var p = m.params || (m.params = {});
    var st = { steps: readSteps(p.steps), rate: clamp(num(p.rate, 4), 0.1, 30), idx: 0, next: 0 };
    var external = !!g.patched[m.id + '.clock'];
    var hist = [];
    var now0 = ctx.currentTime;
    var sd = g.seedFor(m), curIdx = -1, gateUntil = 0;
    if (sd) {
      st.idx = sd.idx;
      curIdx = sd.cur;
      if (!external && sd.next > now0) st.next = sd.next;
      if (sd.cur >= 0 && sd.gEnd > now0) gateUntil = sd.gEnd;
    }
    var cv = g.constant(st.steps[curIdx >= 0 ? curIdx : 0]), gate = g.constant(0), clockIn = g.gain(1);
    if (curIdx >= 0) hist.push({ t: now0, idx: curIdx, gEnd: gateUntil || now0 });
    if (gateUntil > now0) {
      gate.offset.setValueAtTime(1, now0);
      gate.offset.setValueAtTime(0, gateUntil);
    }
    function stepAt(t, gateLen) {
      cv.offset.setValueAtTime(st.steps[st.idx], t);
      gate.offset.setValueAtTime(1, t);
      gate.offset.setValueAtTime(0, t + gateLen);
      hist.push({ t: t, idx: st.idx, gEnd: t + gateLen });
      if (hist.length > 48) hist.splice(0, hist.length - 48);
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
      if (!st.next) st.next = now0 + 0.01;
      g.tickers.push(function (now) {
        if (st.next < now) st.next = now + 0.005;
        while (st.next < now + LOOKAHEAD) {
          var per = 1 / st.rate;
          stepAt(st.next, per * 0.5);
          st.next += per;
        }
      });
    }
    // the step sounding at time t (-1 before the first step)
    function at(t) {
      for (var i = hist.length - 1; i >= 0; i--) if (hist[i].t <= t) return hist[i];
      return null;
    }
    return {
      inputs: { clock: clockIn },
      outputs: { cv: cv, gate: gate },
      set: function (key, v) {
        if (key === 'steps') {
          st.steps = readSteps(v); p.steps = st.steps.slice();
          // the step that is sounding now takes the new value at once
          var h = at(ctx.currentTime);
          if (h) {
            var tt = ctx.currentTime;
            var nx = null;
            for (var i = 0; i < hist.length; i++) if (hist[i].t > tt) { nx = hist[i]; break; }
            if (!nx) { cv.offset.cancelScheduledValues(tt); cv.offset.setValueAtTime(st.steps[h.idx], tt); }
            else {
              cv.offset.cancelScheduledValues(tt);
              cv.offset.setValueAtTime(st.steps[h.idx], tt);
              for (var k = 0; k < hist.length; k++) if (hist[k].t > tt) cv.offset.setValueAtTime(st.steps[hist[k].idx], hist[k].t);
            }
          }
        }
        else if (key === 'rate') { st.rate = clamp(num(v, st.rate), 0.1, 30); p.rate = st.rate; }
      },
      state: function (t) {
        var h = at(t);
        return { step: h ? h.idx : -1, gate: !!(h && t < h.gEnd), external: external, rate: st.rate };
      },
      snapshot: function (t) {
        var h = at(t), nx = null;
        for (var i = 0; i < hist.length; i++) if (hist[i].t > t) { nx = hist[i]; break; }
        return { type: 'SEQ5', cur: h ? h.idx : -1, gEnd: h ? h.gEnd : 0,
                 idx: nx ? nx.idx : st.idx, next: nx ? nx.t : st.next };
      }
    };
  }

  function readShape(sh) {
    var out = new Float32Array(64);
    for (var i = 0; i < 64; i++) out[i] = clamp(num(sh && sh[i], 0), 0, 1);
    return out;
  }

  function shapeAt(sh, ph) {
    var x = clamp(ph, 0, 1) * 63, i = Math.floor(x);
    if (i >= 63) return sh[63];
    return sh[i] + (sh[i + 1] - sh[i]) * (x - i);
  }
  // DRAW: one cycle = the 64-point shape over 1/RATE s (setValueCurveAtTime). A rate or shape
  // edit re-times the cycle in flight from the current phase (no wait for the next cycle).
  // hist = scheduled segments {t, len, p0}: phase(T) = p0 + (T - t) / len * (1 - p0).
  function buildDRAW(g, m) {
    var p = m.params || (m.params = {});
    var st = { shape: readShape(p.shape), rate: clamp(num(p.rate, 1), 0.05, 20), next: 0, retime: false };
    var GAP = 2 / ctx.sampleRate;
    var hist = [];
    var now0 = ctx.currentTime;
    var sd = g.seedFor(m);
    var p0 = sd ? sd.phaseAt(now0 + 0.01) : 0;
    var cv = g.constant(shapeAt(st.shape, p0));
    function segment(t0, ph0) {
      var len = (1 - ph0) / st.rate;
      var curve;
      if (ph0 <= 0) curve = st.shape;
      else {
        var M = Math.max(2, Math.ceil((1 - ph0) * 63) + 1);
        curve = new Float32Array(M);
        for (var k = 0; k < M; k++) curve[k] = shapeAt(st.shape, ph0 + (1 - ph0) * k / (M - 1));
      }
      cv.offset.setValueCurveAtTime(curve, t0, Math.max(len, 0.001));
      hist.push({ t: t0, len: Math.max(len, 0.001), p0: ph0 });
      if (hist.length > 24) hist.splice(0, hist.length - 24);
      st.next = t0 + len + GAP;
    }
    function phaseAt(t) {
      for (var i = hist.length - 1; i >= 0; i--) {
        var h = hist[i];
        if (h.t <= t) return clamp(h.p0 + (t - h.t) / h.len * (1 - h.p0), 0, 1) % 1;
      }
      return 0;
    }
    try { segment(now0 + 0.01, p0); } catch (e) { st.next = now0 + 0.01; }
    g.tickers.push(function (now) {
      if (st.retime) {
        st.retime = false;
        var t0 = now + 0.02, ph = phaseAt(t0);
        try {
          var tHold = hold(cv.offset, t0);
          for (var j = hist.length - 1; j >= 0; j--) if (hist[j].t >= tHold) hist.splice(j, 1);
          segment(tHold + GAP, ph);
        } catch (e) {
          try { cv.offset.cancelScheduledValues(now); } catch (e2) {}
          st.next = now + 0.01;
        }
      }
      if (st.next < now) st.next = now + 0.005;
      var guard = 0;
      while (st.next < now + LOOKAHEAD && guard++ < 64) {
        try {
          segment(st.next, 0);
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
        if (key === 'shape') { st.shape = readShape(v); p.shape = Array.prototype.slice.call(st.shape); st.retime = true; }
        else if (key === 'rate') { st.rate = clamp(num(v, st.rate), 0.05, 20); p.rate = st.rate; st.retime = true; }
      },
      state: function (t) { var ph = phaseAt(t); return { phase: ph, value: shapeAt(st.shape, ph), rate: st.rate }; },
      snapshot: function () { return { type: 'DRAW', phaseAt: phaseAt }; }
    };
  }

  var BUILDERS = { VCO: buildVCO, MIXVCA: buildMIXVCA, LPF: buildLPF, FOLD: buildFOLD, DELAY: buildDELAY,
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

  function build(slot, patch, seeds) {
    var s = sanitize(patch);
    var g = new Graph(slot);
    if (seeds) g.seed = seeds;
    g.audible = s.cables.some(function (c) { return c.to.mod === 'OUT'; });
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
  var WEIGHTS = [['VCO', 3], ['MIXVCA', 1.5], ['LPF', 2], ['FOLD', 1.2], ['DELAY', 1.2],
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
      case 'MIXVCA':
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
    if (n > 1 && types.indexOf('MIXVCA') < 0 && types.indexOf('LPF') < 0) {
      var vcoCount = types.filter(function (t) { return t === 'VCO'; }).length;
      var cand = [];
      for (i = 0; i < n; i++) if (types[i] !== 'VCO' || vcoCount > 1) cand.push(i);
      types[cand[Math.floor(Math.random() * cand.length)]] = Math.random() < 0.5 ? 'LPF' : 'MIXVCA';
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
    var seeds = slot === 'preview' && old && !old.dead ? snapshotGraph(old) : null;
    if (old) old.kill();
    var g = null;
    try {
      g = build(slot, patch, seeds);
    } catch (e) {
      lastError = String(e && (e.stack || e.message) || e);
      if (g) g.kill();
      return false;
    }
    slots[slot] = g;
    g.start(fadeIn);
    return true;
  }
  // per-module continuity data (SEQ5 step + beat, DRAW phase) of a graph about to be replaced
  function snapshotGraph(g) {
    var out = {}, t = ctx.currentTime;
    for (var id in g.mods) {
      var inst = g.mods[id].inst;
      if (inst && inst.snapshot) { try { out[id] = inst.snapshot(t); } catch (e) {} }
    }
    return out;
  }
  // context time of the sample leaving the speakers now (what the player hears)
  function heardTime() {
    if (ctx.getOutputTimestamp) {
      try {
        var ts = ctx.getOutputTimestamp();
        if (ts && ts.contextTime > 0 && ts.performanceTime > 0 && window.performance) {
          return ts.contextTime + Math.max(0, performance.now() - ts.performanceTime) / 1000;
        }
      } catch (e) {}
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
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
    // the preview graph is built even when nothing reaches OUT (silent): SEQ5 / DRAW clocks
    // and envelopes run from the moment the panel shows them. Only an empty panel stops it.
    var nMods = 0;
    try { nMods = sanitize(patch).list.length; } catch (e) { nMods = 0; }
    if (!nMods) {
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
    // reaching OUT keeps a silent graph (clocks, envelopes, panel animation).
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
      if (!g || g.dead || !g.audible) return false;
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
      SLOT_NAMES.forEach(function (s) { r[s] = !!(slots[s] && !slots[s].dead && (s !== 'preview' || slots[s].audible)); });
      return r;
    },

    score: score,
    autoPatch: autoPatch,
    randomModules: randomModules,

    // -> Promise<Blob>: audio/mpeg normally; audio/webm or audio/mp4 when the
    // MP3 encoder could not be used. Without an active take: the last blob.
    stopRecording: function () {
      return stopRecorder();
    },

    // Panel animation: live state of a module, preview graph first, then "me".
    // SEQ5 -> {step 0..4 (-1 none yet), gate, external, rate}; DRAW -> {phase 0..1, value 0..1, rate};
    // ADSR / AR -> {level 0..1, peak of the last ~43 ms}. Times are what is heard now
    // (output latency removed). null when no live graph holds the module.
    getModuleState: function (modId) {
      if (!ctx) return null;
      var list = ['preview', 'me'];
      for (var i = 0; i < list.length; i++) {
        var g = slots[list[i]];
        var md = g && !g.dead && g.mods[modId];
        if (md && md.inst && md.inst.state) {
          var o = md.inst.state(heardTime());
          o.type = md.type;
          o.slot = list[i];
          return o;
        }
      }
      return null;
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
    get: function () { return !!rec; },
    enumerable: true
  });
  Object.defineProperty(MFAudio, 'lastError', {
    get: function () { return lastError; },
    enumerable: true
  });

  window.MFAudio = MFAudio;
  // fetch the MP3 encoder early so it is normally ready before the first take
  try { loadLame(); } catch (e) {}
})();
