self.addEventListener("install", () => {
  globalThis.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("notorium-static-"))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => globalThis.clients.claim()),
  );
});
