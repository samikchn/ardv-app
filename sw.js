// Service worker : garde les fichiers de l'appli pour un démarrage rapide (réseau d'abord, cache en secours).
const CACHE = 'ardv-v6';
const FICHIERS = ['./', 'index.html', 'style.css', 'config.js', 'manifest.json', 'icon.svg', 'icon-180.png', 'icon-192.png',
  'js/app.js', 'js/i18n.js', 'js/ui.js', 'js/donnees.js', 'js/profil.js', 'js/avis-prompt.js', 'js/brouillon.js',
  'js/ecran-avis.js', 'js/ecran-fiche.js', 'js/connexion.js',
  'js/images.js', 'js/ecran-posts.js', 'js/posts-prompt.js', 'js/rappels.js'];

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

// Rappel de post : afficher la notification, et ouvrir l'onglet Posts quand on la touche
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Au Rendez-Vous', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'ardv', data: { url: d.url || './?onglet=posts' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './?onglet=posts', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenetres => {
    const f = fenetres.find(w => w.url.startsWith(self.registration.scope));
    return f ? f.navigate(url).then(w => (w || f).focus()) : self.clients.openWindow(url);
  }));
});
