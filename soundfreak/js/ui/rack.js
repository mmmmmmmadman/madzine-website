// The rack: holds module instances, their panels, cables and the cable overlay.
// Emits graph/param changes through callbacks given at construction.
import { MODULE_DEFS, MODULE_MENU, findJack, defaultParams } from '../modules/index.js';
import { canConnect, orient } from '../modules/rules.js';
import { createPanel } from './panel.js';
import { CableLayer } from './cable.js';

const MODULE_LABELS = Object.fromEntries(MODULE_MENU.filter(m => m.type).map(m => [m.type, m.label]));

export class Rack {
  constructor(rootEl, { onGraph, onParam }) {
    this.root = rootEl;
    this.onGraph = onGraph;
    this.onParam = onParam;
    this.modules = [];     // {id, type, def, params, el, panel}
    this.cables = [];      // {from:{m,j}, to:{m,j}, kind}
    this.nextId = 1;

    this.strip = document.createElement('div');
    this.strip.className = 'strip';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cables';
    this.root.appendChild(this.strip);
    this.root.appendChild(this.canvas);
    this.layer = new CableLayer(this.canvas, this.root);
    this.layer.resolve = (m, j) => this.jackEl(m, j);
    this.dropMark = document.createElement('div');
    this.dropMark.className = 'drop-indicator';
    this.dropMark.hidden = true;
    this.root.appendChild(this.dropMark);
    this.moduleDrag = null;

    this.bindCableInteraction();
    window.addEventListener('resize', () => this.layer.resize());
    // The strip wraps modules into rows; any change of the rack's width
    // re-wraps them, so the overlay must follow the strip's size.
    if (typeof ResizeObserver !== 'undefined') {
      let pending = 0;
      this._ro = new ResizeObserver(() => {
        if (pending) return;
        pending = requestAnimationFrame(() => { pending = 0; this.layer.resize(); });
      });
      this._ro.observe(this.strip);
    }
    this.root.addEventListener('scroll', () => {
      this.layer.requestDraw();
      if (this.moduleDrag && this.moduleDrag.active) this.updateModuleDrop(this.moduleDrag);
    });
  }

  jackEl(m, j) {
    const mod = this.modules.find(x => x.id === m);
    if (!mod) return null;
    return mod.el.querySelector(`.jack[data-jack="${j}"]`);
  }

  // ---------- modules ----------
  addModule(type, params = null, id = null) {
    const def = MODULE_DEFS[type];
    if (!def) return null;
    if (!id) id = `${type}-${this.nextId++}`;
    else {
      const n = parseInt(String(id).split('-').pop(), 10);
      if (!isNaN(n) && n >= this.nextId) this.nextId = n + 1;
    }
    const p = { ...defaultParams(def), ...(params || {}) };
    const wrap = document.createElement('div');
    wrap.className = 'module';
    wrap.dataset.id = id;
    const hooks = {
      moduleId: id,
      onParam: (m, k, v) => { p[k] = v; this.onParam(m, k, v); this.scheduleSave(); },
    };
    const panel = createPanel(def, id, p, hooks);
    // Handle bar above the panel: the only place that starts a module drag,
    // so knobs, jacks and keys on the panel keep their own pointer handling.
    const handle = document.createElement('div');
    handle.className = 'module-handle';
    handle.title = 'Drag to move module';
    const name = document.createElement('span');
    name.className = 'module-name';
    name.textContent = MODULE_LABELS[type] || type;
    handle.appendChild(name);
    const rm = document.createElement('button');
    rm.className = 'remove';
    rm.title = 'Remove module';
    rm.textContent = 'x';
    rm.addEventListener('click', () => this.removeModule(id));
    handle.appendChild(rm);
    wrap.appendChild(handle);
    wrap.appendChild(panel.svg);
    this.strip.appendChild(wrap);
    const mod = { id, type, def, params: p, el: wrap, panel };
    this.bindModuleDrag(mod, handle);
    this.modules.push(mod);
    this.graphChanged();
    return mod;
  }

  removeModule(id) {
    const i = this.modules.findIndex(m => m.id === id);
    if (i < 0) return;
    const mod = this.modules[i];
    if (mod.panel.custom.keys) mod.panel.custom.keys.destroy();
    mod.el.remove();
    this.modules.splice(i, 1);
    this.cables = this.cables.filter(c => c.from.m !== id && c.to.m !== id);
    this.graphChanged();
  }

  clear() {
    for (const m of [...this.modules]) this.removeModule(m.id);
  }

