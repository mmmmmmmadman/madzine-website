/* Modular Fighters - fight scene, game rules, CPU opponent.
   Exposes window.MFFight. Plain browser script, no modules, no build.
   Fighters are the two line-art videos in assets/ (black on white), keyed to
   alpha and tinted per side each frame. osc always stands on the LEFT and
   faces right; moddict always stands on the RIGHT and faces left. No mirroring. */
(function () {
  'use strict';

  var MAX_HP = 100;
  var COLOR_LEFT = '#e8846c';            // osc (coral)
  var COLOR_RIGHT = 'hsl(215,22%,62%)';  // moddict (cool grey-blue)
  var COLOR_BAR_LOW = 'hsl(0,78%,55%)';
  var COLOR_BG_OVERLAY = 'rgba(0,0,0,0.35)';   // over a user background only (both themes)
  // Theme palettes: dark (default) and light. Fighter line colours are the same in both.
  var THEMES = {
    dark: {
      bg: '#121214',
      text: 'rgba(255,255,255,0.88)',
      dim: 'rgba(255,255,255,0.35)',
      barBg: 'rgba(255,255,255,0.10)',
      floor: 'rgba(255,255,255,0.14)'
    },
    light: {
      bg: '#f4f4f4',
      text: 'rgba(0,0,0,0.88)',
      dim: 'rgba(0,0,0,0.40)',
      barBg: 'rgba(0,0,0,0.10)',
      floor: 'rgba(0,0,0,0.16)'
    }
  };
  var themeName = 'dark';
  var COLOR_BG = THEMES.dark.bg;
  var COLOR_TEXT = THEMES.dark.text;
  var COLOR_DIM = THEMES.dark.dim;
  var COLOR_BAR_BG = THEMES.dark.barBg;
  var COLOR_FLOOR = THEMES.dark.floor;
  var BAR_H = 16;
  var BAR_TOP_MIN = 80;      // keeps the HP bars and their labels clear of the page's 44 px "?" button (top 8..52 px)
  var KEY_PX = 360;          // offscreen keying resolution (square)
  var FIGHTER_H = 0.45;      // fighter frame height as a fraction of canvas height
  var ALPHA_MIN = 40;        // alpha threshold for the content bounding box

  var T_LUNGE = 170;   // ms, attacker moves forward
  var T_HOLD = 110;    // ms, contact
  var T_BACK = 220;    // ms, attacker returns
  var T_SHAKE = 320;   // ms, victim shake + flash
  var T_POP = 900;     // ms, power number
  var T_FALL = 700;    // ms, KO fall

  var SIDES = {
    left: { name: 'osc', src: 'assets/osc.mp4', color: COLOR_LEFT, facing: 1 },
    right: { name: 'moddict', src: 'assets/moddict.mp4', color: COLOR_RIGHT, facing: -1 }
  };

  // ---------------------------------------------------------------- state
  var container = null;
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var W = 0, H = 0;
  var rafId = 0;
  var ro = null;
  var startTime = 0;

  var hp = { me: MAX_HP, foe: MAX_HP };
  var dead = null;          // "me" | "foe" | null
  var koFired = false;
  var koCallbacks = [];
  var koAt = 0;

  var queue = [];           // pending attacks: {who, power}
  var current = null;       // {who, power, t0, applied}
  var shakes = { me: 0, foe: 0 };   // timestamp when shake started (0 = none)
  var pops = [];            // {who, power, t0}
  var fontReady = false;

  var sides = { me: 'left' };       // which side the local player controls
  var fighters = { left: null, right: null };   // keyed video state per side
  var background = null;            // HTMLImageElement | HTMLVideoElement | null
  var gestureHooked = false;
  var rates = { me: 1, foe: 1 };    // persistent video playback rate per player

  function now() { return performance.now(); }

  function sideOf(who) { return who === 'me' ? sides.me : (sides.me === 'left' ? 'right' : 'left'); }
  function whoAt(side) { return side === sides.me ? 'me' : 'foe'; }

  function fontFamily() {
    return fontReady ? '"Barlow Condensed", sans-serif' : 'sans-serif';
  }

  function checkFont() {
    try {
      if (document.fonts && document.fonts.check) {
        fontReady = document.fonts.check('16px "Barlow Condensed"');
        if (!fontReady && document.fonts.ready) {
          var recheck = function () {
            try { fontReady = document.fonts.check('16px "Barlow Condensed"'); } catch (e) { /* ignore */ }
          };
          document.fonts.ready.then(recheck);
          // fonts.ready may already have resolved before the font was requested
          if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', recheck);
        }
      }
    } catch (e) { fontReady = false; }
  }

  // ---------------------------------------------------------------- video fighters
  function tryPlay(v) {
    if (!v || typeof v.play !== 'function') return;
    try {
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* retried on gesture */ });
    } catch (e) { /* ignore */ }
  }

  function playAll() {
    if (fighters.left) tryPlay(fighters.left.source);
    if (fighters.right) tryPlay(fighters.right.source);
    if (background && background.tagName === 'VIDEO') tryPlay(background);
  }

  function hookGesture() {
    if (gestureHooked) return;
    gestureHooked = true;
    var once = function () {
      playAll();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchend', once, true);
      document.removeEventListener('keydown', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchend', once, true);
    document.addEventListener('keydown', once, true);
  }

  function makeVideo(src) {
    var v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('loop', '');
    v.setAttribute('autoplay', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    v.src = src;
    v.style.position = 'absolute';
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.opacity = '0';
    v.style.pointerEvents = 'none';
    v.setAttribute('aria-hidden', 'true');
    return v;
  }

  function makeFighter(side) {
    var def = SIDES[side];
    var keyed = document.createElement('canvas');
    keyed.width = KEY_PX; keyed.height = KEY_PX;
    var flash = document.createElement('canvas');
    flash.width = KEY_PX; flash.height = KEY_PX;
    var f = {
      side: side,
      name: def.name,
      color: def.color,
      facing: def.facing,
      source: null,
      keyed: keyed,
      kctx: keyed.getContext('2d', { willReadFrequently: true }),
      flash: flash,
      fctx: flash.getContext('2d'),
      lastKey: -1,
      hasFrame: false,
      flashDirty: true,
      box: { top: 0, bottom: KEY_PX, left: 0, right: KEY_PX }   // content bbox in keyed px
    };
    fighters[side] = f;
    setFighterSource(side, makeVideo(def.src));
    return f;
  }

  // Replace a fighter's image source (video or any CanvasImageSource, e.g. a canvas).
  function setFighterSource(side, source) {
    var f = fighters[side];
    if (!f) return;
    if (f.source && f.source.tagName === 'VIDEO' && f.source.parentNode) {
      try { f.source.pause(); } catch (e) { /* ignore */ }
      f.source.parentNode.removeChild(f.source);
    }
    f.source = source || null;
    f.lastKey = -1;
    f.hasFrame = false;
    f.flashDirty = true;
    if (source && source.tagName === 'VIDEO') {
      var who = whoAt(side);
      try { source.playbackRate = rates[who]; } catch (e) { /* ignore */ }
      if (container) container.appendChild(source);
      tryPlay(source);
    }
  }

  function sourceReady(src) {
    if (!src) return false;
    if (src.tagName === 'VIDEO') return src.readyState >= 2 && src.videoWidth > 0;
    if (src.tagName === 'IMG') return src.complete && src.naturalWidth > 0;
    return true; // canvas / bitmap
  }

  function sourceKey(src) {
    if (src.tagName === 'VIDEO') return src.currentTime;
    return now(); // non-video sources: re-key every frame
  }

  function parseRGB(col) {
    var c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    var x = c.getContext('2d');
    x.fillStyle = col;
    x.fillRect(0, 0, 1, 1);
    var d = x.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  // Key one frame: white -> transparent, dark lines -> fighter colour.
  function keyFrame(f) {
    var src = f.source;
    if (!sourceReady(src)) return;
    var k = sourceKey(src);
    if (k === f.lastKey) return;
    f.lastKey = k;
    var kc = f.kctx;
    kc.clearRect(0, 0, KEY_PX, KEY_PX);
    try {
      kc.drawImage(src, 0, 0, KEY_PX, KEY_PX);
    } catch (e) { return; }
    var img;
    try { img = kc.getImageData(0, 0, KEY_PX, KEY_PX); } catch (e) { return; }
    var d = img.data;
    if (!f.rgb) f.rgb = parseRGB(f.color);
    var r = f.rgb[0], g = f.rgb[1], b = f.rgb[2];
    var top = KEY_PX, bottom = -1, left = KEY_PX, right = -1;
    var i = 0, px = 0, n = KEY_PX * KEY_PX;
    for (; px < n; px++, i += 4) {
      var lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      var a = 255 - lum;
      if (a < 0) a = 0;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
      if (a >= ALPHA_MIN) {
        var y = (px / KEY_PX) | 0, x = px - y * KEY_PX;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    kc.putImageData(img, 0, 0);
    if (bottom >= 0) {
      f.box.top = top; f.box.bottom = bottom + 1; f.box.left = left; f.box.right = right + 1;
    }
    f.hasFrame = true;
    f.flashDirty = true;
  }

  function flashCanvas(f) {
    if (f.flashDirty) {
      var x = f.fctx;
      x.clearRect(0, 0, KEY_PX, KEY_PX);
      x.globalCompositeOperation = 'source-over';
      x.drawImage(f.keyed, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, KEY_PX, KEY_PX);
      x.globalCompositeOperation = 'source-over';
      f.flashDirty = false;
    }
    return f.flash;
  }

  function setSides(opts) {
    var me = opts && opts.me === 'right' ? 'right' : 'left';
    sides.me = me;
    applyRates();
  }

  // "dark" | "light": canvas background (when no user background), floor, HP text and K.O. text.
  function setTheme(name) {
    var p = THEMES[name] ? name : 'dark';
    themeName = p;
    COLOR_BG = THEMES[p].bg;
    COLOR_TEXT = THEMES[p].text;
    COLOR_DIM = THEMES[p].dim;
    COLOR_BAR_BG = THEMES[p].barBg;
    COLOR_FLOOR = THEMES[p].floor;
  }

  function setBackground(source) {
    if (background && background !== source && background.tagName === 'VIDEO') {
      try { background.pause(); } catch (e) { /* ignore */ }
    }
    if (source && (source.tagName === 'IMG' || source.tagName === 'VIDEO')) {
      background = source;
      if (source.tagName === 'VIDEO') {
        source.muted = true; source.loop = true; source.playsInline = true;
        source.setAttribute('muted', ''); source.setAttribute('playsinline', '');
        tryPlay(source);
      }
    } else {
      background = null;
    }
  }

  function rateFor(power) {
    var p = Math.max(0, Math.min(MAX_HP, Number(power) || 0));
    return Math.max(1, Math.min(3, 1 + (p / MAX_HP) * 2));
  }

  function applyRates() {
    var s, f, who;
    for (s in fighters) {
      f = fighters[s];
      if (!f || !f.source || f.source.tagName !== 'VIDEO') continue;
      who = whoAt(s);
      try { f.source.playbackRate = rates[who]; } catch (e) { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------- canvas
  function resize() {
    if (!container || !canvas) return;
    var r = container.getBoundingClientRect();
    var w = Math.max(1, Math.floor(r.width));
    var h = Math.max(1, Math.floor(r.height));
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function mount(el) {
    if (!el) return;
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    container = el;
    canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', 'fight scene');
    var cs = window.getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (!el.style.height && el.clientHeight === 0) el.style.height = '40vh';
    el.appendChild(canvas);
    ctx = canvas.getContext('2d');
    checkFont();
    resize();
    if (!fighters.left) makeFighter('left'); else if (fighters.left.source && fighters.left.source.tagName === 'VIDEO') el.appendChild(fighters.left.source);
    if (!fighters.right) makeFighter('right'); else if (fighters.right.source && fighters.right.source.tagName === 'VIDEO') el.appendChild(fighters.right.source);
    playAll();
    hookGesture();
    if (ro) { try { ro.disconnect(); } catch (e) { /* ignore */ } ro = null; }
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(el);
    } else {
      window.addEventListener('resize', resize);
    }
    startTime = now();
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- rules
  function other(who) { return who === 'me' ? 'foe' : 'me'; }

  function attack(who, power) {
    if (who !== 'me' && who !== 'foe') return;
    if (dead) return;
    var p = Math.max(0, Math.min(MAX_HP, Math.round(Number(power) || 0)));
    rates[who] = rateFor(p);
    applyRates();
    queue.push({ who: who, power: p });
    if (queue.length > 6) queue.splice(0, queue.length - 6);
  }

  function applyHit(who, power) {
    var victim = other(who);
    hp[victim] = Math.max(0, hp[victim] - power);
    shakes[victim] = now();
    if (hp[victim] <= 0 && !dead) {
      dead = victim;
      koAt = now();
      queue.length = 0;
      cpuStop();
      fireKO(who);
    }
  }

  function fireKO(winner) {
    if (koFired) return;
    koFired = true;
    setTimeout(function () {
      for (var i = 0; i < koCallbacks.length; i++) {
        try { koCallbacks[i](winner); } catch (e) { if (window.console) console.error(e); }
      }
    }, 0);
  }

  function getHP() { return { me: hp.me, foe: hp.foe }; }

  function reset() {
    hp.me = MAX_HP; hp.foe = MAX_HP;
    dead = null; koFired = false; koAt = 0;
    queue.length = 0; current = null;
    shakes.me = 0; shakes.foe = 0;
    pops.length = 0;
    rates.me = 1; rates.foe = 1;
    applyRates();
    startTime = now();
  }

  function onKO(cb) {
    if (typeof cb === 'function') koCallbacks.push(cb);
  }

  // ---------------------------------------------------------------- animation
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeIn(t) { return t * t; }

  function stepQueue(t) {
    if (!current && queue.length) {
      var a = queue.shift();
      current = { who: a.who, power: a.power, t0: t, applied: false };
      pops.push({ who: a.who, power: a.power, t0: t });
      if (pops.length > 4) pops.shift();
    }
    if (current) {
      var e = t - current.t0;
      if (!current.applied && e >= T_LUNGE) {
        current.applied = true;
        applyHit(current.who, current.power);
      }
      if (e >= T_LUNGE + T_HOLD + T_BACK) current = null;
    }
  }

  // Horizontal offset of a fighter due to its own attack lunge (signed, in px).
  function lungeOffset(who, t, reach) {
    if (!current || current.who !== who) return 0;
    var e = t - current.t0;
    var k;
    if (e < T_LUNGE) k = easeOut(e / T_LUNGE);
    else if (e < T_LUNGE + T_HOLD) k = 1;
    else k = 1 - easeIn(Math.min(1, (e - T_LUNGE - T_HOLD) / T_BACK));
    return k * reach;
  }

  function shakeAmount(who, t) {
    if (!shakes[who]) return 0;
    var e = t - shakes[who];
    if (e > T_SHAKE) return 0;
    var k = 1 - e / T_SHAKE;
    return Math.sin(e * 0.09) * 7 * k;
  }

  function flashAmount(who, t) {
    if (!shakes[who]) return 0;
    var e = t - shakes[who];
    if (e > 140) return 0;
    return 1 - e / 140;
  }

  function fallAmount(who, t) {
    if (dead !== who) return 0;
    return easeIn(Math.min(1, (t - koAt) / T_FALL));
  }


  // ---------------------------------------------------------------- drawing
  function drawBackground() {
    var c = ctx;
    c.fillStyle = COLOR_BG;
    c.fillRect(0, 0, W, H);
    if (!background || !sourceReady(background)) return;
    var sw = background.tagName === 'VIDEO' ? background.videoWidth : background.naturalWidth;
    var sh = background.tagName === 'VIDEO' ? background.videoHeight : background.naturalHeight;
    if (!sw || !sh) return;
    var k = Math.max(W / sw, H / sh);
    var dw = sw * k, dh = sh * k;
    try {
      c.drawImage(background, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch (e) { return; }
    c.fillStyle = COLOR_BG_OVERLAY;
    c.fillRect(0, 0, W, H);
  }

  function drawPlaceholder(f, x, floorY, size) {
    // video not decodable / not yet loaded: faint outline where the fighter stands
    var c = ctx;
    c.save();
    c.strokeStyle = f.color;
    c.globalAlpha = 0.35;
    c.lineWidth = 2;
    c.setLineDash([6, 6]);
    c.strokeRect(x - size * 0.25, floorY - size * 0.75, size * 0.5, size * 0.75);
    c.restore();
  }

  function drawFighter(opts) {
    // opts: f (fighter), x (foot centre), floorY, size (frame px), bob, flash, fall, t
    var f = opts.f;
    var c = ctx;
    keyFrame(f);
    c.save();
    c.translate(opts.x, opts.floorY);
    if (opts.fall > 0) {
      // rotate about the feet, fall backwards (away from opponent)
      c.rotate(-f.facing * opts.fall * Math.PI * 0.47);
    }
    c.translate(0, -opts.bob);
    if (!f.hasFrame) {
      c.restore();
      drawPlaceholder(f, opts.x, opts.floorY, opts.size);
      return;
    }
    var size = opts.size;
    var k = size / KEY_PX;
    // place the content bounding box so its bottom sits on the floor and its centre on x
    var cx = (f.box.left + f.box.right) / 2 * k;
    var by = f.box.bottom * k;
    c.drawImage(f.keyed, -cx, -by, size, size);
    if (opts.flash > 0) {
      c.globalAlpha = 0.55 + 0.45 * opts.flash;
      c.drawImage(flashCanvas(f), -cx, -by, size, size);
    }
    c.restore();
  }

  function drawBar(x, y, w, side, alignRight) {
    var c = ctx;
    var who = whoAt(side);
    var name = who === 'me' ? 'YOU' : 'FOE';
    var v = hp[who] / MAX_HP;
    var col = SIDES[side].color;
    if (v < 0.3) col = COLOR_BAR_LOW;

    var fontPx = Math.max(16, Math.round(BAR_H * 1.15));
    c.font = '300 ' + fontPx + 'px ' + fontFamily();
    c.textBaseline = 'alphabetic';
    c.fillStyle = COLOR_TEXT;
    c.textAlign = alignRight ? 'right' : 'left';
    var nameX = alignRight ? x + w : x;
    c.fillText(name, nameX, y - 5);

    c.fillStyle = COLOR_DIM;
    c.textAlign = alignRight ? 'left' : 'right';
    c.fillText(String(hp[who]), alignRight ? x : x + w, y - 5);

    // track
    c.fillStyle = COLOR_BAR_BG;
    c.fillRect(x, y, w, BAR_H);
    // fill
    var fw = Math.round(w * v);
    c.fillStyle = col;
    if (alignRight) c.fillRect(x + w - fw, y, fw, BAR_H);
    else c.fillRect(x, y, fw, BAR_H);
  }

  function drawPops(t, geo) {
    var c = ctx;
    for (var i = pops.length - 1; i >= 0; i--) {
      var p = pops[i];
      var e = t - p.t0;
      if (e > T_POP) { pops.splice(i, 1); continue; }
      var k = e / T_POP;
      var alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      var rise = easeOut(k) * 34;
      var scale = 1 + (k < 0.15 ? (1 - k / 0.15) * 0.6 : 0);
      var side = sideOf(p.who);
      var g = geo[side];
      var fontPx = Math.round(Math.max(22, geo.scale * 30) * scale);
      c.save();
      c.globalAlpha = alpha;
      c.font = '300 ' + fontPx + 'px ' + fontFamily();
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.fillStyle = SIDES[side].color;
      c.fillText(String(p.power), g.x, g.headTop - 10 - rise);
      c.restore();
    }
  }

  function drawKO(t) {
    if (!dead) return;
    var e = t - koAt;
    var k = Math.min(1, e / 500);
    var c = ctx;
    c.save();
    c.globalAlpha = k;
    var fontPx = Math.round(Math.min(W * 0.2, H * 0.24));
    c.font = '300 ' + fontPx + 'px ' + fontFamily();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = COLOR_TEXT;
    c.fillText('K.O.', W / 2, H * 0.3);
    c.restore();
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    if (!ctx || W === 0) return;
    var t = now();
    stepQueue(t);

    var c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();

    var pad = Math.max(12, Math.round(W * 0.04));
    var barTop = Math.max(pad + 24, BAR_TOP_MIN);
    var barW = Math.floor((W - pad * 2 - Math.max(24, W * 0.08)) / 2);

    // floor
    var floorY = Math.round(H * 0.86);
    c.strokeStyle = COLOR_FLOOR;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad, floorY + 0.5);
    c.lineTo(W - pad, floorY + 0.5);
    c.stroke();

    // fighter geometry
    var size = Math.round(H * FIGHTER_H);
    var scale = Math.max(0.6, Math.min(2.2, size / 150, W / 300));
    var reach = Math.min(W * 0.22, size * 0.6);
    var baseLeftX = W * 0.28;
    var baseRightX = W * 0.72;
    var elapsed = (t - startTime) / 1000;

    var whoL = whoAt('left'), whoR = whoAt('right');
    var fL = fighters.left, fR = fighters.right;

    var bobL = dead === whoL ? 0 : Math.sin(elapsed * 3.1) * 3 * scale;
    var bobR = dead === whoR ? 0 : Math.sin(elapsed * 3.1 + 1.7) * 3 * scale;

    // KO fall: body rotates backwards about the feet; slide inward so it stays in view
    var bodyLen = size + 12;
    var fallL = fallAmount(whoL, t);
    var fallR = fallAmount(whoR, t);
    var slideL = fallL * Math.max(0, bodyLen - (baseLeftX - pad));
    var slideR = fallR * Math.max(0, bodyLen - (W - pad - baseRightX));
    var leftX = baseLeftX + lungeOffset(whoL, t, reach) + shakeAmount(whoL, t) + slideL;
    var rightX = baseRightX - lungeOffset(whoR, t, reach) + shakeAmount(whoR, t) - slideR;

    var headTopL = floorY - (fL && fL.hasFrame ? (fL.box.bottom - fL.box.top) * size / KEY_PX : size * 0.75);
    var headTopR = floorY - (fR && fR.hasFrame ? (fR.box.bottom - fR.box.top) * size / KEY_PX : size * 0.75);
    var geo = {
      scale: scale,
      left: { x: leftX, headTop: headTopL - bobL },
      right: { x: rightX, headTop: headTopR - bobR }
    };

    if (fL) drawFighter({ f: fL, x: leftX, floorY: floorY, size: size,
      bob: bobL, flash: flashAmount(whoL, t), fall: fallL });
    if (fR) drawFighter({ f: fR, x: rightX, floorY: floorY, size: size,
      bob: bobR, flash: flashAmount(whoR, t), fall: fallR });

    drawBar(pad, barTop, barW, 'left', false);
    drawBar(W - pad - barW, barTop, barW, 'right', true);
    drawPops(t, geo);
    drawKO(t);
  }


  // ---------------------------------------------------------------- CPU opponent
  var cpuTimer = 0;
  var cpuRunning = false;
  var cpuCallback = null;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function hasAudio() {
    return typeof window.MFAudio === 'object' && window.MFAudio !== null &&
      typeof window.MFAudio.randomModules === 'function';
  }

  var PROC_TYPES = { LPF: 1, FOLD: 1, DELAY: 1, MIX4: 1 };
  var VCO_OUTS = ['saw', 'sqr', 'tri'];

  function fallbackModules() {
    var types = ['VCO', 'VCO', 'LPF', 'FOLD', 'DELAY', 'MIX4', 'ADSR', 'AR', 'SEQ5', 'DRAW'];
    var mods = [];
    for (var i = 0; i < types.length; i++) {
      var p = {};
      switch (types[i]) {
        case 'VCO': p = { freq: 60 + rnd(900), mode: 'vco', fmAmt: Math.random() }; break;
        case 'LPF': p = { cutoff: 200 + rnd(8000), res: Math.random() * 0.8, cvAmt: Math.random() }; break;
        case 'FOLD': p = { fold: Math.random(), cvAmt: Math.random() }; break;
        case 'DELAY': p = { time: 0.1 + Math.random() * 0.9, fb: Math.random() * 0.8, mix: 0.3 + Math.random() * 0.5 }; break;
        case 'MIX4': p = { lvl1: 0.8, lvl2: 0.8, lvl3: 0.8, lvl4: 0.8 }; break;
        case 'ADSR': p = { a: 0.01, d: 0.2, s: 0.5, r: 0.3 }; break;
        case 'AR': p = { a: 0.01, r: 0.3 }; break;
        case 'SEQ5': p = { steps: [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()], rate: 2 + rnd(6) }; break;
        case 'DRAW': {
          var shape = [];
          for (var k = 0; k < 64; k++) shape.push(0.5 + 0.5 * Math.sin(k / 64 * Math.PI * 2));
          p = { shape: shape, rate: 0.2 + Math.random() * 3 };
          break;
        }
      }
      mods.push({ id: 'm' + (i + 1), type: types[i], params: p });
    }
    return mods;
  }

  // Output port of a processing module when used in the audio chain.
  function procOut(mod) {
    return mod.type === 'DELAY' ? 'outL' : 'out';
  }
  function procIn(mod) {
    return mod.type === 'MIX4' ? 'in' + (1 + rnd(4)) : 'in';
  }

  // Modulation outputs a module can provide (as a modulation source).
  function modSourcePort(mod) {
    switch (mod.type) {
      case 'VCO': return pick(VCO_OUTS);
      case 'ADSR': case 'AR': return 'env';
      case 'SEQ5': return pick(['cv', 'gate']);
      case 'DRAW': return 'cv';
    }
    return null;
  }

  // Modulation inputs a module can accept.
  function modTargetPorts(mod) {
    switch (mod.type) {
      case 'VCO': return ['fm', 'mode_trig'];
      case 'LPF': return ['cutoff_cv'];
      case 'FOLD': return ['fold_cv'];
      case 'DELAY': return ['time_cv'];
      case 'ADSR': return ['gate'];
      case 'AR': return ['trig'];
      case 'SEQ5': return ['clock'];
    }
    return [];
  }

  function buildPatch() {
    var mods;
    try {
      mods = hasAudio() ? window.MFAudio.randomModules(10) : null;
    } catch (e) { mods = null; }
    if (!mods || !mods.length) mods = fallbackModules();
    // ensure every module has params object
    for (var i = 0; i < mods.length; i++) {
      if (!mods[i].params || typeof mods[i].params !== 'object') mods[i].params = {};
    }

    var vcos = mods.filter(function (m) { return m.type === 'VCO'; });
    if (!vcos.length) {
      var v = { id: 'mv', type: 'VCO', params: { freq: 110 + rnd(500), mode: 'vco', fmAmt: 0.3 } };
      mods.push(v);
      vcos = [v];
    }
    var src = pick(vcos);
    src.params.mode = 'vco';

    var cables = [];
    var used = {};
    used[src.id] = true;

    // audio chain: VCO -> 0..3 processing -> OUT
    var procs = mods.filter(function (m) { return PROC_TYPES[m.type] && m.id !== src.id; });
    var nProc = Math.min(rnd(4), procs.length);
    var chain = [];
    var pool = procs.slice();
    for (var p = 0; p < nProc; p++) {
      var idx = rnd(pool.length);
      chain.push(pool.splice(idx, 1)[0]);
    }
    var fromMod = src, fromPort = pick(VCO_OUTS);
    for (var c = 0; c < chain.length; c++) {
      var m = chain[c];
      used[m.id] = true;
      cables.push({ from: { mod: fromMod.id, port: fromPort }, to: { mod: m.id, port: procIn(m) } });
      fromMod = m; fromPort = procOut(m);
    }
    cables.push({ from: { mod: fromMod.id, port: fromPort }, to: { mod: 'OUT', port: 'L' } });
    var rPort = (fromMod.type === 'DELAY') ? 'outR' : fromPort;
    cables.push({ from: { mod: fromMod.id, port: rPort }, to: { mod: 'OUT', port: 'R' } });

    // modulation cables: 0..3
    var nMod = rnd(4);
    var sources = mods.filter(function (m) {
      return m.id !== src.id && (m.type === 'VCO' || m.type === 'ADSR' || m.type === 'AR' || m.type === 'SEQ5' || m.type === 'DRAW');
    });
    var chainTargets = [src].concat(chain);
    var tries = 0;
    var seen = {};
    while (nMod > 0 && sources.length && tries < 20) {
      tries++;
      var s = pick(sources);
      // prefer targets in the audible chain, sometimes any other module
      var targetPool = Math.random() < 0.75 ? chainTargets : mods;
      var tgt = pick(targetPool);
      if (!tgt || tgt.id === s.id) continue;
      var ports = modTargetPorts(tgt);
      if (!ports.length) continue;
      var port = pick(ports);
      var key = s.id + '>' + tgt.id + ':' + port;
      if (seen[key]) continue;
      seen[key] = true;
      if (s.type === 'VCO') s.params.mode = 'lfo';
      cables.push({ from: { mod: s.id, port: modSourcePort(s) }, to: { mod: tgt.id, port: port } });
      nMod--;
    }

    return { modules: mods, cables: cables };
  }

  // Local estimate following the SPEC scoring rule (used when MFAudio.score is absent).
  function estimateScore(patch) {
    var cables = patch.cables || [];
    var into = {};
    for (var i = 0; i < cables.length; i++) {
      var cb = cables[i];
      if (!into[cb.to.mod]) into[cb.to.mod] = [];
      into[cb.to.mod].push(cb.from.mod);
    }
    if (!into.OUT || !into.OUT.length) return 0;
    var reach = {};
    var stack = ['OUT'];
    while (stack.length) {
      var id = stack.pop();
      var srcs = into[id] || [];
      for (var j = 0; j < srcs.length; j++) {
        if (!reach[srcs[j]]) { reach[srcs[j]] = true; stack.push(srcs[j]); }
      }
    }
    var reachable = Object.keys(reach).length;
    var toOut = into.OUT.length;
    var modCables = 0;
    for (var k = 0; k < cables.length; k++) {
      var port = cables[k].to.port;
      if (/_cv$|^fm$|^gate$|^trig$|^clock$|^mode_trig$/.test(port) && reach[cables[k].to.mod]) modCables++;
    }
    return Math.min(100, reachable * 6 + toOut * 4 + modCables * 8);
  }

  function scorePatch(patch) {
    var s = null;
    try {
      if (window.MFAudio && typeof window.MFAudio.score === 'function') s = window.MFAudio.score(patch);
    } catch (e) { s = null; }
    if (typeof s !== 'number' || !isFinite(s)) s = estimateScore(patch);
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  function cpuTick() {
    cpuTimer = 0;
    if (!cpuRunning || dead) return;
    var patch = buildPatch();
    var power = scorePatch(patch);
    if (power <= 0) power = 5;
    if (cpuCallback) {
      try { cpuCallback(patch, power); } catch (e) { if (window.console) console.error(e); }
    }
    schedule(6000 + Math.random() * 6000);
  }

  function schedule(ms) {
    if (cpuTimer) clearTimeout(cpuTimer);
    cpuTimer = setTimeout(cpuTick, ms);
  }

  function cpuStart(onAttack) {
    cpuStop();
    cpuRunning = true;
    cpuCallback = typeof onAttack === 'function' ? onAttack : null;
    schedule(4000);
  }

  function cpuStop() {
    cpuRunning = false;
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = 0; }
  }

  // ---------------------------------------------------------------- export
  window.MFFight = {
    mount: mount,
    attack: attack,
    getHP: getHP,
    reset: reset,
    onKO: onKO,
    setSides: setSides,
    setTheme: setTheme,
    getTheme: function () { return themeName; },
    setBackground: setBackground,
    setCharacterSource: setFighterSource,
    getSides: function () { return { me: sides.me, foe: sides.me === 'left' ? 'right' : 'left' }; },
    getRates: function () { return { me: rates.me, foe: rates.foe }; },
    cpu: { start: cpuStart, stop: cpuStop, buildPatch: buildPatch }
  };
})();
