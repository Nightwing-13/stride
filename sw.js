// Stride service worker: serve the app from cache so it opens offline (e.g. in a gym with no signal),
// and refresh the cache in the background whenever the network is available.
const CACHE = 'stride-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './config.js',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  // Cache each file on its own so one missing file can't block the whole install.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isShell = url.origin === location.origin || CDN_HOSTS.includes(url.hostname);
  const isTile = /basemaps\.cartocdn\.com$/.test(url.hostname);
  if (!isShell && !isTile) return; // let everything else (e.g. sync API calls) go straight to the network

  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const network = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; });
    // App files: network first so updates show up immediately; fall back to cache when offline.
    if (url.origin === location.origin) return network.catch(() => cached || Response.error());
    // Libraries and map tiles rarely change: answer from cache, refresh in the background.
    return cached || network.catch(() => Response.error());
  }));
});
