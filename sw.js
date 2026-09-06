// Service worker : l'application entière est mise en cache pour fonctionner hors connexion.
// Penser à incrémenter VERSION à chaque modification des fichiers.
const VERSION = 'mathoo-v3';
const FICHIERS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/exercices.js',
  './js/niveaux/cp.js',
  './js/niveaux/ce1.js',
  './js/niveaux/ce2.js',
  './js/progression.js',
  './js/univers.js',
  './js/son.js',
  './js/utils.js',
  './icons/icone.svg',
  './icons/icone-180.png',
  './icons/icone-192.png',
  './icons/icone-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord : tout est local, aucun appel réseau n'est nécessaire pour jouer.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((rep) => rep || fetch(e.request).then((reseau) => {
      const copie = reseau.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copie)).catch(() => {});
      return reseau;
    }).catch(() => caches.match('./index.html')))
  );
});
