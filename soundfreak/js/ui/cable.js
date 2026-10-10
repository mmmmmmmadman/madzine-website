// Cable overlay: a canvas covering the whole rack content. Cables are drawn as
// sagging curves in a colour that matches the jack type. The canvas never
// receives pointer events; the rack asks it for hit tests.

const COLORS = {
  banana: '#1c1c1c',
  tj: '#5a6d80',
};
const COLORS_HL = {
  banana: '#c0392b',
  tj: '#c0392b',
};

export class CableLayer {
  constructor(canvas, rackEl) {
    this.canvas = canvas;
    this.rackEl = rackEl;
    this.ctx = canvas.getContext('2d');
    this.cables = [];       // {from:{m,j}, to:{m,j}, kind}
    this.drag = null;       // {kind, x1,y1, x2,y2}
    this.hover = -1;
    this.resolve = () => null;   // (m, j) -> jack element, set by rack
    this._raf = 0;
  }

  setCables(cables) {
    this.cables = cables;
    this.requestDraw();
  }

  requestDraw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  }

  jackCenter(m, j) {
    const elx = this.resolve(m, j);
    if (!elx) return null;
    const r = elx.getBoundingClientRect();
    const c = this.canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
  }

  resize() {
    // Collapse the canvas first: its own previous size counts toward the rack's
    // scroll size, and would keep the overlay from shrinking after a re-wrap.
    this.canvas.style.width = '0px';
    this.canvas.style.height = '0px';
    const w = this.rackEl.scrollWidth, h = this.rackEl.scrollHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  curve(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const sag = 30 + d * 0.18;
    return { c1: { x: a.x, y: a.y + sag }, c2: { x: b.x, y: b.y + sag } };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    this.cables.forEach((c, i) => {
      const a = this.jackCenter(c.from.m, c.from.j), b = this.jackCenter(c.to.m, c.to.j);
      if (!a || !b) return;
      this.strokeCable(a, b, c.kind, i === this.hover);
    });
    if (this.drag) {
      const { x1, y1, x2, y2, kind } = this.drag;
      this.strokeCable({ x: x1, y: y1 }, { x: x2, y: y2 }, kind, false, true);
    }
  }

  strokeCable(a, b, kind, hl, ghost = false) {
    const ctx = this.ctx;
    const { c1, c2 } = this.curve(a, b);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = hl ? COLORS_HL[kind] : COLORS[kind];
    ctx.globalAlpha = ghost ? 0.6 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = hl ? COLORS_HL[kind] : COLORS[kind];
      ctx.fill();
    }
  }

  // Returns index of the cable closest to (x, y) within threshold, or -1.
  hitTest(x, y, threshold = 7) {
    let best = -1, bestD = threshold;
    this.cables.forEach((c, i) => {
      const a = this.jackCenter(c.from.m, c.from.j), b = this.jackCenter(c.to.m, c.to.j);
      if (!a || !b) return;
      const { c1, c2 } = this.curve(a, b);
      let px = a.x, py = a.y;
      const N = 40;
      for (let s = 1; s <= N; s++) {
        const t = s / N, u = 1 - t;
        const qx = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
        const qy = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
        const d = segDist(x, y, px, py, qx, qy);
        if (d < bestD) { bestD = d; best = i; }
        px = qx; py = qy;
      }
    });
    return best;
  }

  setHover(i) {
    if (i !== this.hover) { this.hover = i; this.requestDraw(); }
  }

  setDrag(d) {
    this.drag = d;
    this.requestDraw();
  }
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
