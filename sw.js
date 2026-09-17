const BUILD_ID = '__BUILD_ID__';
const CACHE = 'warenentnahme-v' + BUILD_ID;

const ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/manifest.json',
  '/app/splash-logo.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // API-Anfragen nicht cachen.
  //
  // Geprueft wurde hier bis zum 17.09.2026 auf "/app/api/" mit Schraegstrich
  // am Ende — die Schnittstelle heisst aber "/app/api.php" und fiel damit
  // durch. Gecacht wurden so auch die Aufrufe mit Bestaetigungs- und
  // Reset-Code in der Adresse; die blieben danach im Cache des Geraets
  // stehen. Der Punkt statt des Schraegstrichs hat gereicht.
  if (url.pathname.startsWith('/app/api') || url.pathname.startsWith('/api')) return;
  // Adressen mit Einmalcodes gehoeren ebenfalls nie in den Cache.
  if (url.searchParams.has('reset') || url.searchParams.has('verify')
      || url.searchParams.has('token')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(resp => {
        if (resp.ok) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      });
      return cached || fresh;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
