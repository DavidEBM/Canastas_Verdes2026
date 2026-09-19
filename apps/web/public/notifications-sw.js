self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data;

  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Canastas Verdes",
      body: event.data.text(),
    };
  }

  const title = data.title || "Canastas Verdes";

  const options = {
    body: data.body || "",
    icon:
      data.icon ||
      "/images/logos/logo-canastas-verdes.svg",
    badge:
      data.badge ||
      "/images/logos/logo-canastas-verdes.svg",
    data: {
      url: data.url || "/",
      ...(data.data || {}),
    },
    tag: data.tag || "canastas-verdes",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification?.data?.url || "/";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              try {
                await client.navigate(url);
              } catch (error) {
                console.error(
                  "[notifications-sw] Error navegando:",
                  error
                );
              }

              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url);
          }

          return undefined;
        })
    );
  }
);

