// Réseau d'abord : chaque ouverture récupère la dernière version du jeu.
// Sans connexion, la dernière version téléchargée est servie depuis le cache.
const CACHE = 'cendres-cache';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'js/phaser.min.js', 'js/main.js', 'js/tiles.js', 'js/world.js', 'js/rng.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./')))
  );
});
