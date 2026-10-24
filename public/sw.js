const VERSION = "v2";
const STATIC_CACHE = `lifeos-static-${VERSION}`;
const PAGE_CACHE = `lifeos-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_PAGES = ["/staff/login", "/staff/pos"];
const NAVIGATION_TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function shouldStore(request, response) {
  return new URL(request.url).pathname.startsWith("/staff") && response.ok && !response.redirected;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      await pages.add(OFFLINE_URL);
      await Promise.allSettled(PRECACHE_PAGES.map((url) => pages.add(url)));
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("lifeos-") && !keep.has(name)).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

async function navigate(request) {
  const cache = await caches.open(PAGE_CACHE);
  const store = fetch(request).then((response) => {
    if (shouldStore(request, response)) cache.put(request, response.clone());
    return response;
  });

  try {
    return await withTimeout(store, NAVIGATION_TIMEOUT_MS);
  } catch {
    store.catch(() => {});
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    return (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function warm(urls) {
  const cache = await caches.open(STATIC_CACHE);
  const origin = self.location.origin;
  const wanted = urls.filter((value) => {
    try {
      const url = new URL(value, origin);
      return url.origin === origin && url.pathname.startsWith("/_next/static/");
    } catch {
      return false;
    }
  });
  await Promise.allSettled(
    wanted.map(async (value) => {
      const request = new Request(value);
      if (await cache.match(request)) return;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response);
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;
  event.waitUntil(warm(data.urls));
});