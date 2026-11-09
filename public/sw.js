// Notifications only. No fetch handler and no caching: this is not an app-shell service worker.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "The Family Wallet";
      let body = "Open the wallet to see what's new.";
      let url = "/";
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const res = await fetch("/api/push/latest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          if (res.ok) {
            const data = await res.json();
            title = data.title || title;
            body = data.body || body;
            url = data.url || url;
          }
        }
      } catch {
        // Show the generic message: browsers require every push to display something.
      }
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
        tag: "family-wallet",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      if (open) return open.navigate(url).then((c) => (c || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
