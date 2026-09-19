"use client";

import { auth } from "@/lib/firebase";

export async function registerNotificationServiceWorker() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "Este navegador no soporta Service Workers."
    );
  }

  return navigator.serviceWorker.register(
    "/notifications-sw.js",
    {
      scope: "/",
    }
  );
}

export async function requestNotificationPermission() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    throw new Error(
      "Este navegador no soporta notificaciones."
    );
  }

  if (Notification.permission === "granted") {
    return "granted" as NotificationPermission;
  }

  if (Notification.permission === "denied") {
    return "denied" as NotificationPermission;
  }

  return Notification.requestPermission();
}

export async function subscribeToNotifications() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Debes iniciar sesión para activar las notificaciones."
    );
  }

  const permission =
    await requestNotificationPermission();

  if (permission !== "granted") {
    throw new Error(
      "El navegador no permitió las notificaciones."
    );
  }

  const registration =
    await registerNotificationServiceWorker();

  if (!("PushManager" in window)) {
    throw new Error(
      "Este navegador no soporta Web Push."
    );
  }

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY."
    );
  }

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          publicKey
        ),
      });
  }

  const idToken = await user.getIdToken();

  const response = await fetch(
    "/api/notifications/subscribe",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "No se pudo guardar la suscripción."
    );
  }

  return subscription;
}

export async function unsubscribeFromNotifications() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const registration =
    await navigator.serviceWorker.getRegistration(
      "/notifications-sw.js"
    );

  if (!registration) {
    return;
  }

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const idToken = await user.getIdToken();

  await fetch(
    "/api/notifications/subscribe",
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    }
  );

  await subscription.unsubscribe();
}

function urlBase64ToUint8Array(
  base64String: string
) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
}