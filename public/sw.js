// FreshTrack service worker: only shows/handles notifications. No offline caching.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Tapping a notification focuses an open FreshTrack tab (and switches it to Pantry) or opens a new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("/?tab=pantry", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.postMessage({ type: "open-tab", tab: "pantry" });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
