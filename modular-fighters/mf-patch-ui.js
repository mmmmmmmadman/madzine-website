/* Modular Fighters — patch panel UI (owner: ui agent)
   Exposes window.MFPatchUI per SPEC.md. Plain browser script, no imports.
   Requires mf-patch-ui.css. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SHAPE_N = 64;
  var DOUBLE_TAP_MS = 300;
  var TAP_SLOP = 8;

  /* ---------- case geometry (one rail of modules, Eurorack-style HP widths) ---------- */
  var HP_PX = 19;            // 1 HP in CSS px (390px phone shows about 2 modules)
  var JACK_HIT = 48;         // must match --mfp-jack-hit
  var MOD_CHROME = 10;       // module border 2 + horizontal padding 8
  // ADSR / AR are wider than the other envelope-free modules: their oscilloscope strip needs the width
  var HP = { VCO: 9, MIXVCA: 14, MIX4: 14, LPF: 12, FOLD: 9, DELAY: 11, ADSR: 12, AR: 7, SEQ5: 12, DRAW: 10 };
  var AUTO_LOCK_MS = 10000;  // AUTO is locked this long after every new module set (default)
  var autoLockMs = AUTO_LOCK_MS; // per match: a character's special may shorten it (setAutoLockMs)
  var SCOPE_SECS = 2, SCOPE_N = 200;   // oscilloscope history: 2 s, one point per 10 ms
  // engine clamps (mf-audio.js), used by the UI-side fallback clock
  var SEQ_RATE = [0.1, 30], DRAW_RATE = [0.05, 20];

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
    clock: 'CLOCK', cv: 'CV',
    L: 'L', R: 'R'             // the OUT module (user rule 2026-10-22: short, so AUTO's countdown keeps its room)
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

  /* ---------- colour: HSB fixed-phase family around the accent hue (coral H=12 by default) ---------- */
  var DEFAULT_HUE = 12 / 360;
  // CSS colour string -> HSB hue 0..1 (null for greys / unparsable)
  var colorProbe = null;
  function cssHue(str) {
    if (!str) return null;
    if (!colorProbe) { try { colorProbe = document.createElement('canvas').getContext('2d'); } catch (e) { return null; } }
    if (!colorProbe) return null;
    colorProbe.fillStyle = '#000000';
    colorProbe.fillStyle = str;
    var v = String(colorProbe.fillStyle), r, g, b, m;
    if ((m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(v))) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16); }
    else if ((m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(v))) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else return null;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 1) return null;
    var h;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    return ((h / 6) % 1 + 1) % 1;
  }
  // accent hue: the home-screen HUE wheel state (window.MFHue) when present, else the --mfp-acc token
  function accentHue(cs) {
    var H = window.MFHue;
    if (H && H.state && isFinite(H.state.hue)) return ((+H.state.hue % 1) + 1) % 1;
    var h = cs ? cssHue(cs.getPropertyValue('--mfp-acc').trim()) : null;
    return h == null ? DEFAULT_HUE : h;
  }
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
      hue: accentHue(cs),
      fg2: v('--mfp-fg2', '#a8a8a8'),
      acc: v('--mfp-acc', '#e8846c'),
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
    return hsb(t.hue + CABLE_OFFSETS[i % CABLE_OFFSETS.length], t.cs, t.cb);
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
  var root = null, scrollEl = null, caseEl = null, railEl = null, footEl = null, svgEl = null, cableLayer = null, tempPath = null;
  var csvgEl = null, cLayer = null;
  var hbarEl = null, hthumbEl = null, hgrab = null;   // horizontal scroll bar under the row + its active pointer
  var opts = {};
  var modules = [];
  var cables = [];
  var jackEls = {};          // "mod:port" -> element
  var enabled = true;
  var redrawQueued = false;
  var drag = null;           // active cable drag
  var nextColor = 0;         // stable per-cable colour index (not part of Patch)
  var anims = [];            // per-module animators (SEQ5 step, DRAW playhead, ADSR/AR scope)
  var autoBtn = null, lockUntil = 0;

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
      if (!enabled || e.button > 0 || g) return;     // a second finger on the same knob is ignored
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
      if (!enabled || e.button > 0 || g) return;
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
    // current step (animation loop): accent fill + outline, number lit
    var curShown = -2;
    function setCur(idx) {
      if (idx === curShown) return;
      if (curShown >= 0 && cells[curShown]) cells[curShown].classList.remove('mfp-cur');
      if (idx >= 0 && cells[idx]) cells[idx].classList.add('mfp-cur');
      curShown = idx;
    }
    // UI-side clock, used when no live engine graph holds this module
    var fb = { idx: 0, acc: 0 };
    anims.push(function (dt) {
      var st = engineState(mod), idx;
      if (st) {
        idx = st.step;
        if (idx >= 0) { fb.idx = idx; fb.acc = 0; }
      } else {
        if (!inputPatched(mod.id, 'clock')) {
          fb.acc += dt * clamp(+mod.params.rate || RATE.def, SEQ_RATE[0], SEQ_RATE[1]);
          if (fb.acc >= 1) { fb.idx = (fb.idx + Math.floor(fb.acc)) % 5; fb.acc -= Math.floor(fb.acc); }
        }
        idx = fb.idx;
      }
      setCur(idx);
      return true;
    });
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
    var head = null;       // playhead phase 0..1 (null: not drawn)
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
      if (head != null) {
        // playhead + current value dot; x mapping matches the curve (point k at (k + 0.5) / 64)
        var fx = head * (SHAPE_N - 1), i0 = Math.floor(fx), i1 = Math.min(SHAPE_N - 1, i0 + 1);
        var val = sh[i0] + (sh[i1] - sh[i0]) * (fx - i0);
        var px = (fx + 0.5) / SHAPE_N * w, py = pad + (1 - val) * (h - 2 * pad);
        ctx.strokeStyle = tv.fg2; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
        ctx.fillStyle = tv.acc;
        ctx.beginPath(); ctx.arc(px, py, 4.5 * dpr, 0, Math.PI * 2); ctx.fill();
      }
    }
    var fb = { ph: 0 };
    anims.push(function (dt) {
      var st = engineState(mod);
      if (st) fb.ph = st.phase;
      else fb.ph = (fb.ph + dt * clamp(+mod.params.rate || RATE.def, DRAW_RATE[0], DRAW_RATE[1])) % 1;
      head = fb.ph;
      paint();
      return true;
    });
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
      if (!enabled || e.button > 0 || g) return;
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

  /* ---------- ADSR / AR oscilloscope: envelope output scrolling right to left over 2 s ---------- */
  function buildScope(parent, mod) {
    var cv = el('canvas', 'mfp-scope', parent);
    cv.setAttribute('aria-hidden', 'true');
    var c2 = cv.getContext('2d');
    var buf = new Float32Array(SCOPE_N), pos = 0, acc = 0, peak = 0, wasFlat = false;
    var step = SCOPE_SECS / SCOPE_N;
    function paint(flat) {
      var r = cv.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      c2.clearRect(0, 0, w, h);
      var tv = themeVals(), pad = 3 * dpr;
      c2.beginPath();
      if (flat) { c2.moveTo(0, h - pad); c2.lineTo(w, h - pad); }   // idle: flat trace at 0
      for (var k = 0; !flat && k < SCOPE_N; k++) {
        var v = buf[(pos + k) % SCOPE_N];           // oldest at the left, newest at the right
        var x = k / (SCOPE_N - 1) * w, y = pad + (1 - v) * (h - 2 * pad);
        if (k === 0) c2.moveTo(x, y); else c2.lineTo(x, y);
      }
      c2.strokeStyle = tv.stroke; c2.lineWidth = 2 * dpr; c2.lineJoin = 'round';
      c2.stroke();
    }
    anims.push(function (dt) {
      var st = engineState(mod);
      var lv = st ? clamp(+st.level || 0, 0, 1) : 0;
      peak = Math.max(peak, lv);
      acc += dt;
      var n = Math.min(SCOPE_N, Math.floor(acc / step));
      if (n > 0) {
        acc -= n * step;
        for (var k = 0; k < n; k++) { buf[pos] = k === n - 1 ? lv : peak; pos = (pos + 1) % SCOPE_N; }
        peak = 0;
      }
      var flat = true;
      for (var q = 0; q < SCOPE_N; q++) if (buf[q] > 0.002) { flat = false; break; }
      if (!flat || !wasFlat) paint(flat);      // idle: one flat repaint, then nothing
      wasFlat = flat;
      return true;
    });
    drawCanvases.push(function () { wasFlat = false; });
  }

  /* ---------- animation loop (step / playhead / scope / AUTO countdown) ---------- */
  // engine state of a panel module: only the preview graph mirrors the panel
  function engineState(mod) {
    var A = window.MFAudio;
    if (!A || typeof A.getModuleState !== 'function') return null;
    var st = null;
    try { st = A.getModuleState(mod.id); } catch (e) { return null; }
    return st && st.type === mod.type && st.slot === 'preview' ? st : null;
  }
  function inputPatched(modId, port) {
    for (var i = 0; i < cables.length; i++) if (cables[i].to.mod === modId && cables[i].to.port === port) return true;
    return false;
  }
  var loopOn = false, lastFrame = 0, panelVisible = true, reduceMotion = null;
  function loopWanted() {
    return !!(root && root.isConnected && !document.hidden && panelVisible && (anims.length || lockUntil));
  }
  function kick() {
    if (loopOn || !loopWanted()) return;
    loopOn = true;
    lastFrame = 0;
    requestAnimationFrame(frame);
  }
  function frame(ts) {
    if (!loopWanted()) { loopOn = false; return; }
    var now = (typeof ts === 'number' && ts > 0) ? ts : performance.now();
    var dt = lastFrame ? clamp((now - lastFrame) / 1000, 0, 0.25) : 0;
    lastFrame = now;
    for (var i = 0; i < anims.length; i++) { try { anims[i](dt); } catch (e) { console.error(e); } }
    paintLock();
    requestAnimationFrame(frame);
  }

  /* ---------- AUTO lockout: 10 s after each new module set, countdown drawn on the button ---------- */
  function autoLockRemaining() {
    if (!lockUntil) return 0;
    var r = (lockUntil - performance.now()) / 1000;
    if (r <= 0) { lockUntil = 0; return 0; }
    return r;
  }
  function paintLock() {
    if (!autoBtn) return;
    var rem = autoLockRemaining();
    var locked = rem > 0;
    if (autoBtn.__locked !== locked) {
      autoBtn.__locked = locked;
      autoBtn.classList.toggle('mfp-locked', locked);
      autoBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
      if (!locked) { autoBtn.__secs = null; autoBtn.__num.textContent = ''; }
    }
    if (!locked) return;
    var secs = Math.ceil(rem);
    if (autoBtn.__secs !== secs) { autoBtn.__secs = secs; autoBtn.__num.textContent = String(secs); }
    if (reduceMotion === null) reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // remaining share of the lockout; reduced motion: whole-second steps only
    var frac = (reduceMotion ? secs : rem) / (autoLockMs / 1000);
    autoBtn.style.setProperty('--mfp-lock', clamp(frac, 0, 1).toFixed(4));
  }
  function startAutoLock() {
    lockUntil = performance.now() + autoLockMs;
    if (autoBtn) { autoBtn.__locked = null; autoBtn.__secs = null; }
    paintLock();
    kick();
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
    if (mod.type === 'ADSR' || mod.type === 'AR') buildScope(box, mod);

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
    // a cable held while the row scrolls (bar, wheel, auto-scroll): re-aim both ends from the finger
    if (drag && tempPath && drag.cx != null) updateTemp(drag.cx, drag.cy);
    updateHbar();
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
    // listeners on window (capture phase), keyed by pointerId, not on the jack: a panel rebuild
    // (SEND / AUTO firing mid-drag) removes the jack, and a pointerup aimed at a removed element
    // never arrives -> the drag stayed open forever (no new cables, a dashed ghost line). v1.2.2
    window.addEventListener('pointermove', onDragMove, true);
    window.addEventListener('pointerup', onDragEnd, true);
    window.addEventListener('pointercancel', onDragEnd, true);
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
      if (scrollEl.scrollLeft !== before) redraw();     // redraw re-aims the held cable
    }
    requestAnimationFrame(autoScrollTick);
  }

  /* ---------- horizontal scroll bar (the only touch way to scroll the row) ---------- */
  // thumb width = visible share of the rail (min 44px); hidden when everything fits
  function updateHbar() {
    if (!hbarEl || !scrollEl) return;
    var total = scrollEl.scrollWidth, vis = scrollEl.clientWidth;
    if (total <= vis + 1) { hbarEl.classList.add('mfp-off'); return; }
    hbarEl.classList.remove('mfp-off');
    var tw = hbarEl.clientWidth;
    var w = Math.max(44, Math.round(tw * vis / total));
    var x = Math.round((tw - w) * scrollEl.scrollLeft / (total - vis));
    hthumbEl.style.width = w + 'px';
    hthumbEl.style.transform = 'translateX(' + Math.max(0, Math.min(tw - w, x)) + 'px)';
  }
  // thumb centre -> scrollLeft
  function hbarScrollTo(clientX, grabOff) {
    var r = hbarEl.getBoundingClientRect();
    var tw = r.width, w = hthumbEl.offsetWidth;
    var total = scrollEl.scrollWidth, vis = scrollEl.clientWidth;
    if (tw - w <= 0 || total - vis <= 0) return;
    var left = clientX - r.left - grabOff;
    scrollEl.scrollLeft = Math.max(0, Math.min(1, left / (tw - w))) * (total - vis);
    redraw();
  }
  function onHbarDown(e) {
    if (hgrab || e.button > 0) return;             // one finger owns the bar at a time
    e.preventDefault();
    e.stopPropagation();
    var tr = hthumbEl.getBoundingClientRect();
    var off = (e.clientX >= tr.left && e.clientX <= tr.right) ? e.clientX - tr.left : tr.width / 2;
    hgrab = { id: e.pointerId, off: off };
    hbarEl.classList.add('mfp-active');
    cap(hbarEl, e.pointerId);
    hbarScrollTo(e.clientX, off);                  // tap outside the thumb: thumb jumps under the finger
  }
  function onHbarMove(e) {
    if (!hgrab || e.pointerId !== hgrab.id) return;
    e.preventDefault();
    hbarScrollTo(e.clientX, hgrab.off);
  }
  function onHbarEnd(e) {
    if (!hgrab || e.pointerId !== hgrab.id) return;
    hgrab = null;
    hbarEl.classList.remove('mfp-active');
  }
  function onDragMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    updateTemp(e.clientX, e.clientY);
    e.preventDefault();
  }
  function updateTemp(cx, cy) {
    drag.cx = cx; drag.cy = cy;
    var fromJack = jackEls[key(drag.from.mod, drag.from.port)];
    if (!fromJack || !tempPath) { abortDrag(); return; }
    var rr = root.getBoundingClientRect();
    var a = jackCenter(fromJack, rr, scrollEl.getBoundingClientRect());
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
  // safety nets for a pointerup that never reaches us (iOS gesture takeover, tab switch):
  // the last finger leaving the screen, or the page losing focus, ends any held cable
  window.addEventListener('touchend', lastTouchGone, true);
  window.addEventListener('touchcancel', lastTouchGone, true);
  window.addEventListener('blur', function () { if (drag) abortDrag(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && drag) abortDrag(); });
  function lastTouchGone(e) {
    if (!drag || (e.touches && e.touches.length)) return;
    setTimeout(function () { if (drag) abortDrag(); }, 0);   // after the pointerup of the same gesture, if any
  }
  // tear the drag state down without dropping the cable anywhere (rebuild, lost jack)
  function abortDrag() {
    if (!drag) return;
    var d = drag;
    drag = null;
    window.removeEventListener('pointermove', onDragMove, true);
    window.removeEventListener('pointerup', onDragEnd, true);
    window.removeEventListener('pointercancel', onDragEnd, true);
    if (tempPath && tempPath.parentNode) tempPath.parentNode.removeChild(tempPath);
    tempPath = null;
    if (svgEl) svgEl.classList.remove('mfp-dragging');
    if (csvgEl) csvgEl.classList.remove('mfp-dragging');
    if (d.target) d.target.classList.remove('mfp-target');
    // a cable picked up from an input and never put down is gone; tell the engine
    if (d.removed) { queueRedraw(); emitChange(); }
  }
  function onDragEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    window.removeEventListener('pointermove', onDragMove, true);
    window.removeEventListener('pointerup', onDragEnd, true);
    window.removeEventListener('pointercancel', onDragEnd, true);
    if (tempPath && tempPath.parentNode) tempPath.parentNode.removeChild(tempPath);
    tempPath = null;
    svgEl.classList.remove('mfp-dragging');
    csvgEl.classList.remove('mfp-dragging');
    var t = e.type === 'pointerup' ? jackUnder(e.clientX, e.clientY) : null;
    if (d.target) d.target.classList.remove('mfp-target');
    var changed = d.removed || false;
    // the source jack is gone (panel rebuilt under the finger): nothing to connect from
    if (!jackEls[key(d.from.mod, d.from.port)]) t = null;
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
    // the same pointer pressing again means the previous drag ended without us seeing it: self-heal
    if (drag && e.pointerId === drag.id) abortDrag();
    if (!enabled || e.button > 0 || drag) return;    // one cable in the air at a time; other fingers are free
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
  function rebuild() {
    abortDrag();                     // the jack under a held cable is about to disappear
    railEl.innerHTML = '';
    footEl.innerHTML = '';
    jackEls = {};
    drawCanvases = [];
    anims = [];
    var counts = {}, seen = {};
    modules.forEach(function (m) { counts[m.type] = (counts[m.type] || 0) + 1; });
    var auto = el('button', 'mfp-btn mfp-auto', footEl);
    auto.type = 'button';
    auto.setAttribute('aria-label', 'AUTO');
    el('span', 'mfp-lockbar', auto);
    var al = el('span', 'mfp-auto-label', auto); al.textContent = 'AUTO';
    auto.__num = el('span', 'mfp-auto-num', auto);
    autoBtn = auto;
    auto.addEventListener('click', function () {
      if (autoLockRemaining() > 0) return;            // locked after a new module set: no cables
      if (enabled && opts.onAuto) opts.onAuto();
    });
    var send = el('button', 'mfp-btn mfp-send', footEl);
    send.type = 'button'; send.textContent = 'SEND';
    send.addEventListener('click', function () { if (enabled && opts.onSubmit) opts.onSubmit(getPatch()); });
    buildOut();
    var known = modules.filter(function (m) {
      if (!DEFS[m.type]) { console.warn('MFPatchUI: unknown module type', m.type); return false; }
      return true;
    });
    known.forEach(function (m) {
      seen[m.type] = (seen[m.type] || 0) + 1;
      var nm = TITLE[m.type] || m.type;
      buildModule(m, counts[m.type] > 1 ? nm + ' ' + seen[m.type] : nm, railEl);
    });
    paintLock();
    requestAnimationFrame(function () {
      fitKnobs();
      drawCanvases.forEach(function (p) { p(); });
      redraw();
    });
    kick();
  }

  var themeListening = false;
  function onThemeChange() {
    themeCache = null;
    if (!root) return;
    drawCanvases.forEach(function (p) { p(); });
    if (tempPath && drag) tempPath.setAttribute('stroke', cableColor(drag.ci != null ? drag.ci : nextColor));
    queueRedraw();
  }

  /* ---------- scale (short landscape): transform, never CSS zoom ----------
     The rail and the footer are scaled with transform (hit testing and getBoundingClientRect
     follow transforms in every browser; iPhone Safari's zoom hit testing drifted). Transforms
     do not change layout, so negative margins shrink the boxes to the scaled size: the case's
     width, the scroll range and the cable overlays all follow. */
  var scale = 1;
  function setScale(v) {
    v = Math.max(0.4, Math.min(1, +v || 1));
    if (Math.abs(v - scale) < 0.001) return;
    scale = v;
    applyScale();
  }
  function applyScale() {
    if (!railEl || !footEl) return;
    if (scale >= 0.999) {
      railEl.style.transform = ''; railEl.style.transformOrigin = '';
      railEl.style.marginBottom = ''; railEl.style.marginRight = '';
      footEl.style.transform = ''; footEl.style.transformOrigin = '';
      root.style.removeProperty('--mfp-foot-w');
    } else {
      railEl.style.transformOrigin = '0 0';
      railEl.style.transform = 'scale(' + scale + ')';
      railEl.style.marginBottom = Math.round(railEl.offsetHeight * (scale - 1)) + 'px';
      railEl.style.marginRight = Math.round(railEl.offsetWidth * (scale - 1)) + 'px';
      // the footer column (short landscape: absolute at the right, its grid column reserved by --mfp-foot-w)
      footEl.style.transformOrigin = '100% 0';
      footEl.style.transform = 'scale(' + scale + ')';
      root.style.setProperty('--mfp-foot-w', Math.round(footEl.offsetWidth * scale) + 'px');
    }
    queueRedraw();
  }

  function mount(container, o) {
    opts = o || {};
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = el('div', 'mfp', container);
    root.style.setProperty('--mfp-hp', HP_PX + 'px');
    scrollEl = el('div', 'mfp-scroll', root);
    caseEl = el('div', 'mfp-case', scrollEl);
    railEl = el('div', 'mfp-rail', caseEl);
    csvgEl = svg('svg', { 'class': 'mfp-cables mfp-case-cables' }, caseEl);
    cLayer = svg('g', {}, csvgEl);
    hbarEl = el('div', 'mfp-hbar mfp-off', root);
    hbarEl.setAttribute('role', 'scrollbar');
    hbarEl.setAttribute('aria-orientation', 'horizontal');
    hthumbEl = el('div', 'mfp-hthumb', hbarEl);
    hgrab = null;
    hbarEl.addEventListener('pointerdown', onHbarDown);
    hbarEl.addEventListener('pointermove', onHbarMove);
    hbarEl.addEventListener('pointerup', onHbarEnd);
    hbarEl.addEventListener('pointercancel', onHbarEnd);
    footEl = el('div', 'mfp-foot', root);
    svgEl = svg('svg', { 'class': 'mfp-cables' }, root);
    cableLayer = svg('g', {}, svgEl);
    scrollEl.addEventListener('scroll', queueRedraw, { passive: true });
    window.addEventListener('resize', queueRedraw);
    if (!themeListening) {
      themeListening = true;
      window.addEventListener('mf-theme', onThemeChange);
      window.addEventListener('mf-hue', onThemeChange);         // HUE wheel: cables + canvases recolour
      document.addEventListener('visibilitychange', kick);
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
    // pause the animation loop while the panel is off screen (or the screen is hidden)
    panelVisible = true;
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (ents) {
        var e = ents[ents.length - 1];
        panelVisible = !!(e && e.isIntersecting);
        kick();
      });
      io.observe(root);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitKnobs(); queueRedraw(); });
    rebuild();
    setEnabled(enabled);
  }

  function setModules(list) {
    modules = (list || []).map(function (m) { return { id: String(m.id), type: m.type, params: cloneParams(m.params || {}) }; });
    cables = [];
    nextColor = 0;
    if (root) { rebuild(); if (scale < 0.999) applyScale(); scrollEl.scrollLeft = 0; }
    if (modules.length) startAutoLock();
    // after the caller's own follow-up calls (index.html stops the old preview right after
    // setModules): report the new uncabled panel so the engine builds its silent preview
    // graph, which runs the SEQ5 / DRAW clocks and envelopes from the moment they appear
    var mine = modules;
    setTimeout(function () { if (modules === mine && root) emitChange(); }, 0);
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

  /* ---------- renderPatchImage: PNG of a patch, drawn from the data (not a DOM screenshot) ----------
     Used by the KO overlay (DOWNLOAD MY PATCH / DOWNLOAD FOE PATCH). Same house style as the live
     panel: one row of modules at their HP widths, jacks + labels, knob arcs, SEQ5 faders, DRAW curve,
     cables in the current cable colours, OUT module in a footer, a header line with title and date.
     Colours come from the --mfp-* tokens of the requested theme (a hidden .mfp probe; the html
     data-theme attribute is toggled synchronously while the tokens are read, no paint in between). */
  var IMG_HEAD = 48, IMG_RAIL = 270, IMG_FOOT = 80, IMG_SCALE = 2;
  var IMG_TOKENS = ['bg', 'elev', 'panel', 'sunk', 'case', 'line', 'line2', 'rail', 'fg', 'fg2', 'fg3', 'acc', 'acc-dim',
    'acc-glow', 'acc-text', 'acc-line', 'fill', 'on-acc', 'draw-grid', 'draw-stroke', 'cable-s', 'cable-b',
    'cable-shadow', 'cable-shadow-op'];
  function readImageTheme(wanted) {
    var html = document.documentElement;
    var cur = html.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    wanted = wanted === 'light' ? 'light' : (wanted === 'dark' ? 'dark' : cur);
    var probe = el('div', 'mfp');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    if (wanted !== cur) { if (wanted === 'light') html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme'); }
    var out = { theme: wanted };
    try {
      var cs = getComputedStyle(probe);
      IMG_TOKENS.forEach(function (k) { out[k] = cs.getPropertyValue('--mfp-' + k).trim(); });
      out.hue = accentHue(cs);
    } finally {
      if (wanted !== cur) { if (cur === 'light') html.setAttribute('data-theme', 'light'); else html.removeAttribute('data-theme'); }
      probe.parentNode.removeChild(probe);
    }
    out.cs = isNaN(parseFloat(out['cable-s'])) ? 0.5 : parseFloat(out['cable-s']);
    out.cb = isNaN(parseFloat(out['cable-b'])) ? 0.92 : parseFloat(out['cable-b']);
    out.shadowOp = isNaN(parseFloat(out['cable-shadow-op'])) ? 0.5 : parseFloat(out['cable-shadow-op']);
    return out;
  }
  function imgFont(px, spacing) {
    return '300 ' + px + 'px "Barlow Condensed","Noto Sans JP","Noto Sans TC",system-ui,sans-serif';
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  // letter-spaced text (canvas has no reliable letterSpacing everywhere)
  function spacedText(ctx, s, x, y, em, align) {
    var w = 0, i, cw = [];
    for (i = 0; i < s.length; i++) { cw.push(ctx.measureText(s[i]).width); w += cw[i] + (i < s.length - 1 ? em : 0); }
    var sx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.textAlign = 'left';
    for (i = 0; i < s.length; i++) { ctx.fillText(s[i], sx, y); sx += cw[i] + em; }
    return w;
  }
  function ellipsize(ctx, s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function imgJack(ctx, tv, x, y, dir, hot) {
    var r = 33 / 2;
    if (hot) { ctx.fillStyle = tv['acc-glow']; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill(); }
    if (dir === 'in') {
      ctx.fillStyle = tv.fg2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tv.bg; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = tv.acc; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tv.bg; ctx.beginPath(); ctx.arc(x, y, (r - 3) * 0.27, 0, Math.PI * 2); ctx.fill();
    }
  }
  // one port group: jacks spread evenly over [x, x+w], label under each; returns the group height
  function imgPortGroup(ctx, tv, ports, x, y, w, dir, modId, centres, hot, cols) {
    cols = cols || ports.length;
    var rows = Math.ceil(ports.length / cols);
    var cw = w / cols, rowH = 58, i;
    for (i = 0; i < ports.length; i++) {
      var c = i % cols, r = Math.floor(i / cols);
      var cx = x + cw * (c + 0.5), top = y + r * (rowH + 2);
      var jy = top + 24;
      var k = key(modId, ports[i]);
      imgJack(ctx, tv, cx, jy, dir, !!hot[k]);
      centres[k] = { x: cx, y: jy };
      ctx.font = imgFont(16); ctx.fillStyle = dir === 'out' ? tv.fg : tv.fg2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ellipsize(ctx, PORT_LABEL[ports[i]] || ports[i].toUpperCase(), cw - 2), cx, top + 48 - 7 + 8.5);
    }
    return rows * rowH + (rows - 1) * 2 + 1;
  }
  function imgKnob(ctx, tv, cx, cy, d, n) {
    var s = d / 100;
    function pt(r, deg) { var a = deg * Math.PI / 180; return { x: cx + r * s * Math.sin(a), y: cy - r * s * Math.cos(a) }; }
    function rad(deg) { return (deg - 90) * Math.PI / 180; }
    ctx.lineCap = 'round';
    ctx.strokeStyle = tv.line2; ctx.lineWidth = 9 * s;
    ctx.beginPath(); ctx.arc(cx, cy, 42 * s, rad(ARC_START), rad(ARC_START + ARC_SWEEP)); ctx.stroke();
    if (n > 0.002) {
      ctx.strokeStyle = tv.acc;
      ctx.beginPath(); ctx.arc(cx, cy, 42 * s, rad(ARC_START), rad(ARC_START + ARC_SWEEP * n)); ctx.stroke();
    }
    ctx.fillStyle = tv.panel; ctx.strokeStyle = tv.line2; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(cx, cy, 31 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    var deg = ARC_START + ARC_SWEEP * n, a = pt(9, deg), b = pt(29, deg);
    ctx.strokeStyle = tv.fg; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // knob grid in a box (mirror of fitKnobs: the column count giving the largest dial while labels fit)
  function imgKnobGrid(ctx, tv, mod, params, x, y, w, h) {
    var n = params.length;
    if (!n || h < KNOB_MIN) return;
    ctx.font = imgFont(16);
    var lw = 0;
    params.forEach(function (p) { lw = Math.max(lw, ctx.measureText(p.label).width); });
    var best = 1, bestD = -1, c;
    for (c = 1; c <= Math.min(n, 4); c++) {
      var r = Math.ceil(n / c), cw = w / c;
      if (c > 1 && cw < lw + 4) break;
      var dd = Math.min(cw - 6, h / r - KNOB_LABEL_H - 6, KNOB_MAX);
      if (dd > bestD + 0.5) { bestD = dd; best = c; }
    }
    var d = Math.floor(clamp(bestD, KNOB_MIN, KNOB_MAX));
    var rows = Math.ceil(n / best), cellH = d + KNOB_LABEL_H + 4, cellW = w / best;
    var free = Math.max(0, h - rows * cellH), gapY = free / (rows + 1);
    for (var i = 0; i < n; i++) {
      var p = params[i], row = Math.floor(i / best), col = i % best;
      var inRow = Math.min(best, n - row * best);
      var rowX = x + (w - inRow * cellW) / 2;
      var cx = rowX + cellW * (col + 0.5), top = y + gapY + row * (cellH + gapY) + 2;
      var def = paramDef(mod, p), v = mod.params[p.key];
      if (v == null || isNaN(+v)) v = p.def;
      imgKnob(ctx, tv, cx, top + d / 2, d, toNorm(def, clamp(+v, def.min, def.max)));
      ctx.font = imgFont(16); ctx.fillStyle = tv.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ellipsize(ctx, p.label, cellW - 2), cx, top + d + 2 + 9.5);
    }
  }
  function imgModule(ctx, tv, mod, x, y, hpW, h, centres, hot) {
    var def = DEFS[mod.type];
    ctx.fillStyle = tv.elev; ctx.strokeStyle = tv.line2; ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, hpW - 1, h - 1, 2); ctx.fill(); ctx.stroke();
    var ix = x + 5, iw = hpW - MOD_CHROME, cy = y + 4;   // inner box (border 1 + padding 4; top padding 3)
    // head
    ctx.font = imgFont(18); ctx.fillStyle = tv.fg; ctx.textBaseline = 'middle';
    var title = TITLE[mod.type] || mod.type;
    var modeW = mod.type === 'VCO' ? 56 : 0;
    spacedText(ctx, ellipsize(ctx, title, iw - modeW - 4), ix + 2, cy + 13, 1.8, 'left');
    if (mod.type === 'VCO') {
      var lfo = mod.params.mode === 'lfo';
      var mx = ix + iw - 48, my = cy;
      roundRect(ctx, mx + 0.5, my + 0.5, 47, 25, 4);
      if (lfo) { ctx.fillStyle = tv['acc-dim']; ctx.fill(); }
      ctx.strokeStyle = tv['acc-line']; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = imgFont(16); ctx.fillStyle = lfo ? tv.fg : tv['acc-text'];
      spacedText(ctx, lfo ? 'LFO' : 'VCO', mx + 24, my + 13, 1.6, 'center');
    }
    cy += 26 + 4;
    var ins = def.ins, outs = def.outs;
    var inline = !!(def.seq || def.draw);
    var portW = iw - (inline ? KNOB_INLINE + 16 + 4 : 0);
    var portsH;
    if (def.portGrid) {
      var inW = (portW - 3) * def.portGrid / (def.portGrid + outs.length), outW = portW - 3 - inW;
      portsH = imgPortGroup(ctx, tv, ins, ix, cy, inW, 'in', mod.id, centres, hot, def.portGrid);
      ctx.fillStyle = tv.sunk; ctx.strokeStyle = tv.line; ctx.lineWidth = 1;
      roundRect(ctx, ix + inW + 3 + 0.5, cy + 0.5, outW - 1, portsH - 1, 4); ctx.fill(); ctx.stroke();
      imgPortGroup(ctx, tv, outs, ix + inW + 3, cy + (portsH - 58) / 2, outW, 'out', mod.id, centres, hot);
    } else if ((ins.length + outs.length) * JACK_HIT > portW) {
      portsH = imgPortGroup(ctx, tv, ins, ix, cy, portW, 'in', mod.id, centres, hot);
      ctx.fillStyle = tv.sunk; ctx.strokeStyle = tv.line; ctx.lineWidth = 1;
      roundRect(ctx, ix + 0.5, cy + portsH + 2 + 0.5, portW - 1, 58, 4); ctx.fill(); ctx.stroke();
      portsH += 2 + imgPortGroup(ctx, tv, outs, ix, cy + portsH + 2, portW, 'out', mod.id, centres, hot);
    } else {
      var total = ins.length + outs.length, gap = ins.length ? 3 : 0;
      var inW2 = ins.length ? (portW - gap) * ins.length / total : 0, outW2 = portW - gap - inW2;
      if (ins.length) imgPortGroup(ctx, tv, ins, ix, cy, inW2, 'in', mod.id, centres, hot);
      ctx.fillStyle = tv.sunk; ctx.strokeStyle = tv.line; ctx.lineWidth = 1;
      roundRect(ctx, ix + inW2 + gap + 0.5, cy + 0.5, outW2 - 1, 58, 4); ctx.fill(); ctx.stroke();
      portsH = imgPortGroup(ctx, tv, outs, ix + inW2 + gap, cy, outW2, 'out', mod.id, centres, hot);
    }
    var bottom = y + h - 5;
    if (inline) {
      // RATE knob beside the jacks (56 px column, 40 px dial)
      var kx = ix + iw - 56;
      var p0 = def.params[0], v0 = mod.params[p0.key];
      if (v0 == null || isNaN(+v0)) v0 = p0.def;
      imgKnob(ctx, tv, kx + 28, cy + 2 + 20, KNOB_INLINE, toNorm(p0, clamp(+v0, p0.min, p0.max)));
      ctx.font = imgFont(16); ctx.fillStyle = tv.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p0.label, kx + 28, cy + 2 + KNOB_INLINE + 2 + 9.5);
      cy += Math.max(portsH, KNOB_INLINE + KNOB_LABEL_H + 4) + 4;
      var bh = bottom - cy;
      if (def.seq) {
        var steps = mod.params.steps || [], cw = (iw - 12) / 5;
        for (var s = 0; s < 5; s++) {
          var sx = ix + s * (cw + 3), lvl = clamp(+steps[s] || 0, 0, 1);
          ctx.save();
          roundRect(ctx, sx + 0.5, cy + 0.5, cw - 1, bh - 1, 4);
          ctx.fillStyle = tv.sunk; ctx.fill();
          ctx.clip();
          ctx.fillStyle = tv.fill; ctx.fillRect(sx + 1, cy + 1 + (bh - 2) * (1 - lvl), cw - 2, (bh - 2) * lvl);
          ctx.restore();
          roundRect(ctx, sx + 0.5, cy + 0.5, cw - 1, bh - 1, 4); ctx.strokeStyle = tv.line; ctx.lineWidth = 1; ctx.stroke();
          ctx.font = imgFont(16); ctx.fillStyle = tv.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(s + 1), sx + cw / 2, cy + bh - 2 - 9);
        }
      } else {
        roundRect(ctx, ix + 0.5, cy + 0.5, iw - 1, bh - 1, 4);
        ctx.fillStyle = tv.sunk; ctx.fill(); ctx.strokeStyle = tv.line; ctx.lineWidth = 1; ctx.stroke();
        var sh = mod.params.shape;
        if (!sh || sh.length !== SHAPE_N) sh = sineShape();
        ctx.strokeStyle = tv['draw-grid']; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ix + 1, cy + bh / 2); ctx.lineTo(ix + iw - 1, cy + bh / 2); ctx.stroke();
        ctx.beginPath();
        for (var k = 0; k < SHAPE_N; k++) {
          var px = ix + 1 + (k + 0.5) / SHAPE_N * (iw - 2), py = cy + 3 + (1 - clamp(+sh[k] || 0, 0, 1)) * (bh - 6);
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = tv['draw-stroke']; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      }
    } else {
      cy += portsH + 4;
      if (mod.type === 'ADSR' || mod.type === 'AR') {
        roundRect(ctx, ix + 0.5, cy + 0.5, iw - 1, 47, 4);
        ctx.fillStyle = tv.sunk; ctx.fill(); ctx.strokeStyle = tv.line; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = tv['draw-stroke']; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ix + 3, cy + 44); ctx.lineTo(ix + iw - 3, cy + 44); ctx.stroke();
        cy += 48 + 4;
      }
      imgKnobGrid(ctx, tv, mod, def.params, ix, cy, iw, bottom - cy);
    }
  }
  function renderPatchImage(patch, o) {
    o = o || {};
    var tv = readImageTheme(o.theme);
    var mods = (patch && patch.modules || []).filter(function (m) { return m && DEFS[m.type]; });
    var cabs = (patch && patch.cables || []).filter(function (c) { return c && c.from && c.to; });
    var hot = {};
    cabs.forEach(function (c) { hot[key(c.from.mod, c.from.port)] = 1; hot[key(c.to.mod, c.to.port)] = 1; });
    var railW = 0;
    mods.forEach(function (m, i) { railW += (HP[m.type] || 8) * HP_PX + (i ? 3 : 0); });
    var W = Math.max(390, railW + 12), H = IMG_HEAD + IMG_RAIL + 8 + IMG_FOOT;
    var cv = document.createElement('canvas');
    cv.width = W * IMG_SCALE; cv.height = H * IMG_SCALE;
    var ctx = cv.getContext('2d');
    ctx.scale(IMG_SCALE, IMG_SCALE);
    var centres = {};
    function paint() {
      ctx.fillStyle = tv.bg; ctx.fillRect(0, 0, W, H);
      // header
      ctx.textBaseline = 'middle';
      ctx.font = imgFont(20); ctx.fillStyle = tv.fg;
      var title = o.title != null ? String(o.title) : 'MODULAR FIGHTERS';
      var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      ctx.font = imgFont(16); var dw = ctx.measureText(date).width;
      ctx.font = imgFont(20);
      spacedText(ctx, ellipsize(ctx, title, W - 24 - dw - 16), 12, IMG_HEAD / 2, 2, 'left');
      ctx.font = imgFont(16); ctx.fillStyle = tv.fg2; ctx.textAlign = 'right'; ctx.fillText(date, W - 12, IMG_HEAD / 2);
      // case + rail
      var caseY = IMG_HEAD;
      ctx.fillStyle = tv['case']; ctx.fillRect(0, caseY, W, IMG_RAIL + 8);
      var railY = caseY + 4;
      ctx.fillStyle = tv.rail; ctx.fillRect(6, railY, W - 12, 2); ctx.fillRect(6, railY + IMG_RAIL - 2, W - 12, 2);
      var modH = IMG_RAIL - 4 - 6, modY = railY + 2 + 3, mx = 6;
      mods.forEach(function (m) {
        var hpW = (HP[m.type] || 8) * HP_PX;
        imgModule(ctx, tv, m, mx, modY, hpW, modH, centres, hot);
        mx += hpW + 3;
      });
      // footer with the OUT module at the right
      var footY = caseY + IMG_RAIL + 8;
      ctx.fillStyle = tv.line; ctx.fillRect(0, footY, W, 1);
      // centred under the rail so the cables from both ends of the row meet it from above
      var ow = 10 + 44 + 6 + 104 + 8, oh = 64, ox = Math.round((W - ow) / 2), oy = footY + (IMG_FOOT - oh) / 2;
      ctx.fillStyle = tv.elev; ctx.strokeStyle = tv['acc-line']; ctx.lineWidth = 1;
      roundRect(ctx, ox + 0.5, oy + 0.5, ow - 1, oh - 1, 10); ctx.fill(); ctx.stroke();
      ctx.font = imgFont(18); ctx.fillStyle = tv['acc-text']; ctx.textBaseline = 'middle';
      spacedText(ctx, 'OUT', ox + 10, oy + oh / 2, 1.8, 'left');
      ['L', 'R'].forEach(function (p, i) {
        var cx = ox + 10 + 44 + 6 + 26 + i * 52, jy = oy + 3 + 24;
        var k = key('OUT', p);
        imgJack(ctx, tv, cx, jy, 'in', !!hot[k]);
        centres[k] = { x: cx, y: jy };
        ctx.font = imgFont(16); ctx.fillStyle = tv.fg2; ctx.textAlign = 'center';
        ctx.fillText(PORT_LABEL[p], cx, oy + 3 + 48 - 6 + 8.5);
      });
      // cables
      cabs.forEach(function (c, i) {
        var a = centres[key(c.from.mod, c.from.port)], b = centres[key(c.to.mod, c.to.port)];
        if (!a || !b) return;
        var col = hsb(tv.hue + CABLE_OFFSETS[i % CABLE_OFFSETS.length], tv.cs, tv.cb);
        var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
        var sag = Math.min(90, 18 + dist * 0.28);
        var room = H - 6 - Math.max(a.y, b.y);
        sag = Math.max(0, Math.min(sag, room / 0.75));
        ctx.lineCap = 'round';
        ctx.globalAlpha = tv.shadowOp; ctx.strokeStyle = tv['cable-shadow']; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x, a.y + sag, b.x, b.y + sag, b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 0.92; ctx.strokeStyle = col; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x, a.y + sag, b.x, b.y + sag, b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
      });
    }
    var fontsReady = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      fontsReady = Promise.all([
        document.fonts.load('300 18px "Barlow Condensed"'),
        document.fonts.load('300 18px "Noto Sans JP"')
      ]).then(function () { return document.fonts.ready; }).catch(function () {});
    }
    return fontsReady.then(function () {
      paint();
      return new Promise(function (resolve, reject) {
        cv.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('toBlob failed')); }, 'image/png');
      });
    });
  }

  window.MFPatchUI = {
    mount: mount,
    setModules: setModules,
    getPatch: getPatch,
    setPatch: setPatch,
    setEnabled: setEnabled,
    setScale: setScale,                    // 0.4..1: short landscape scales the row + footer (transform)
    autoLockRemaining: autoLockRemaining,    // seconds left of the AUTO lockout (0 = AUTO usable)
    setAutoLockMs: function (ms) { autoLockMs = ms > 0 ? ms : AUTO_LOCK_MS; },
    renderPatchImage: renderPatchImage      // (patch, {theme, title}) -> Promise<Blob image/png>
  };
})();
