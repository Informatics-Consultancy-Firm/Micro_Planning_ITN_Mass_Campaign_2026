/* ICF-SL Micro Planning: keeps the app and facilities.csv on the phone so the link opens offline.
   Network first, so updates arrive when there is internet; the saved copy is used when there is none.
   Requests to the Google Apps Script are never cached. */
const CACHE = 'micro-planning-v1';
const FILES = ['./', './micro_planning.html', './facilities.csv', './sw.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (url.origin === self.location.origin || url.hostname.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) =>
          hit || (req.mode === 'navigate' ? caches.match('./micro_planning.html') : Response.error())
        )
      )
  );
});
