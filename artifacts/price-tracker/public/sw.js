// Forex Alarm push service worker.
//
// Scope is the directory this file is served from (set by the base path at
// registration time), so it only ever controls this app's own routes.
// Kept intentionally minimal: no caching/offline strategy, just push
// notification delivery + click-to-focus, since the app itself requires a
// live network connection to show real prices anyway.

self.addEventListener("install", () => {
  // Activate immediately; nothing to precache.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Forex Alarm", body: "A target price was hit." };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Not JSON — fall back to defaults above.
  }

  const scopePath = self.registration.scope;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || `forex-alarm-${Date.now()}`,
      icon: `${scopePath}logo.svg`,
      badge: `${scopePath}favicon.svg`,
      requireInteraction: true,
      data: { url: scopePath },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
});
