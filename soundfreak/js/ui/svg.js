// Small SVG helpers.
export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, children = []) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) {
    if (attrs[k] === undefined || attrs[k] === null) continue;
    e.setAttribute(k, attrs[k]);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

export function text(x, y, str, size = 5, anchor = 'middle', extra = {}) {
  return el('text', { x, y, 'font-size': size, 'text-anchor': anchor, class: 'lbl', ...extra }, [str]);
}

export function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
