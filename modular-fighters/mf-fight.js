/* Modular Fighters - fight scene, game rules, CPU opponent.
   Exposes window.MFFight. Plain browser script, no modules, no build.
   Fighters are the two line-art videos in assets/ (black on white), keyed to
   alpha and tinted per side each frame. osc always stands on the LEFT and
   faces right; moddict always stands on the RIGHT and faces left. No mirroring. */
(function () {
  'use strict';

  var MAX_HP = 100;
  var DAMAGE_SCALE = 0.5;
  var COLOR_LEFT = '#e8846c';            // osc (coral); replaced by the page --acc token (HUE wheel), see refreshAccent
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
  var FIGHTER_H = 0.80;      // max figure (content) height as a fraction of canvas height
  var FRONT_GAP = 2;         // px each figure's front edge sits from the canvas centre at idle
  var LUNGE_OVER = 0.08;     // lunge carries the front edge this fraction of the width past centre
  var ALPHA_MIN = 40;        // alpha threshold for the content bounding box

  var T_LUNGE = 170;   // ms, attacker moves forward
  var T_HOLD = 110;    // ms, contact
  var T_BACK = 220;    // ms, attacker returns
  var T_SHAKE = 320;   // ms, victim shake + flash
  var T_POP = 900;     // ms, power number
  var T_FALL = 700;    // ms, KO fall

  // Character table. facing 1 = drawn facing right (stands LEFT); -1 = faces left (stands RIGHT).
  var CHARS = {
    osc:     { name: 'osc',     src: 'assets/osc.mp4',     facing: 1 },
    tatata5: { name: 'tatata5', src: 'assets/tatata5.mp4', facing: 1 },
    moddict: { name: 'moddict', src: 'assets/moddict.mp4', facing: -1 },
    mad:     { name: 'mad',     src: 'assets/mad.mp4',     facing: -1 }
  };
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
      box: { top: 0, bottom: KEY_PX, left: 0, right: KEY_PX },  // content bbox of the current keyed frame
      ext: null   // running union of the per-frame boxes (keyed px); stable anchor across the loop
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
    f.ext = null;
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

  // osc (left) follows the page accent: --acc on <html>, rewritten by the HUE wheel.
  // Figure tint, HP bar and lunge colour all read SIDES.left.color.
  function refreshAccent() {
    var c = '';
    try { c = window.getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(); } catch (e) { c = ''; }
    if (!c) c = COLOR_LEFT;
    if (c === SIDES.left.color) return;
    SIDES.left.color = c;
    var f = fighters.left;
    if (f) { f.color = c; f.rgb = null; f.lastKey = -1; }   // re-key the figure with the new tint
  }
  window.addEventListener('mf-hue', refreshAccent);
  window.addEventListener('mf-theme', refreshAccent);

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
      var e = f.ext;
      if (!e) {
        f.ext = { top: f.box.top, bottom: f.box.bottom, left: f.box.left, right: f.box.right };
      } else {
        if (f.box.top < e.top) e.top = f.box.top;
        if (f.box.bottom > e.bottom) e.bottom = f.box.bottom;
        if (f.box.left < e.left) e.left = f.box.left;
        if (f.box.right > e.right) e.right = f.box.right;
      }
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

  // Put a character on a side (video reloaded only when it changes).
  function setCharacter(side, id) {
    var def = CHARS[id];
    if (!def || !SIDES[side]) return;
    var s = SIDES[side];
    if (s.name === def.name) return;
    s.name = def.name; s.src = def.src; s.facing = def.facing;
    var f = fighters[side];
    if (f) {
      f.name = def.name;
      f.facing = def.facing;
      setFighterSource(side, makeVideo(def.src));
    }
  }

  // opts: { me: 'left'|'right', meChar?: id, foeChar?: id }
  function setSides(opts) {
    var me = opts && opts.me === 'right' ? 'right' : 'left';
    sides.me = me;
    var foe = me === 'left' ? 'right' : 'left';
    if (opts && opts.meChar) setCharacter(me, opts.meChar);
    if (opts && opts.foeChar) setCharacter(foe, opts.foeChar);
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
    refreshAccent();
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
    // damage = half of attack power (2026-10-16: full power ended matches in two rounds)
    hp[victim] = Math.max(0, hp[victim] - Math.round(power * DAMAGE_SCALE));
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
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = 0; }   // drop a pending CPU response
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

  function drawPlaceholder(f, x, floorY, h) {
    // video not decodable / not yet loaded: faint outline where the fighter stands (front edge at x)
    var c = ctx;
    var w = h * 0.6;
    c.save();
    c.strokeStyle = f.color;
    c.globalAlpha = 0.35;
    c.lineWidth = 2;
    c.setLineDash([6, 6]);
    c.strokeRect(f.facing > 0 ? x - w : x, floorY - h, w, h);
    c.restore();
  }

  // Extents used for layout: the running union box once a frame exists, else the full frame.
  function extentOf(f) {
    return (f && f.hasFrame && f.ext) ? f.ext : { top: 0, bottom: KEY_PX, left: 0, right: KEY_PX };
  }

  function drawFighter(opts) {
    // opts: f (fighter), x (front edge), floorY, k (canvas px per keyed px), bob, flash, fall
    var f = opts.f;
    var c = ctx;
    c.save();
    c.translate(opts.x, opts.floorY);
    if (opts.fall > 0) {
      // rotate about the feet, fall backwards (away from opponent)
      c.rotate(-f.facing * opts.fall * Math.PI * 0.47);
    }
    c.translate(0, -opts.bob);
    if (!f.hasFrame) {
      c.restore();
      drawPlaceholder(f, opts.x, opts.floorY, (KEY_PX * opts.k) * 0.75);
      return;
    }
    var k = opts.k;
    var size = KEY_PX * k;
    var e = extentOf(f);
    // front edge of the union box on x (left fighter: right edge; right fighter: left edge),
    // bottom of the union box on the floor
    var fx = (f.facing > 0 ? e.right : e.left) * k;
    var by = e.bottom * k;
    c.drawImage(f.keyed, -fx, -by, size, size);
    if (opts.flash > 0) {
      c.globalAlpha = 0.55 + 0.45 * opts.flash;
      c.drawImage(flashCanvas(f), -fx, -by, size, size);
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

    // fighter geometry: key both frames first so the union boxes are current
    var whoL = whoAt('left'), whoR = whoAt('right');
    var fL = fighters.left, fR = fighters.right;
    if (fL) keyFrame(fL);
    if (fR) keyFrame(fR);
    var eL = extentOf(fL), eR = extentOf(fR);
    var hL = Math.max(1, eL.bottom - eL.top), hR = Math.max(1, eR.bottom - eR.top);
    var wL = Math.max(1, eL.right - eL.left), wR = Math.max(1, eR.right - eR.left);
    // canvas px per keyed px: figure height <= FIGHTER_H of the canvas and below the HP bars,
    // and each figure's width (from its front edge at the centre back to its rear edge) fits its half
    var maxFigH = Math.max(40, Math.min(H * FIGHTER_H, floorY - (barTop + BAR_H) - 6));
    var k = Math.min(
      maxFigH / Math.max(hL, hR),
      (W / 2 - FRONT_GAP - pad) / Math.max(wL, wR));
    var figH = Math.max(hL, hR) * k;
    var scale = Math.max(0.6, Math.min(2.2, figH / 150, W / 300));
    var reach = FRONT_GAP + W * LUNGE_OVER;
    var baseLeftX = W / 2 - FRONT_GAP;
    var baseRightX = W / 2 + FRONT_GAP;
    var elapsed = (t - startTime) / 1000;

    var bobL = dead === whoL ? 0 : Math.sin(elapsed * 3.1) * 3 * scale;
    var bobR = dead === whoR ? 0 : Math.sin(elapsed * 3.1 + 1.7) * 3 * scale;

    // KO fall: body rotates backwards about the feet; slide inward so it stays in view
    var fallL = fallAmount(whoL, t);
    var fallR = fallAmount(whoR, t);
    var slideL = fallL * Math.max(0, hL * k + 12 - (baseLeftX - pad));
    var slideR = fallR * Math.max(0, hR * k + 12 - (W - pad - baseRightX));
    var leftX = baseLeftX + lungeOffset(whoL, t, reach) + shakeAmount(whoL, t) + slideL;
    var rightX = baseRightX - lungeOffset(whoR, t, reach) + shakeAmount(whoR, t) - slideR;

    var geo = {
      scale: scale,
      left: { x: leftX - wL * k / 2, headTop: floorY - hL * k - bobL },
      right: { x: rightX + wR * k / 2, headTop: floorY - hR * k - bobR }
    };

    if (fL) drawFighter({ f: fL, x: leftX, floorY: floorY, k: k,
      bob: bobL, flash: flashAmount(whoL, t), fall: fallL });
    if (fR) drawFighter({ f: fR, x: rightX, floorY: floorY, k: k,
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

  var PROC_TYPES = { LPF: 1, FOLD: 1, DELAY: 1, MIXVCA: 1 };
  var VCO_OUTS = ['saw', 'sqr', 'tri'];

  function fallbackModules() {
    var types = ['VCO', 'VCO', 'LPF', 'FOLD', 'DELAY', 'MIXVCA', 'ADSR', 'AR', 'SEQ5', 'DRAW'];
    var mods = [];
    for (var i = 0; i < types.length; i++) {
      var p = {};
      switch (types[i]) {
        case 'VCO': p = { freq: 60 + rnd(900), mode: 'vco', fmAmt: Math.random() }; break;
        case 'LPF': p = { cutoff: 200 + rnd(8000), res: Math.random() * 0.8, cvAmt: Math.random() }; break;
        case 'FOLD': p = { fold: Math.random(), cvAmt: Math.random() }; break;
        case 'DELAY': p = { time: 0.1 + Math.random() * 0.9, fb: Math.random() * 0.8, mix: 0.3 + Math.random() * 0.5 }; break;
        case 'MIXVCA': p = { lvl1: 0.8, lvl2: 0.8, lvl3: 0.8, lvl4: 0.8 }; break;
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
    return mod.type === 'MIXVCA' ? 'in' + (1 + rnd(4)) : 'in';
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

  // Difficulty scales the CPU patch's power (easy 0.35, normal 0.6, hard 1.0).
  var CPU_SCALE = { easy: 0.35, normal: 0.6, hard: 1.0 };
  var cpuDifficulty = 'normal';

  function cpuSetDifficulty(name) {
    cpuDifficulty = CPU_SCALE[name] ? name : 'normal';
    if (cpuRunning) idleArm();   // the idle period length follows the difficulty
  }

  // Idle attack (user rule 2026-10-16): when the user has not sent a scoring attack for
  // 40 / 30 / 20 s (EASY / NORMAL / HARD) the CPU attacks once on its own, then the period
  // restarts. The period starts at cpu.start() and restarts after any attack from either side
  // (user attack = notifyUserAttack, CPU attack = cpuAttack). Cancelled by cpu.stop() (KO, HOME).
  // While the tab is hidden (document.hidden) the attack is skipped and a fresh period starts;
  // nothing fires in the background and nothing fires the moment the tab comes back.
  var IDLE_MS = { easy: 40000, normal: 30000, hard: 20000 };
  var idleTimer = 0;
  var idleDue = 0;            // Date.now() at which the idle attack is due (0 = not armed)

  function idleArm() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
    idleDue = 0;
    if (!cpuRunning || dead) return;
    var ms = IDLE_MS[cpuDifficulty] || IDLE_MS.normal;
    idleDue = Date.now() + ms;
    idleTimer = setTimeout(idleFire, ms);
  }
  function idleFire() {
    idleTimer = 0; idleDue = 0;
    if (!cpuRunning || dead) return;
    if (document.hidden) { idleArm(); return; }   // skip-and-restart while hidden
    cpuAttack();
  }
  function idleRemaining() {
    if (!idleDue) return 0;
    return Math.max(0, (idleDue - Date.now()) / 1000);
  }

  // One CPU attack now (reply path and idle path share it); restarts the idle period.
  function cpuAttack() {
    if (!cpuRunning || dead) return;
    var patch = buildPatch();
    var power = scorePatch(patch);
    if (power <= 0) power = 5;
    power = Math.max(3, Math.min(100, Math.round(power * CPU_SCALE[cpuDifficulty])));
    if (cpuCallback) {
      try { cpuCallback(patch, power); } catch (e) { if (window.console) console.error(e); }
    }
    idleArm();
  }

  // Reply path: one attack 1.5-3 s after each user attack.
  function cpuRespond() {
    cpuTimer = 0;
    cpuAttack();
  }

  function cpuNotifyUserAttack() {
    if (!cpuRunning || dead) return;
    idleArm();              // a user attack restarts the idle period
    if (cpuTimer) return;   // a response is already pending; it covers this attack too
    cpuTimer = setTimeout(cpuRespond, 1500 + Math.random() * 1500);
  }

  function cpuStart(onAttack) {
    cpuStop();
    cpuRunning = true;
    cpuCallback = typeof onAttack === 'function' ? onAttack : null;
    idleArm();
  }

  function cpuStop() {
    cpuRunning = false;
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = 0; }
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
    idleDue = 0;
  }

  // ---------------------------------------------------------------- export
  window.MFFight = {
    mount: mount,
    attack: attack,
    getHP: getHP,
    reset: reset,
    onKO: onKO,
    setSides: setSides,
    setCharacter: setCharacter,
    CHARS: CHARS,
    setTheme: setTheme,
    getTheme: function () { return themeName; },
    setBackground: setBackground,
    setCharacterSource: setFighterSource,
    getSides: function () { return { me: sides.me, foe: sides.me === 'left' ? 'right' : 'left' }; },
    getRates: function () { return { me: rates.me, foe: rates.foe }; },
    cpu: { start: cpuStart, stop: cpuStop, notifyUserAttack: cpuNotifyUserAttack, respond: cpuRespond,
      setDifficulty: cpuSetDifficulty, getDifficulty: function () { return cpuDifficulty; }, buildPatch: buildPatch,
      idleRemaining: idleRemaining }   // seconds until the idle attack (0 = not armed)
  };
})();
