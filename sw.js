/* Generated build values. Cache public application files only, never CRM responses. */
const CACHE_NAME = "shalaby-static-1232b83fed0c5d64";
const PRECACHE_URLS = ["/assets/AuditLogPage-DyZMZ0P8.js","/assets/BranchesTeamsPage-DAbhSsWF.js","/assets/BrokersPage-CRIHcJTi.js","/assets/CRMContext-CsuULYO_.js","/assets/DepartmentDashboardPage-BwDn0X9n.js","/assets/DeveloperPage-BZIHFj-J.js","/assets/EmployeeRatings-C2EwMl5t.js","/assets/FeedbackPage-kLIJq2q4.js","/assets/OverviewPage-CT_sLpYi.js","/assets/PermissionsPage-BVLXsaXW.js","/assets/ReportsPage-DbP34SCU.js","/assets/SettingsPage-MB9GOiBN.js","/assets/StaffUsersPage-CIjwzX4q.js","/assets/TeamsPage-DKR4Eeg9.js","/assets/briefcase-CYDSCfv_.js","/assets/createLucideIcon-PyE1-Vna.js","/assets/demoData-PyNBLKau.js","/assets/index-D5zgwyRi.js","/assets/index-eiRujrLg.css","/assets/initialData-DrTBW_Ty.js","/assets/postSale-C5_2p7fn.js","/assets/trending-down-Miuk6NGT.js","/assets/trending-up-DUMfUOkW.js","/fonts/fonts.css","/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-400-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-500-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-600-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-700-normal.woff2","/icons/apple-touch-icon.png","/icons/favicon-32.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/offline.html"];
const CACHE_PREFIX = "shalaby-static-";
const STATIC_PATHS = new Set(
  PRECACHE_URLS.map((url) => new URL(url, self.location.origin).pathname),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

// The user explicitly accepts an update after saving their work.
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Reopening the CRM always checks the network. Offline never restores a cached
  // customer screen, local permissions, or an old copy of the application HTML.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(
            new URL("offline.html", self.registration.scope).pathname,
          )) || Response.error()
        );
      }),
    );
    return;
  }

  if (url.search || !STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic")
        await cache.put(url.pathname, response.clone());
      return response;
    })(),
  );
});
