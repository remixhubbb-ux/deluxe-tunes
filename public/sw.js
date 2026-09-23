const CACHE_NAME = "deluxe-tunes-offline-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || Response.error();
  }
}

// Audio is bundled locally. When used on the web, cache the complete file on
// first play so later playback remains available without a connection.
// Range requests are served from the cached full response when possible.
async function handleAudio(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const key = new Request(url.href, { method: "GET" });
  let full = await cache.match(key);

  if (!full) {
    try {
      const response = await fetch(key);
      if (!response.ok) return response;
      await cache.put(key, response.clone());
      full = response;
    } catch {
      return Response.error();
    }
  }

  const range = request.headers.get("range");
  if (!range) return full;

  const match = /bytes=(\d+)-(\d*)/i.exec(range);
  if (!match) return full;

  const blob = await full.blob();
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : blob.size - 1;
  const end = Math.min(requestedEnd, blob.size - 1);

  if (start >= blob.size || end < start) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${blob.size}` }
    });
  }

  const body = blob.slice(start, end + 1);
  return new Response(body, {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Length": String(body.size),
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/audio/")) {
    event.respondWith(handleAudio(request));
    return;
  }

  // App code, CSS, images and other local assets use cache-first with a
  // network fallback, making the already-visited app usable offline.
  event.respondWith(cacheFirst(request));
});
