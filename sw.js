const CACHE = 'bensol-v13';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './supabase-client.js', './supabase-auth.js', './supabase-db.js', './visitas-schemas.js', './visitas-form.js', './visitas-db.js', './presu-idiomas.js', './bc3-import.js', './icon-192.png?v=5', './icon-512.png?v=5', './icon-maskable.png?v=5', './logo-trans.png?v=5', './logo-blanco.png?v=5', './logo-s-blanco.png?v=5', './fondo-login.jpg', './icon-180.png?v=5', './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js', './vendor/pdf-lib.min.js'];

// Al instalarse una versión nueva NO se activa sola: se queda esperando y la
// app enseña el cartel de «Actualizar». Antes se activaba y recargaba por su
// cuenta; ahora es la persona quien pulsa, y hasta que pulsa no puede seguir.
// (Si no hay ninguna versión controlando la página, sí se activa al momento:
// es la primera instalación y no hay nada que actualizar.)
self.addEventListener('install', (e) => {
  // Los archivos se piden a la red (cache: 'reload'), no a la caché del
  // navegador: si no, un logo cambiado con el mismo nombre seguía saliendo viejo.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(async () => {
    const abiertas = await self.clients.matchAll({ includeUncontrolled: true });
    if (!abiertas.some((c) => c.frameType === 'top-level' && self.registration.active)) return self.skipWaiting();
  }));
});

// El botón «Actualizar» de la app manda esto: la versión que esperaba pasa a
// mandar y la página se recarga (controllerchange).
self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'activar') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// El CÓDIGO de la app (la página y sus módulos) va a la RED PRIMERO, con el
// caché como red de seguridad si no hay cobertura.
//
// Antes iba al revés y por eso el móvil se quedaba con una versión vieja: al
// abrir la app se pintaba lo cacheado y la versión nueva se guardaba por
// detrás, así que solo se veía en la apertura SIGUIENTE. Si la app se queda
// abierta en segundo plano y nunca recarga de verdad, esa apertura siguiente
// puede no llegar en días, y se acumulan versiones de retraso.
//
// Las imágenes sí siguen saliendo del caché al instante: no cambian y así la
// app abre rápido.
const esCodigo = (req, url) =>
  req.mode === 'navigate'
  || url.pathname.endsWith('/')
  || /\.(html|js|webmanifest)$/i.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Nunca cachear ni interceptar llamadas a Supabase (datos/auth/realtime):
  // deben ir siempre a la red para que la app online muestre datos reales.
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.hostname.endsWith('.supabase.co')) return;

  if (esCodigo(req, url)) {
    e.respondWith(
      // `cache: 'no-cache'` obliga a preguntar al servidor si hay versión nueva
      // (una petición condicional con ETag, muy barata). Sin esto, GitHub Pages
      // manda `max-age=600` y el navegador devolvía su copia de hasta 10
      // minutos sin preguntar: la app nueva estaba publicada y el móvil seguía
      // con la anterior.
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
