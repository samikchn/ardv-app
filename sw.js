// Service worker : garde les fichiers de l'appli pour un démarrage rapide (réseau d'abord, cache en secours).
const CACHE = 'ardv-v4';
const FICHIERS = ['./', 'index.html', 'style.css', 'config.js', 'manifest.json', 'icon.svg', 'icon-180.png', 'icon-192.png',
  'js/app.js', 'js/i18n.js', 'js/ui.js', 'js/donnees.js', 'js/profil.js', 'js/avis-prompt.js', 'js/brouillon.js',
  'js/ecran-avis.js', 'js/ecran-fiche.js', 'js/connexion.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});
// Le module supabase-js (jsdelivr) est aussi gardé : sans lui l'appli ne démarre pas hors ligne.
const CDN_OK = url => url.origin === location.origin || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@supabase/'));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || !CDN_OK(url)) return; // Supabase, IA : jamais en cache
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })) || (e.request.mode === 'navigate' ? caches.match('./') : undefined)));
});
