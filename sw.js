// Service worker : l'application entière est mise en cache pour fonctionner hors connexion.
// Penser à incrémenter VERSION à chaque modification des fichiers.
const VERSION = 'mathoo-v45';
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
  './js/carnet.js',
  './js/univers.js',
  './js/son.js',
  './js/accessibilite.js',
  './js/visuels.js',
  './js/fiches.js',
  './js/lecon.js',
  './js/items.js',
  './js/maitrise.js',
  './js/interactif.js',
  './js/panache.js',
  './js/hauteurs-blocs.js',
  './js/qr.js',
  './js/utils.js',
  './icons/icone.svg',
  './icons/icone-180.png',
  './icons/icone-192.png',
  './icons/icone-512.png',
  './programme/ce2/01-nombres-et-calculs/01-nombres-jusqu-a-1000.md',
  './programme/ce2/02-grandeurs-et-mesures/05-contenances.md',
  './programme/ce2/01-nombres-et-calculs/03-addition-posee.md',
  './programme/ce2/01-nombres-et-calculs/04-soustraction-posee.md',
  './programme/ce2/01-nombres-et-calculs/05-multiplication.md',
  './programme/ce2/01-nombres-et-calculs/02-nombres-jusqu-a-10000.md',
  './programme/ce2/01-nombres-et-calculs/06-fractions.md',
  './programme/ce2/02-grandeurs-et-mesures/01-monnaie.md',
  './programme/ce2/02-grandeurs-et-mesures/02-longueurs.md',
  './programme/ce2/02-grandeurs-et-mesures/03-heures.md',
  './programme/ce2/02-grandeurs-et-mesures/04-masses.md',
  './programme/ce2/02-grandeurs-et-mesures/06-durees.md',
  './programme/ce2/03-geometrie/01-solides.md',
  './programme/ce2/03-geometrie/02-polygones.md',
  './programme/ce2/03-geometrie/03-symetrie.md',
  './programme/ce2/04-gestion-de-donnees/01-gestion-de-donnees.md',
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