  setMeter(moduleId, l, r) {
    const mod = this.modules.find(m => m.id === moduleId);
    if (mod && mod.panel.custom.meter) mod.panel.custom.meter.set(l, r);
  }

  // Generic DSP state from the engine -> the panel's custom elements.
  setState(moduleId, state) {
    const mod = this.modules.find(m => m.id === moduleId);
    if (!mod || !state) return;
    const c = mod.panel.custom;
    if (mod.type === 'sequencer' && c.leds) c.leds.set(state.active ? state.step : -1);
    else if (mod.type === 'envelope-shaper' && c.attack_led) c.attack_led.set(!!state.ledOn);
  }

  // ---------- module reordering ----------
  // Press on a module's handle bar and drag: the module dims in place, a
  // vertical bar marks where it will be inserted, release moves it there.
  bindModuleDrag(mod, handle) {
    const START_PX = 4;
    handle.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || this.moduleDrag) return;
      if (ev.target.closest && ev.target.closest('button')) return;
      ev.preventDefault();
      try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
      this.moduleDrag = { mod, handle, pointerId: ev.pointerId, x0: ev.clientX, y0: ev.clientY,
                          cx: ev.clientX, cy: ev.clientY, active: false, drop: null, raf: 0 };
    });
    handle.addEventListener('pointermove', (ev) => {
      const d = this.moduleDrag;
      if (!d || d.mod !== mod || ev.pointerId !== d.pointerId) return;
      d.cx = ev.clientX; d.cy = ev.clientY;
      if (!d.active) {
        if (Math.hypot(d.cx - d.x0, d.cy - d.y0) < START_PX) return;
        d.active = true;
        mod.el.classList.add('module-dragging');
        this.root.classList.add('dragging-module');
        this.startModuleAutoScroll(d);
      }
      this.updateModuleDrop(d);
    });
    const end = (ev, commit) => {
      const d = this.moduleDrag;
      if (!d || d.mod !== mod || ev.pointerId !== d.pointerId) return;
      // clear first: releasing capture may fire lostpointercapture synchronously
      this.moduleDrag = null;
      if (d.raf) cancelAnimationFrame(d.raf);
      try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
      mod.el.classList.remove('module-dragging');
      this.root.classList.remove('dragging-module');
      this.dropMark.hidden = true;
      if (commit && d.active) {
        d.cx = ev.clientX; d.cy = ev.clientY;
        this.updateModuleDrop(d);
        this.dropMark.hidden = true;
        if (d.drop) this.moveModule(mod.id, d.drop.index);
      }
    };
    handle.addEventListener('pointerup', (ev) => end(ev, true));
    handle.addEventListener('pointercancel', (ev) => end(ev, false));
    handle.addEventListener('lostpointercapture', (ev) => end(ev, false));
  }

  // Insertion point for the dragged module: `index` counts positions among the
  // other modules. Rows are the strip's wrapped lines (same top edge).
  computeModuleDrop(d) {
    const others = this.modules.filter(m => m !== d.mod);
    if (!others.length) return null;
    const rows = [];
    others.forEach((m, i) => {
      const r = m.el.getBoundingClientRect();
      let row = rows.find(x => Math.abs(x.top - r.top) < 2);
      if (!row) { row = { top: r.top, bottom: r.bottom, items: [] }; rows.push(row); }
      row.bottom = Math.max(row.bottom, r.bottom);
      row.items.push({ i, r });
    });
    let row = null, best = Infinity;
    for (const x of rows) {
      const dist = d.cy < x.top ? x.top - d.cy : d.cy > x.bottom ? d.cy - x.bottom : 0;
      if (dist < best) { best = dist; row = x; }
    }
    const before = row.items.find(it => d.cx < it.r.left + it.r.width / 2);
    if (before) return { index: before.i, x: before.r.left - 1, top: row.top, bottom: row.bottom };
    const last = row.items[row.items.length - 1];
    return { index: last.i + 1, x: last.r.right + 1, top: row.top, bottom: row.bottom };
  }

  updateModuleDrop(d) {
    d.drop = this.computeModuleDrop(d);
    const cur = this.modules.indexOf(d.mod);
    // dropping right where the module already sits changes nothing: no marker
    if (!d.drop || d.drop.index === cur) { this.dropMark.hidden = true; return; }
    const rr = this.root.getBoundingClientRect();
    const s = this.dropMark.style;
    s.left = (d.drop.x - rr.left + this.root.scrollLeft) + 'px';
    s.top = (d.drop.top - rr.top + this.root.scrollTop) + 'px';
    s.height = (d.drop.bottom - d.drop.top) + 'px';
    this.dropMark.hidden = false;
  }

  startModuleAutoScroll(d) {
    const EDGE = 48, MAX_STEP = 18;
    const step = (pos, lo, hi) => {
      if (pos < lo + EDGE) return -Math.ceil(MAX_STEP * Math.min(1, (lo + EDGE - pos) / EDGE));
      if (pos > hi - EDGE) return Math.ceil(MAX_STEP * Math.min(1, (pos - (hi - EDGE)) / EDGE));
      return 0;
    };
    const tick = () => {
      if (this.moduleDrag !== d) return;
      const r = this.root.getBoundingClientRect();
      const dx = step(d.cx, r.left, r.right), dy = step(d.cy, r.top, r.bottom);
      if (dx || dy) {
        const sl = this.root.scrollLeft, st = this.root.scrollTop;
        this.root.scrollLeft = sl + dx;
        this.root.scrollTop = st + dy;
        if (this.root.scrollLeft !== sl || this.root.scrollTop !== st) this.updateModuleDrop(d);
      }
      d.raf = requestAnimationFrame(tick);
    };
    d.raf = requestAnimationFrame(tick);
  }

  // Move module `id` so it lands at position `index` among the other modules.
  // The patch's modules array is the screen order, so save/load keep it.
  moveModule(id, index) {
    const mod = this.modules.find(m => m.id === id);
    if (!mod) return false;
    const others = this.modules.filter(m => m !== mod);
    index = Math.max(0, Math.min(others.length, index));
    others.splice(index, 0, mod);
    if (others.every((m, i) => m === this.modules[i])) return false;
    this.modules = others;
    for (const m of this.modules) this.strip.appendChild(m.el);
    this.graphChanged();
    return true;
  }

  // ---------- cables ----------
  jackDef(m, j) {
    const mod = this.modules.find(x => x.id === m);
    return mod ? findJack(mod.def, j) : null;
  }

  addCable(a, b) {
    const da = this.jackDef(a.m, a.j), db = this.jackDef(b.m, b.j);
    if (!canConnect(da, db)) return false;
    const o = orient({ ...da, m: a.m }, { ...db, m: b.m });
    const from = { m: o.from.m, j: o.from.id }, to = { m: o.to.m, j: o.to.id };
    if (this.cables.some(c => c.from.m === from.m && c.from.j === from.j && c.to.m === to.m && c.to.j === to.j)) return false;
    this.cables.push({ from, to, kind: da.kind });
    this.graphChanged();
    return true;
  }

  removeCable(i) {
    this.cables.splice(i, 1);
    this.graphChanged();
  }

  bindCableInteraction() {
    let drag = null;
    const root = this.root;
    root.addEventListener('pointerdown', (ev) => {
      const jack = ev.target.closest && ev.target.closest('.jack');
      if (!jack || ev.button !== 0) return;
      ev.preventDefault();
      const m = jack.dataset.module, j = jack.dataset.jack;
      const c = this.layer.jackCenter(m, j);
      drag = { m, j, kind: jack.dataset.kind, dir: jack.dataset.dir, x1: c.x, y1: c.y,
               cx: ev.clientX, cy: ev.clientY, raf: 0 };
      root.classList.add('dragging-cable');
      this.updateDrag(ev, drag);
      root.setPointerCapture(ev.pointerId);
      startAutoScroll(drag);
    });
    // While dragging a cable, holding the pointer near an edge of the rack
    // scrolls it, so the far jack can be reached when the rows do not fit.
    const EDGE = 48, MAX_STEP = 18;
    const edgeStep = (pos, lo, hi) => {
      if (pos < lo + EDGE) return -Math.ceil(MAX_STEP * Math.min(1, (lo + EDGE - pos) / EDGE));
      if (pos > hi - EDGE) return Math.ceil(MAX_STEP * Math.min(1, (pos - (hi - EDGE)) / EDGE));
      return 0;
    };
    const startAutoScroll = (d) => {
      const tick = () => {
        if (drag !== d) return;
        const r = root.getBoundingClientRect();
        const dy = d.moved ? edgeStep(d.cy, r.top, r.bottom) : 0;
        const dx = d.moved ? edgeStep(d.cx, r.left, r.right) : 0;
        if (dx || dy) {
          const sl = root.scrollLeft, st = root.scrollTop;
          root.scrollLeft = sl + dx;
          root.scrollTop = st + dy;
          if (root.scrollLeft !== sl || root.scrollTop !== st) this.updateDrag({ clientX: d.cx, clientY: d.cy }, d);
        }
        d.raf = requestAnimationFrame(tick);
      };
      d.raf = requestAnimationFrame(tick);
    };
    // wheel / trackpad scrolling during a drag keeps the loose end under the pointer
    root.addEventListener('scroll', () => {
      if (drag) this.updateDrag({ clientX: drag.cx, clientY: drag.cy }, drag);
    });
    root.addEventListener('pointermove', (ev) => {
      if (drag) { drag.moved = true; drag.cx = ev.clientX; drag.cy = ev.clientY; this.updateDrag(ev, drag); return; }
      if (ev.target.closest && ev.target.closest('.knob, .jack, .keys, .switch, button, .module-handle')) { this.layer.setHover(-1); return; }
      const p = this.toCanvas(ev);
      this.layer.setHover(this.layer.hitTest(p.x, p.y));
      root.classList.toggle('over-cable', this.layer.hover >= 0);
    });
    const finish = (ev) => {
      if (!drag) return;
      if (drag.raf) cancelAnimationFrame(drag.raf);
      try { root.releasePointerCapture(ev.pointerId); } catch (e) {}
      root.classList.remove('dragging-cable');
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const jack = t && t.closest ? t.closest('.jack') : null;
      if (jack && !(jack.dataset.module === drag.m && jack.dataset.jack === drag.j)) {
        this.addCable({ m: drag.m, j: drag.j }, { m: jack.dataset.module, j: jack.dataset.jack });
      }
      drag = null;
      this.layer.setDrag(null);
      this.highlightTargets(null);
      // the click that follows a captured drag targets the rack, not the jack
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    };
    let suppressClick = false;
    root.addEventListener('pointerup', finish);
    root.addEventListener('pointercancel', finish);
    root.addEventListener('click', (ev) => {
      if (suppressClick) return;
      if (ev.target.closest && ev.target.closest('.knob, .jack, .keys, .switch, button, .module-handle')) return;
      const p = this.toCanvas(ev);
      const i = this.layer.hitTest(p.x, p.y);
      if (i >= 0) { this.removeCable(i); this.layer.setHover(-1); root.classList.remove('over-cable'); }
    });
  }

  toCanvas(ev) {
    const c = this.canvas.getBoundingClientRect();
    return { x: ev.clientX - c.left, y: ev.clientY - c.top };
  }

  updateDrag(ev, drag) {
    const p = this.toCanvas(ev);
    this.layer.setDrag({ kind: drag.kind, x1: drag.x1, y1: drag.y1, x2: p.x, y2: p.y });
    this.highlightTargets(drag);
  }

  highlightTargets(drag) {
    this.root.querySelectorAll('.jack').forEach((je) => {
      let ok = false;
      if (drag) {
        const a = this.jackDef(drag.m, drag.j), b = this.jackDef(je.dataset.module, je.dataset.jack);
        ok = canConnect(a, b);
      }
      je.classList.toggle('target', ok);
      je.classList.toggle('dim', !!drag && !ok && !(je.dataset.module === drag.m && je.dataset.jack === drag.j));
    });
  }

  // ---------- state ----------
  graphChanged() {
    this.layer.setCables(this.cables);
    requestAnimationFrame(() => this.layer.resize());
    this.onGraph(this.graphMessage());
    this.scheduleSave();
  }

  graphMessage() {
    return {
      type: 'graph',
      modules: this.modules.map(m => ({ id: m.id, type: m.type, params: { ...m.params } })),
      cables: this.cables.map(c => ({ from: { ...c.from }, to: { ...c.to } })),
    };
  }

  serialize() {
    return {
      version: 1,
      modules: this.modules.map(m => ({ id: m.id, type: m.type, params: { ...m.params } })),
      cables: this.cables.map(c => ({ from: { ...c.from }, to: { ...c.to } })),
    };
  }

  load(patch) {
    this.clear();
    if (!patch || !Array.isArray(patch.modules)) return false;
    for (const m of patch.modules) this.addModule(m.type, m.params, m.id);
    for (const c of patch.cables || []) {
      if (c.from && c.to) this.addCable({ m: c.from.m, j: c.from.j }, { m: c.to.m, j: c.to.j });
    }
    this.graphChanged();
    return true;
  }

  scheduleSave() {
    if (this._saveT) clearTimeout(this._saveT);
    this._saveT = setTimeout(() => { this._saveT = 0; if (this.onSave) this.onSave(this.serialize()); }, 300);
  }
}
