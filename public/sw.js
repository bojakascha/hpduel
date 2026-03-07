const CACHE = 'hpduel-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Only cache GET requests
  if (request.method !== 'GET') return;

  // Don't cache Firebase/Google API requests
  const url = request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('identitytoolkit')
  ) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
