const CACHE = 'ha-giang-planner-mobile-v5.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];
const MEDIA = [
  './photos/cabin.webp',
  './photos/dong-van.webp',
  './photos/hanoi-illustration.svg',
  './photos/hotpot.webp',
  './photos/lo-lo-cafe.webp',
  './photos/lo-lo-chai.webp',
  './photos/lo-lo-house.webp',
  './photos/loop-mountains.webp',
  './photos/loop-road.webp',
  './photos/meo-vac.webp',
  './photos/nho-que.webp',
  './photos/pa-vi-aerial.webp',
  './photos/pa-vi.webp',
  './photos/panorama.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(MEDIA.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ha-giang-planner-mobile-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) {
    return;
  }

  // Network-first for HTML / CSS / JS so GitHub Pages updates appear immediately when online,
  // while falling back cleanly to cache when offline in Hà Giang mountains.
  const isCode =
    req.mode === 'navigate' ||
    /\.(html|css|js|webmanifest)$/i.test(url.pathname);

  if (isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Cache-first for static photos & icons
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
