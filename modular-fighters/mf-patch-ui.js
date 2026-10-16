/* Modular Fighters — patch panel UI (owner: ui agent)
   Exposes window.MFPatchUI per SPEC.md. Plain browser script, no imports.
   Requires mf-patch-ui.css. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SHAPE_N = 64;
  var DOUBLE_TAP_MS = 300;
  var TAP_SLOP = 8;

  /* ---------- case geometry (6U case = two rails, Eurorack-style HP widths) ---------- */
  var HP_PX = 19;            // 1 HP in CSS px (390px phone shows ~2.5 modules per rail)
  var JACK_HIT = 32;         // must match --mfp-jack-hit
  var MOD_CHROME = 10;       // module border 2 + horizontal padding 8
  var HP = { VCO: 8, MIXVCA: 10, MIX4: 10, LPF: 8, FOLD: 6, DELAY: 8, ADSR: 8, AR: 6, SEQ5: 10, DRAW: 10 };

  /* ---------- rotary knob geometry ---------- */
  var KNOB_TRAVEL = 150;     // px of drag for the full range
  var KNOB_THRESH = 3;       // first-move threshold (px)
  var KNOB_MIN = 40, KNOB_MAX = 72;   // dial diameter range (px)
  var KNOB_LABEL_H = 21;     // label line (19) + gap (2), must match CSS
  var KNOB_INLINE = 40;      // dial diameter of the RATE knob beside the SEQ5 / DRAW jacks
  var ARC_START = -150, ARC_SWEEP = 300;   // 7 o'clock -> 5 o'clock, clockwise

  /* ---------- module definitions (port names fixed by SPEC) ---------- */
  // param curve: 'lin' | 'log'. Ranges not given in SPEC (ADSR/AR times, rate)
  // are the ui agent's choice and are documented in the report.
  var PORT_LABEL = {
    fm: 'FM', sync: 'SYNC', mode_trig: 'TOGGLE',
    saw: 'SAW', sqr: 'SQUARE', tri: 'TRIANGLE',
    in1: 'IN 1', in2: 'IN 2', in3: 'IN 3', in4: 'IN 4', out: 'OUT',
    cv1: 'CV 1', cv2: 'CV 2', cv3: 'CV 3', cv4: 'CV 4',
    'in': 'IN', cutoff_cv: 'CUTOFF', fold_cv: 'FOLD', time_cv: 'TIME',
    outL: 'LEFT', outR: 'RIGHT', gate: 'GATE', env: 'ENVELOPE', trig: 'TRIGGER',
    clock: 'CLOCK', cv: 'CV', L: 'LEFT', R: 'RIGHT'
  };

  var RATE = { key: 'rate', label: 'RATE', min: 0.1, max: 20, curve: 'log', def: 2 };

  var DEFS = {
    VCO: {
      ins: ['fm', 'sync', 'mode_trig'], outs: ['saw', 'sqr', 'tri'],
      params: [
        { key: 'freq', label: 'FREQUENCY', min: 20, max: 2000, curve: 'log', def: 220, vcoFreq: true },
        { key: 'fmAmt', label: 'FM AMOUNT', min: 0, max: 1, curve: 'lin', def: 0.3 }
      ]
    },
    MIXVCA: {
      // jacks as a 4-column grid: IN 1-4 on the first row, CV 1-4 under them, OUT beside
      ins: ['in1', 'in2', 'in3', 'in4', 'cv1', 'cv2', 'cv3', 'cv4'], outs: ['out'], portGrid: 4,
      params: [
        { key: 'lvl1', label: 'LEVEL 1', min: 0, max: 1, curve: 'lin', def: 0.8 },
        { key: 'lvl2', label: 'LEVEL 2', min: 0, max: 1, curve: 'lin', def: 0.8 },
        { key: 'lvl3', label: 'LEVEL 3', min: 0, max: 1, curve: 'lin', def: 0.8 },
        { key: 'lvl4', label: 'LEVEL 4', min: 0, max: 1, curve: 'lin', def: 0.8 }
      ]
    },
    LPF: {
      ins: ['in', 'cutoff_cv'], outs: ['out'],
      params: [
        { key: 'cutoff', label: 'CUTOFF', min: 20, max: 20000, curve: 'log', def: 2000 },
        { key: 'res', label: 'RESONANCE', min: 0, max: 1, curve: 'lin', def: 0.2 },
        { key: 'cvAmt', label: 'CV AMOUNT', min: 0, max: 1, curve: 'lin', def: 0.5 }
      ]
    },
    FOLD: {
      ins: ['in', 'fold_cv'], outs: ['out'],
      params: [
        { key: 'fold', label: 'FOLD', min: 0, max: 1, curve: 'lin', def: 0.3 },
        { key: 'cvAmt', label: 'CV AMOUNT', min: 0, max: 1, curve: 'lin', def: 0.5 }
      ]
    },
    DELAY: {
      ins: ['in', 'time_cv'], outs: ['outL', 'outR'],
      params: [
        { key: 'time', label: 'TIME', min: 0.05, max: 1.5, curve: 'log', def: 0.3 },
        { key: 'fb', label: 'FEEDBACK', min: 0, max: 0.9, curve: 'lin', def: 0.4 },
        { key: 'mix', label: 'MIX', min: 0, max: 1, curve: 'lin', def: 0.4 }
      ]
    },
    ADSR: {
      ins: ['gate'], outs: ['env'],
      params: [
        { key: 'a', label: 'ATTACK', min: 0.001, max: 2, curve: 'log', def: 0.01 },
        { key: 'd', label: 'DECAY', min: 0.001, max: 2, curve: 'log', def: 0.2 },
        { key: 's', label: 'SUSTAIN', min: 0, max: 1, curve: 'lin', def: 0.6 },
        { key: 'r', label: 'RELEASE', min: 0.001, max: 3, curve: 'log', def: 0.3 }
      ]
    },
    AR: {
      ins: ['trig'], outs: ['env'],
      params: [
        { key: 'a', label: 'ATTACK', min: 0.001, max: 2, curve: 'log', def: 0.01 },
        { key: 'r', label: 'RELEASE', min: 0.001, max: 3, curve: 'log', def: 0.3 }
      ]
    },
    SEQ5: { ins: ['clock'], outs: ['cv', 'gate'], params: [RATE], seq: true },
    DRAW: { ins: [], outs: ['cv'], params: [RATE], draw: true }
  };
  // old id of the mixer (before the audio engine renamed it): same panel, same jacks
  DEFS.MIX4 = DEFS.MIXVCA;
  var TITLE = { MIXVCA: 'MIX VCA', MIX4: 'MIX VCA' };

  var FREQ_RANGE = { vco: [20, 2000], lfo: [0.05, 20] };

  /* ---------- colour: HSB fixed-phase family around coral H=12 ---------- */
  var BASE_HUE = 12 / 360;
  var CABLE_OFFSETS = [0, 0.5, 0.333, -0.333, 0.083, -0.083];
  function hsb(h, s, b) {
    h = ((h % 1) + 1) % 1;
    var i = Math.floor(h * 6), f = h * 6 - i;
    var p = b * (1 - s), q = b * (1 - f * s), t = b * (1 - (1 - f) * s);
    var r, g, bl;
    switch (i % 6) {
      case 0: r = b; g = t; bl = p; break;
      case 1: r = q; g = b; bl = p; break;
      case 2: r = p; g = b; bl = t; break;
      case 3: r = p; g = q; bl = b; break;
      case 4: r = t; g = p; bl = b; break;
      default: r = b; g = p; bl = q;
    }
    return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(bl * 255) + ')';
  }
  // theme colours drawn from JS (canvas, SVG cables) come from CSS custom properties on the
  // panel root; cached until the page theme changes (window 'mf-theme' event)
  var themeCache = null;
  function themeVals() {
    if (themeCache) return themeCache;
    var cs = root ? getComputedStyle(root) : null;
    function v(name, fb) { var s = cs ? cs.getPropertyValue(name).trim() : ''; return s || fb; }
    function n(name, fb) { var x = parseFloat(v(name, '')); return isNaN(x) ? fb : x; }
    themeCache = {
      grid: v('--mfp-draw-grid', '#303030'),
      stroke: v('--mfp-draw-stroke', '#e8846c'),
      cs: n('--mfp-cable-s', 0.5),
      cb: n('--mfp-cable-b', 0.92),
      shadow: v('--mfp-cable-shadow', '#000000'),
      shadowOp: n('--mfp-cable-shadow-op', 0.5)
    };
    return themeCache;
  }
  function cableColor(i) {
    var t = themeVals();
    return hsb(BASE_HUE + CABLE_OFFSETS[i % CABLE_OFFSETS.length], t.cs, t.cb);
  }

  /* ---------- helpers ---------- */
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function toNorm(p, v) {
    if (p.curve === 'log') return clamp(Math.log(v / p.min) / Math.log(p.max / p.min), 0, 1);
    return clamp((v - p.min) / (p.max - p.min), 0, 1);
  }
  function fromNorm(p, n) {
    n = clamp(n, 0, 1);
    if (p.curve === 'log') return p.min * Math.pow(p.max / p.min, n);
    return p.min + (p.max - p.min) * n;
  }
  function sineShape() {
    var a = [];
    for (var i = 0; i < SHAPE_N; i++) a.push(0.5 + 0.5 * Math.sin(2 * Math.PI * i / SHAPE_N));
    return a;
  }
  function cloneParams(params) {
    var o = {};
    for (var k in params) {
      var v = params[k];
      if (v && typeof v === 'object' && typeof v.length === 'number') o[k] = Array.prototype.slice.call(v);
      else o[k] = v;
    }
    return o;
  }
  function cap(target, id) { try { target.setPointerCapture(id); } catch (e) { /* pointer already gone */ } }
  function sameEnd(a, b) { return a.mod === b.mod && a.port === b.port; }

  /* ---------- state ---------- */
  // svgEl/cableLayer: panel-level overlay (cables that reach the OUT module in the footer + drag preview)
  // csvgEl/cLayer: overlay inside the scrolling case (module-to-module cables, scrolls with the content)
  var root = null, scrollEl = null, caseEl = null, railEls = [], footEl = null, svgEl = null, cableLayer = null, tempPath = null;
  var csvgEl = null, cLayer = null;
  var opts = {};
  var modules = [];
  var cables = [];
  var jackEls = {};          // "mod:port" -> element
  var enabled = true;
  var redrawQueued = false;
  var drag = null;           // active cable drag
  var nextColor = 0;         // stable per-cable colour index (not part of Patch)

  function key(mod, port) { return mod + ':' + port; }

  function getPatch() {
    return {
      modules: modules.map(function (m) { return { id: m.id, type: m.type, params: cloneParams(m.params) }; }),
      cables: cables.map(function (c) {
        return { from: { mod: c.from.mod, port: c.from.port }, to: { mod: c.to.mod, port: c.to.port } };
      })
    };
  }

  function emitChange() {
    if (opts.onChange) { try { opts.onChange(getPatch()); } catch (e) { console.error(e); } }
  }
  function emitParam(mod, k, v) {
    var A = window.MFAudio;
    if (A && typeof A.previewParam === 'function') {
      try { A.previewParam(mod.id, k, (v && typeof v === 'object') ? v.slice() : v); } catch (e) { console.error(e); }
    }
    emitChange();
  }

  /* ---------- double-tap detector (shared) ---------- */
  function makeTapper() {
    var last = 0, lx = 0, ly = 0, lidx = -1;
    return function (x, y, idx) {
      var now = Date.now();
      var hit = (now - last) < DOUBLE_TAP_MS && Math.abs(x - lx) < TAP_SLOP * 2 && Math.abs(y - ly) < TAP_SLOP * 2 && idx === lidx;
      last = hit ? 0 : now; lx = x; ly = y; lidx = idx;
      return hit;
    };
  }

  /* ---------- parameter range (VCO freq follows the mode) ---------- */
  function paramDef(mod, p) {
    if (!p.vcoFreq) return p;
    var r = FREQ_RANGE[mod.params.mode === 'lfo' ? 'lfo' : 'vco'];
    return { key: p.key, label: p.label, min: r[0], max: r[1], curve: 'log', def: p.def };
  }

  /* ---------- rotary knob ---------- */
  // dial in a 0..100 viewBox; angles in degrees clockwise from 12 o'clock
  function polar(r, deg) {
    var a = deg * Math.PI / 180;
    return { x: 50 + r * Math.sin(a), y: 50 - r * Math.cos(a) };
  }
  function arcD(r, d0, d1) {
    var a = polar(r, d0), b = polar(r, d1);
    return 'M' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) +
      ' A' + r + ' ' + r + ' 0 ' + ((d1 - d0) > 180 ? 1 : 0) + ' 1 ' + b.x.toFixed(2) + ' ' + b.y.toFixed(2);
  }

  function buildKnob(parent, mod, p) {
    var k = el('div', 'mfp-knob', parent);
    k.setAttribute('role', 'slider');
    k.setAttribute('aria-label', p.label);
    var dial = svg('svg', { 'class': 'mfp-kdial', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, k);
    svg('path', { 'class': 'mfp-ktrack', d: arcD(42, ARC_START, ARC_START + ARC_SWEEP) }, dial);
    var val = svg('path', { 'class': 'mfp-kval' }, dial);
    svg('circle', { 'class': 'mfp-kbody', cx: 50, cy: 50, r: 31 }, dial);
    var ptr = svg('line', { 'class': 'mfp-kptr', x1: 50, y1: 50, x2: 50, y2: 22 }, dial);
    var lab = el('span', 'mfp-klabel', k);
    lab.textContent = p.label;
    var initial = mod.params[p.key];
    function refresh() {
      var d = paramDef(mod, p);
      var n = toNorm(d, mod.params[p.key]);
      var deg = ARC_START + ARC_SWEEP * n;
      val.setAttribute('d', n > 0.002 ? arcD(42, ARC_START, deg) : '');
      var a = polar(9, deg), b = polar(29, deg);
      ptr.setAttribute('x1', a.x.toFixed(2)); ptr.setAttribute('y1', a.y.toFixed(2));
      ptr.setAttribute('x2', b.x.toFixed(2)); ptr.setAttribute('y2', b.y.toFixed(2));
      k.setAttribute('aria-valuenow', String(Math.round(n * 100)));
    }
    function set(n) {
      var d = paramDef(mod, p);
      mod.params[p.key] = fromNorm(d, n);
      refresh();
      emitParam(mod, p.key, mod.params[p.key]);
    }
    var tap = makeTapper();
    var g = null;
    k.addEventListener('pointerdown', function (e) {
      if (!enabled || e.button > 0) return;
      e.preventDefault();
      cap(k, e.pointerId);
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, locked: false, moved: false };
    });
    k.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      e.preventDefault();
      if (!g.locked) {
        if (Math.abs(e.clientX - g.x0) < KNOB_THRESH && Math.abs(e.clientY - g.y0) < KNOB_THRESH) return;
        g.locked = true;
        k.classList.add('mfp-active');
      }
      // vertical (up = more) and horizontal (right = more) combined: the larger delta wins
      var mx = e.clientX - g.lx, my = g.ly - e.clientY;
      g.lx = e.clientX; g.ly = e.clientY;
      var dlt = Math.abs(mx) > Math.abs(my) ? mx : my;
      if (Math.abs(e.clientX - g.x0) > TAP_SLOP || Math.abs(e.clientY - g.y0) > TAP_SLOP) g.moved = true;
      if (!dlt) return;
      var d = paramDef(mod, p);
      set(toNorm(d, mod.params[p.key]) + dlt / KNOB_TRAVEL * (e.shiftKey ? 0.1 : 1));
    });
    function end(e) {
      if (!g || e.pointerId !== g.id) return;
      var wasTap = !g.moved && Math.abs(e.clientX - g.x0) < TAP_SLOP && Math.abs(e.clientY - g.y0) < TAP_SLOP;
      g = null;
      k.classList.remove('mfp-active');
      if (e.type === 'pointerup' && wasTap && tap(e.clientX, e.clientY, 0)) {
        var dv = initial != null ? initial : p.def;
        var d = paramDef(mod, p);
        set(toNorm(d, clamp(dv, d.min, d.max)));
      }
    }
    k.addEventListener('pointerup', end);
    k.addEventListener('pointercancel', end);
    refresh();
    return { el: k, refresh: refresh };
  }

  // Size the knob grids to the space each module has left under its jacks: pick the column
  // count that gives the largest dial while every label still fits its cell.
  function fitKnobs() {
    if (!caseEl) return;
    var grids = caseEl.querySelectorAll('.mfp-knobs.mfp-fit');
    for (var i = 0; i < grids.length; i++) {
      var gEl = grids[i];
      var w = gEl.clientWidth, h = gEl.clientHeight;
      var cells = gEl.children, n = cells.length;
      if (!n || !w || !h) continue;
      var lw = 0;
      for (var j = 0; j < n; j++) {
        var l = cells[j].querySelector('.mfp-klabel');
        if (l) lw = Math.max(lw, l.scrollWidth);
      }
      var best = 1, bestD = -1;
      for (var c = 1; c <= Math.min(n, 4); c++) {
        var r = Math.ceil(n / c);
        var cw = w / c;
        if (c > 1 && cw < lw + 4) break;
        var dd = Math.min(cw - 6, h / r - KNOB_LABEL_H - 6, KNOB_MAX);
        if (dd > bestD + 0.5) { bestD = dd; best = c; }
      }
      gEl.style.setProperty('--mfp-kcols', String(best));
      gEl.style.setProperty('--mfp-knob', Math.floor(clamp(bestD, KNOB_MIN, KNOB_MAX)) + 'px');
    }
  }

  /* ---------- SEQ5: one-finger sweep across 5 vertical faders ---------- */
  function buildSeq(parent, mod) {
    if (!mod.params.steps || mod.params.steps.length !== 5) {
      var s = [];
      for (var i = 0; i < 5; i++) s.push(mod.params.steps && mod.params.steps[i] != null ? clamp(+mod.params.steps[i], 0, 1) : 0.5);
      mod.params.steps = s;
    } else {
      mod.params.steps = Array.prototype.slice.call(mod.params.steps);
    }
    var initialSteps = mod.params.steps.slice();
    var box = el('div', 'mfp-seq', parent);
    var fills = [], cells = [];
    for (var j = 0; j < 5; j++) {
      var c = el('div', 'mfp-step', box);
      fills.push(el('div', 'mfp-fill', c));
      var l = el('span', 'mfp-slabel', c); l.textContent = String(j + 1);
      cells.push(c);
    }
    function refresh() {
      for (var k = 0; k < 5; k++) fills[k].style.height = (mod.params.steps[k] * 100) + '%';
    }
    function hitIndex(x, r) {
      return clamp(Math.floor((x - r.left) / (r.width / 5)), 0, 4);
    }
    function valueAt(y, r) {
      // value measured inside the step cell (exclude 1px borders)
      return clamp(1 - (y - r.top - 1) / Math.max(1, r.height - 2), 0, 1);
    }
    var tap = makeTapper();
    var g = null;
    function apply(e) {
      var r = box.getBoundingClientRect();
      var idx = hitIndex(e.clientX, r);
      var v = valueAt(e.clientY, r);
      // interpolate across skipped faders on fast sweeps
      if (g.lastIdx != null && Math.abs(idx - g.lastIdx) > 1) {
        var dir = idx > g.lastIdx ? 1 : -1;
        for (var k = g.lastIdx + dir; k !== idx; k += dir) {
          var t = (k - g.lastIdx) / (idx - g.lastIdx);
          mod.params.steps[k] = g.lastV + (v - g.lastV) * t;
        }
      }
      mod.params.steps[idx] = v;
      for (var q = 0; q < 5; q++) cells[q].classList.toggle('mfp-active', q === idx);
      g.lastIdx = idx; g.lastV = v;
      refresh();
      emitParam(mod, 'steps', mod.params.steps);
    }
    box.addEventListener('pointerdown', function (e) {
      if (!enabled || e.button > 0) return;
      e.preventDefault();
      cap(box, e.pointerId);
      var r = box.getBoundingClientRect();
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastIdx: null, lastV: 0, moved: false, idx0: hitIndex(e.clientX, r),
            prev: mod.params.steps.slice() };
      apply(e);
    });
    box.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      if (Math.abs(e.clientX - g.x0) > TAP_SLOP || Math.abs(e.clientY - g.y0) > TAP_SLOP) g.moved = true;
      apply(e);
    });
    function end(e) {
      if (!g || e.pointerId !== g.id) return;
      var idx0 = g.idx0, wasTap = !g.moved, prev = g.prev;
      g = null;
      for (var q = 0; q < 5; q++) cells[q].classList.remove('mfp-active');
      if (e.type === 'pointerup' && wasTap && tap(e.clientX, e.clientY, idx0)) {
        mod.params.steps = prev;   // undo the first tap's set, then reset
        mod.params.steps[idx0] = initialSteps[idx0];
        refresh();
        emitParam(mod, 'steps', mod.params.steps);
      }
    }
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    refresh();
    return { refresh: refresh };
  }

  /* ---------- DRAW: finger-drawn 64-point shape ---------- */
  var drawCanvases = [];
  function buildDraw(parent, mod) {
    var src = mod.params.shape;
    if (src && src.length === SHAPE_N) {
      var a = [];
      for (var i = 0; i < SHAPE_N; i++) a.push(clamp(+src[i] || 0, 0, 1));
      mod.params.shape = a;
    } else {
      mod.params.shape = sineShape();
    }
    var cv = el('canvas', 'mfp-draw', parent);
    var ctx = cv.getContext('2d');
    function paint() {
      var r = cv.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      ctx.clearRect(0, 0, w, h);
      var pad = 3 * dpr;
      var sh = mod.params.shape;
      // centre line
      var tv = themeVals();
      ctx.strokeStyle = tv.grid; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      var acc = tv.stroke;
      ctx.beginPath();
      for (var k = 0; k < SHAPE_N; k++) {
        var x = (k + 0.5) / SHAPE_N * w;
        var y = pad + (1 - sh[k]) * (h - 2 * pad);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = acc; ctx.lineWidth = 2 * dpr; ctx.lineJoin = 'round';
      ctx.stroke();
    }
    function sample(e) {
      var r = cv.getBoundingClientRect();
      var fx = clamp((e.clientX - r.left) / r.width, 0, 0.99999);
      return { i: Math.floor(fx * SHAPE_N), v: clamp(1 - (e.clientY - r.top) / r.height, 0, 1) };
    }
    var g = null;
    function write(s) {
      var sh = mod.params.shape;
      if (g.last) {
        var a = g.last, n = Math.abs(s.i - a.i);
        for (var k = 0; k <= n; k++) {
          var t = n === 0 ? 1 : k / n;
          sh[a.i + (s.i > a.i ? k : -k)] = a.v + (s.v - a.v) * t;
        }
      } else {
        sh[s.i] = s.v;
      }
      g.last = s;
      paint();
      emitParam(mod, 'shape', sh);
    }
    cv.addEventListener('pointerdown', function (e) {
      if (!enabled || e.button > 0) return;
      e.preventDefault();
      cap(cv, e.pointerId);
      g = { id: e.pointerId, last: null };
      write(sample(e));
    });
    cv.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      // coalesced events give every intermediate sample on fast strokes
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (list && list.length) { for (var k = 0; k < list.length; k++) write(sample(list[k])); }
      else write(sample(e));
    });
    function end(e) { if (g && e.pointerId === g.id) g = null; }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    drawCanvases.push(paint);
    return { refresh: paint };
  }

  /* ---------- jacks ---------- */
  function buildPort(parent, modId, port, dir) {
    var wrap = el('div', 'mfp-port', parent);
    var j = el('div', 'mfp-jack', wrap);
    j.setAttribute('data-dir', dir);
    j.setAttribute('data-mod', modId);
    j.setAttribute('data-port', port);
    var l = el('span', 'mfp-plabel', wrap);
    l.textContent = PORT_LABEL[port] || port.toUpperCase();
    jackEls[key(modId, port)] = j;
    j.addEventListener('pointerdown', onJackDown);
    return j;
  }

  function buildModule(mod, label, rail) {
    var def = DEFS[mod.type];
    var box = el('div', 'mfp-mod', rail);
    box.setAttribute('data-mod', mod.id);
    box.setAttribute('data-type', mod.type);
    var hpW = (HP[mod.type] || 8) * HP_PX;
    box.style.width = hpW + 'px';
    var head = el('div', 'mfp-head', box);
    var t = el('span', 'mfp-title', head); t.textContent = label;
    var refreshers = [];

    if (mod.type === 'VCO') {
      if (mod.params.mode !== 'lfo') mod.params.mode = 'vco';
      var mb = el('button', 'mfp-mode', head);
      mb.type = 'button';
      var paintMode = function () {
        var lfo = mod.params.mode === 'lfo';
        mb.textContent = lfo ? 'LFO' : 'VCO';
        mb.classList.toggle('mfp-lfo', lfo);
      };
      paintMode();
      mb.addEventListener('click', function () {
        if (!enabled) return;
        var fp = def.params[0];
        var oldDef = paramDef(mod, fp);
        var n = toNorm(oldDef, mod.params.freq);
        mod.params.mode = mod.params.mode === 'lfo' ? 'vco' : 'lfo';
        mod.params.freq = fromNorm(paramDef(mod, fp), n);   // keep knob position, remap range
        paintMode();
        refreshers.forEach(function (r) { r(); });
        emitParam(mod, 'mode', mod.params.mode);
        emitParam(mod, 'freq', mod.params.freq);
      });
    }

    var ins = def.ins, outs = def.outs;
    // SEQ5 / DRAW: the RATE knob sits beside the jacks so the editor keeps the free height
    var inline = !!(def.seq || def.draw);
    var jrow = inline ? el('div', 'mfp-jrow', box) : null;
    var ports = el('div', 'mfp-ports', jrow || box);
    var portW = hpW - MOD_CHROME - (inline ? KNOB_INLINE + 16 : 0);
    if (def.portGrid) {
      // inputs as a grid (MIX VCA: IN 1-4 over CV 1-4), output group beside it
      ports.classList.add('mfp-pgrid');
      ports.style.setProperty('--mfp-pcols', String(def.portGrid));
    } else if ((ins.length + outs.length) * JACK_HIT > portW) {
      // jacks on one row when they fit the panel width, otherwise inputs row + outputs row
      ports.classList.add('mfp-two');
    }
    ports.style.setProperty('--mfp-in-n', String(Math.max(1, def.portGrid || ins.length)));
    ports.style.setProperty('--mfp-out-n', String(Math.max(1, outs.length)));
    if (ins.length) {
      var gi = el('div', 'mfp-pgroup mfp-in', ports);
      ins.forEach(function (p) { buildPort(gi, mod.id, p, 'in'); });
    }
    var go = el('div', 'mfp-pgroup mfp-out', ports);
    outs.forEach(function (p) { buildPort(go, mod.id, p, 'out'); });

    var pw = el('div', 'mfp-knobs' + (inline ? ' mfp-inline' : ' mfp-fit'), jrow || box);
    def.params.forEach(function (p) {
      if (mod.params[p.key] == null || isNaN(+mod.params[p.key])) mod.params[p.key] = p.def;
      else mod.params[p.key] = +mod.params[p.key];
      var d = paramDef(mod, p);
      mod.params[p.key] = clamp(mod.params[p.key], d.min, d.max);
      var kb = buildKnob(pw, mod, p);
      refreshers.push(kb.refresh);
    });

    if (def.seq) buildSeq(box, mod);
    if (def.draw) buildDraw(box, mod);
  }

  function buildOut() {
    var o = el('div', 'mfp-outmod', footEl);
    var t = el('span', 'mfp-title', o); t.textContent = 'OUT';
    buildPort(o, 'OUT', 'L', 'in');
    buildPort(o, 'OUT', 'R', 'in');
  }

  /* ---------- cable drawing ---------- */
  // centre of a jack relative to originRect. With clipRect, a jack inside the scrolling case
  // that is scrolled out of view horizontally is clamped to the visible edge (off = true).
  function jackCenter(j, originRect, clipRect) {
    var r = j.getBoundingClientRect();
    var x = r.left + r.width / 2 - originRect.left;
    var y = r.top + r.height / 2 - originRect.top;
    var off = false;
    if (clipRect && scrollEl.contains(j)) {
      var lo = clipRect.left - originRect.left, hi = clipRect.right - originRect.left;
      if (x < lo || x > hi) { off = true; x = clamp(x, lo, hi); }
    }
    return { x: x, y: y, off: off };
  }
  function cablePath(a, b, maxY) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var sag = Math.min(90, 18 + dist * 0.28);
    // keep the lowest point of the curve inside its layer (bezier dips ~0.75 * sag)
    var room = (maxY != null ? maxY : 1e4) - 6 - Math.max(a.y, b.y);
    sag = Math.max(0, Math.min(sag, room / 0.75));
    return 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) +
      ' C' + a.x.toFixed(1) + ',' + (a.y + sag).toFixed(1) +
      ' ' + b.x.toFixed(1) + ',' + (b.y + sag).toFixed(1) +
      ' ' + b.x.toFixed(1) + ',' + b.y.toFixed(1);
  }
  function drawCable(layer, c, a, b, col, maxY) {
    var d = cablePath(a, b, maxY);
    var g = svg('g', (a.off || b.off) ? { opacity: 0.35 } : {}, layer);
    var tv = themeVals();
    svg('path', { d: d, 'class': 'mfp-cable', stroke: tv.shadow, 'stroke-width': 6, opacity: tv.shadowOp }, g);
    svg('path', { d: d, 'class': 'mfp-cable', stroke: col }, g);
    if (!a.off) svg('circle', { cx: a.x, cy: a.y, r: 5, fill: col, 'class': 'mfp-cable-end' }, g);
    if (!b.off) svg('circle', { cx: b.x, cy: b.y, r: 5, fill: col, 'class': 'mfp-cable-end' }, g);
    var hit = svg('path', { d: d, 'class': 'mfp-cable-hit' }, g);
    hit.__cable = c;
    hit.addEventListener('pointerdown', onCableDown);
  }
  function redraw() {
    redrawQueued = false;
    if (!root) return;
    var rr = root.getBoundingClientRect();
    var sr = scrollEl.getBoundingClientRect();
    var cr = caseEl.getBoundingClientRect();
    var cw = Math.max(1, caseEl.offsetWidth), ch = Math.max(1, caseEl.offsetHeight);
    svgEl.setAttribute('viewBox', '0 0 ' + rr.width + ' ' + rr.height);
    csvgEl.setAttribute('width', cw);
    csvgEl.setAttribute('height', ch);
    csvgEl.setAttribute('viewBox', '0 0 ' + cw + ' ' + ch);
    while (cableLayer.firstChild) cableLayer.removeChild(cableLayer.firstChild);
    while (cLayer.firstChild) cLayer.removeChild(cLayer.firstChild);
    cables.forEach(function (c, i) {
      var ja = jackEls[key(c.from.mod, c.from.port)], jb = jackEls[key(c.to.mod, c.to.port)];
      if (!ja || !jb) return;
      var col = cableColor(c.ci != null ? c.ci : i);
      if (c.from.mod === 'OUT' || c.to.mod === 'OUT') {
        // footer cable: lives in the panel overlay, module end clamped to the visible case edge
        drawCable(cableLayer, c, jackCenter(ja, rr, sr), jackCenter(jb, rr, sr), col, rr.height);
      } else {
        // module-to-module cable: case coordinates, scrolls with the modules
        drawCable(cLayer, c, jackCenter(ja, cr, null), jackCenter(jb, cr, null), col, ch);
      }
    });
    for (var k in jackEls) jackEls[k].classList.remove('mfp-hot');
    cables.forEach(function (c) {
      var a = jackEls[key(c.from.mod, c.from.port)], b = jackEls[key(c.to.mod, c.to.port)];
      if (a) a.classList.add('mfp-hot');
      if (b) b.classList.add('mfp-hot');
    });
  }
  function queueRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(redraw);
  }

  /* ---------- cable interaction ---------- */
  function jackUnder(x, y) {
    var prev = svgEl.style.display, cprev = csvgEl.style.display;
    svgEl.style.display = 'none';
    csvgEl.style.display = 'none';
    var e = document.elementFromPoint(x, y);
    svgEl.style.display = prev;
    csvgEl.style.display = cprev;
    return e && e.closest ? e.closest('.mfp-jack') : null;
  }

  function startDrag(e, fromEnd, srcEl) {
    svgEl.classList.add('mfp-dragging');
    csvgEl.classList.add('mfp-dragging');
    var col = cableColor(nextColor);
    tempPath = svg('path', { 'class': 'mfp-cable-temp', stroke: col }, svgEl);
    drag = { id: e.pointerId, from: fromEnd, src: srcEl, target: null };
    cap(srcEl, e.pointerId);
    srcEl.addEventListener('pointermove', onDragMove);
    srcEl.addEventListener('pointerup', onDragEnd);
    srcEl.addEventListener('pointercancel', onDragEnd);
    onDragMove(e);
    requestAnimationFrame(autoScrollTick);
  }
  // while a cable is held near the left/right edge of the case, scroll it horizontally
  // so any module can be reached in a single drag (not while the finger is over the footer)
  function autoScrollTick() {
    if (!drag) return;
    var sr = scrollEl.getBoundingClientRect();
    var edge = 44, v = 0, x = drag.cx, y = drag.cy;
    if (y >= sr.top && y <= sr.bottom) {
      if (x < sr.left + edge) v = -Math.min(1, (sr.left + edge - x) / edge);
      else if (x > sr.right - edge) v = Math.min(1, (x - (sr.right - edge)) / edge);
    }
    if (v !== 0) {
      var before = scrollEl.scrollLeft;
      scrollEl.scrollLeft = before + v * 12;
      if (scrollEl.scrollLeft !== before) { redraw(); updateTemp(drag.cx, drag.cy); }
    }
    requestAnimationFrame(autoScrollTick);
  }
  function onDragMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    updateTemp(e.clientX, e.clientY);
    e.preventDefault();
  }
  function updateTemp(cx, cy) {
    drag.cx = cx; drag.cy = cy;
    var rr = root.getBoundingClientRect();
    var a = jackCenter(jackEls[key(drag.from.mod, drag.from.port)], rr, scrollEl.getBoundingClientRect());
    var b = { x: cx - rr.left, y: cy - rr.top };
    var t = jackUnder(cx, cy);
    if (t && t.getAttribute('data-dir') !== 'in') t = null;
    if (drag.target && drag.target !== t) drag.target.classList.remove('mfp-target');
    drag.target = t;
    if (t) {
      t.classList.add('mfp-target');
      b = jackCenter(t, rr, null);
    }
    tempPath.setAttribute('d', cablePath(a, b, rr.height));
  }
  function onDragEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    d.src.removeEventListener('pointermove', onDragMove);
    d.src.removeEventListener('pointerup', onDragEnd);
    d.src.removeEventListener('pointercancel', onDragEnd);
    if (tempPath && tempPath.parentNode) tempPath.parentNode.removeChild(tempPath);
    tempPath = null;
    svgEl.classList.remove('mfp-dragging');
    csvgEl.classList.remove('mfp-dragging');
    var t = e.type === 'pointerup' ? jackUnder(e.clientX, e.clientY) : null;
    if (d.target) d.target.classList.remove('mfp-target');
    var changed = d.removed || false;
    if (t && t.getAttribute('data-dir') === 'in') {
      var to = { mod: t.getAttribute('data-mod'), port: t.getAttribute('data-port') };
      // one cable per input: replace whatever was there
      cables = cables.filter(function (c) { return !sameEnd(c.to, to); });
      cables.push({ from: { mod: d.from.mod, port: d.from.port }, to: to, ci: d.ci != null ? d.ci : nextColor++ });
      changed = true;
    }
    queueRedraw();
    if (changed) emitChange();
  }

  function onJackDown(e) {
    if (!enabled || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    var j = e.currentTarget;
    var end = { mod: j.getAttribute('data-mod'), port: j.getAttribute('data-port') };
    if (j.getAttribute('data-dir') === 'out') {
      startDrag(e, end, j);
      return;
    }
    // input jack: pick up the existing cable (unplug) and re-drag it from its source
    var existing = null;
    for (var i = 0; i < cables.length; i++) if (sameEnd(cables[i].to, end)) existing = cables[i];
    if (!existing) return;
    cables = cables.filter(function (c) { return c !== existing; });
    redraw();
    startDrag(e, existing.from, j);
    drag.removed = true;
    drag.ci = existing.ci;
  }

  function onCableDown(e) {
    if (!enabled || e.button > 0) return;
    // jacks sit under the cable overlay: forward presses that land on a jack
    var j = jackUnder(e.clientX, e.clientY);
    if (j) {
      e.preventDefault();
      onJackDown({ currentTarget: j, pointerId: e.pointerId, button: e.button, clientX: e.clientX, clientY: e.clientY,
                   preventDefault: function () {}, stopPropagation: function () {} });
      return;
    }
    var hit = e.currentTarget, c = hit.__cable;
    var x0 = e.clientX, y0 = e.clientY, id = e.pointerId;
    function up(ev) {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      if (ev.type !== 'pointerup') return;
      if (Math.abs(ev.clientX - x0) > TAP_SLOP || Math.abs(ev.clientY - y0) > TAP_SLOP) return;
      var before = cables.length;
      cables = cables.filter(function (k) { return k !== c; });
      if (cables.length !== before) { redraw(); emitChange(); }
    }
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  /* ---------- build ---------- */
  // fill rail 1 in order while it stays closest to half the total HP; the rest go to rail 2
  function splitRails(list) {
    var total = 0;
    list.forEach(function (m) { total += HP[m.type] || 8; });
    var half = total / 2, sum = 0, cut = 0;
    for (var i = 0; i < list.length; i++) {
      var w = HP[list[i].type] || 8;
      if (i > 0 && sum + w / 2 > half) break;
      sum += w; cut = i + 1;
    }
    return [list.slice(0, cut), list.slice(cut)];
  }

  function rebuild() {
    railEls[0].innerHTML = '';
    railEls[1].innerHTML = '';
    footEl.innerHTML = '';
    jackEls = {};
    drawCanvases = [];
    var counts = {}, seen = {};
    modules.forEach(function (m) { counts[m.type] = (counts[m.type] || 0) + 1; });
    var auto = el('button', 'mfp-btn mfp-auto', footEl);
    auto.type = 'button'; auto.textContent = 'AUTO';
    auto.addEventListener('click', function () { if (enabled && opts.onAuto) opts.onAuto(); });
    var send = el('button', 'mfp-btn mfp-send', footEl);
    send.type = 'button'; send.textContent = 'SEND';
    send.addEventListener('click', function () { if (enabled && opts.onSubmit) opts.onSubmit(getPatch()); });
    buildOut();
    var known = modules.filter(function (m) {
      if (!DEFS[m.type]) { console.warn('MFPatchUI: unknown module type', m.type); return false; }
      return true;
    });
    var rails = splitRails(known);
    rails.forEach(function (list, r) {
      list.forEach(function (m) {
        seen[m.type] = (seen[m.type] || 0) + 1;
        var nm = TITLE[m.type] || m.type;
        buildModule(m, counts[m.type] > 1 ? nm + ' ' + seen[m.type] : nm, railEls[r]);
      });
    });
    requestAnimationFrame(function () {
      fitKnobs();
      drawCanvases.forEach(function (p) { p(); });
      redraw();
    });
  }

  var themeListening = false;
  function onThemeChange() {
    themeCache = null;
    if (!root) return;
    drawCanvases.forEach(function (p) { p(); });
    if (tempPath && drag) tempPath.setAttribute('stroke', cableColor(drag.ci != null ? drag.ci : nextColor));
    queueRedraw();
  }

  function mount(container, o) {
    opts = o || {};
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = el('div', 'mfp', container);
    root.style.setProperty('--mfp-hp', HP_PX + 'px');
    scrollEl = el('div', 'mfp-scroll', root);
    caseEl = el('div', 'mfp-case', scrollEl);
    railEls = [el('div', 'mfp-rail', caseEl), el('div', 'mfp-rail', caseEl)];
    csvgEl = svg('svg', { 'class': 'mfp-cables mfp-case-cables' }, caseEl);
    cLayer = svg('g', {}, csvgEl);
    footEl = el('div', 'mfp-foot', root);
    svgEl = svg('svg', { 'class': 'mfp-cables' }, root);
    cableLayer = svg('g', {}, svgEl);
    scrollEl.addEventListener('scroll', queueRedraw, { passive: true });
    window.addEventListener('resize', queueRedraw);
    if (!themeListening) {
      themeListening = true;
      window.addEventListener('mf-theme', onThemeChange);
    }
    themeCache = null;
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        fitKnobs();
        drawCanvases.forEach(function (p) { p(); });
        queueRedraw();
      });
      ro.observe(root);
      ro.observe(caseEl);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitKnobs(); queueRedraw(); });
    rebuild();
    setEnabled(enabled);
  }

  function setModules(list) {
    modules = (list || []).map(function (m) { return { id: String(m.id), type: m.type, params: cloneParams(m.params || {}) }; });
    cables = [];
    nextColor = 0;
    if (root) { rebuild(); scrollEl.scrollLeft = 0; }
  }

  // Wire a whole patch onto the current panel (AUTO): params of modules that are on the
  // panel are taken over (and pushed to the audio engine like a knob edit), cables are
  // replaced. Modules that are not on the panel and cables to unknown jacks are ignored.
  // Fires onChange once so the preview plays what is shown.
  function setPatch(patch) {
    var byId = {};
    modules.forEach(function (m) { byId[m.id] = m; });
    var A = window.MFAudio;
    ((patch && patch.modules) || []).forEach(function (pm) {
      var m = pm && byId[String(pm.id)];
      if (!m || m.type !== pm.type || !pm.params) return;
      var np = cloneParams(pm.params);
      // VCO "mode" first: a mode change remaps freq into the other range, so the new
      // freq has to be applied after it
      var keys = Object.keys(np).sort(function (x, y) { return (x === 'mode' ? 0 : 1) - (y === 'mode' ? 0 : 1); });
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        var a = m.params[k], b = np[k];
        var same = (a && typeof a === 'object' && b && typeof b === 'object')
          ? JSON.stringify(Array.prototype.slice.call(a)) === JSON.stringify(Array.prototype.slice.call(b))
          : a === b;
        if (same) continue;
        m.params[k] = b;
        if (A && typeof A.previewParam === 'function') {
          try { A.previewParam(m.id, k, (b && typeof b === 'object') ? b.slice() : b); } catch (e) { console.error(e); }
        }
      }
    });
    var ins = {};
    modules.forEach(function (m) { if (DEFS[m.type]) DEFS[m.type].ins.forEach(function (p) { ins[key(m.id, p)] = 1; }); });
    var outsOk = {};
    modules.forEach(function (m) { if (DEFS[m.type]) DEFS[m.type].outs.forEach(function (p) { outsOk[key(m.id, p)] = 1; }); });
    cables = [];
    nextColor = 0;
    ((patch && patch.cables) || []).forEach(function (c) {
      if (!c || !c.from || !c.to) return;
      var from = { mod: String(c.from.mod), port: String(c.from.port) };
      var to = { mod: String(c.to.mod), port: String(c.to.port) };
      if (!outsOk[key(from.mod, from.port)]) return;
      var toOk = to.mod === 'OUT' ? (to.port === 'L' || to.port === 'R') : !!ins[key(to.mod, to.port)];
      if (!toOk) return;
      cables = cables.filter(function (k) { return !sameEnd(k.to, to); });   // one cable per input
      cables.push({ from: from, to: to, ci: nextColor++ });
    });
    if (root) rebuild();     // re-renders knobs/labels from the new params, then redraws cables
    emitChange();
  }

  function setEnabled(b) {
    enabled = !!b;
    if (root) {
      root.classList.toggle('mfp-disabled', !enabled);
      root.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    }
  }

  window.MFPatchUI = {
    mount: mount,
    setModules: setModules,
    getPatch: getPatch,
    setPatch: setPatch,
    setEnabled: setEnabled
  };
})();
