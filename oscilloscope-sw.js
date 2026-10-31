/* Oscilloscope offline cache. Registered with scope "oscilloscope-app.html" only, so it controls that page and
   nothing else on madzine.work. Page + manifest: network first, cache fallback (updates arrive when online).
   Fonts and icons: cache first, refreshed in the background. */
const VERSION = 'osc-v1';
const PRECACHE = ['oscilloscope-app.html', 'oscilloscope.webmanifest', 'assets/icons/oscilloscope-180.png', 'assets/icons/oscilloscope-192.png', 'assets/icons/oscilloscope-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('osc-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isOwn = url.origin === self.location.origin;
  if (!isFont && !isOwn) return;
  if (isFont || url.pathname.includes('/assets/icons/')) {
    // cache first, refresh in the background
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const refresh = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await refresh) || Response.error();
    }));
    return;
  }
  // own page / manifest: network first, cache fallback
  e.respondWith(caches.open(VERSION).then(async c => {
    try {
      const res = await fetch(req);
      if (res && res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      return hit || Response.error();
    }
  }));
});
