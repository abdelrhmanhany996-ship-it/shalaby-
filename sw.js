/* Generated build values. Cache public application files only, never CRM responses. */
const CACHE_NAME = "shalaby-static-ccaea6f502645e2a";
const PRECACHE_URLS = ["/assets/AccountsPage-DFP_AcnR.js","/assets/AuditLogPage-PMjW2EAv.js","/assets/BranchesTeamsPage-Dxj2kh5p.js","/assets/BrokersPage-BYAwS7-c.js","/assets/CRMContext-CqK_mxYc.js","/assets/DepartmentDashboardPage-DF5kQYil.js","/assets/DeveloperPage-Cx01YKi-.js","/assets/EmployeeRatings-eyjJLUUK.js","/assets/FeedbackPage-BlgFJ5XZ.js","/assets/OverviewPage-Cx6hTXPD.js","/assets/PermissionsPage-CIz6YI1K.js","/assets/ReportsPage-DbzWOj8q.js","/assets/SettingsPage-bnHsqkoa.js","/assets/StaffUsersPage-VEl6IPXz.js","/assets/TargetsPage-ah7KUjlQ.js","/assets/TeamsPage-Cq10kQAy.js","/assets/briefcase-_UQuZKHs.js","/assets/chevron-left-BCbPahXN.js","/assets/createLucideIcon-QVR7F4YR.js","/assets/demoData-DUYmFIj2.js","/assets/index-3qk7YLML.css","/assets/index-cZ5kmJNU.js","/assets/initialData-DrTBW_Ty.js","/assets/postSale-20QHrbrW.js","/assets/reportExports-CG2I2qnP.js","/assets/trending-down-CZnhEJwU.js","/assets/trending-up-BEwnmkNg.js","/fonts/fonts.css","/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2","/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-400-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-500-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-600-normal.woff2","/fonts/ibm-plex-sans-arabic-latin-700-normal.woff2","/icons/apple-touch-icon.png","/icons/favicon-32.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/offline.html"];
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
