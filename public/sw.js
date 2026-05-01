const CACHE_NAME = "notorium-static-v3";
const STATIC_ASSETS = [
  "/",
  "/icons/notorium-192.png",
  "/icons/notorium-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  self.clients.claim();
});

function isCacheableRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") {
    return false;
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/actions/") ||
    url.pathname.startsWith("/_next/server")
  ) {
    return false;
  }

  return true;
}

self.addEventListener("fetch", (event) => {
  if (!isCacheableRequest(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
