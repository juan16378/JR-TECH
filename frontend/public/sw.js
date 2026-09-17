// Service worker mínimo para que JR Tech Store se pueda instalar como PWA.
// Estrategia "red primero, caché de respaldo": mientras haya internet
// siempre se sirve la versión más reciente del sitio (para no arriesgarse a
// mostrar una versión vieja después de un despliegue nuevo); solo se usa lo
// que quedó en caché cuando de verdad no hay conexión.

const CACHE_NAME = "jrtech-shell-v1";
const ARCHIVOS_ESTATICOS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/favicon.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_ESTATICOS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre !== CACHE_NAME).map((nombre) => caches.delete(nombre)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  // Solo GET: nunca se debe cachear ni interceptar POST/PUT/DELETE (login,
  // carrito, pedidos, etc.) — esos siempre deben ir directo a la API.
  if (evento.request.method !== "GET") return;

  // Las llamadas a la API del backend nunca se cachean: siempre deben
  // reflejar el estado más reciente (stock, pedidos, PQR, etc.).
  if (evento.request.url.includes("/api/")) return;

  evento.respondWith(
    fetch(evento.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request))
  );
});
