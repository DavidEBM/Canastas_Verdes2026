import webpush from "web-push";

import { adminDb } from "@/lib/firebase-admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendUserNotification({
  userId,
  title,
  body,
  url = "/",
  tag = "canastas-verdes",
}: NotificationInput) {
  const subscriptionsSnapshot =
    await adminDb
      .collection("usuarios")
      .doc(userId)
      .collection("notificaciones")
      .where("activa", "==", true)
      .get();

  if (subscriptionsSnapshot.empty) {
    return {
      enviados: 0,
      fallidos: 0,
    };
  }

  let enviados = 0;
  let fallidos = 0;

  const notification = {
    title,
    body,
    icon: "/images/logos/logo-canastas-verdes.svg",
    badge: "/images/logos/logo-canastas-verdes.svg",
    url,
    tag,
  };

  for (const subscriptionDoc of subscriptionsSnapshot.docs) {
    const data = subscriptionDoc.data();

    if (
      typeof data.endpoint !== "string" ||
      typeof data.keys?.p256dh !== "string" ||
      typeof data.keys?.auth !== "string"
    ) {
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: data.endpoint,
          keys: {
            p256dh: data.keys.p256dh,
            auth: data.keys.auth,
          },
        },
        JSON.stringify(notification),
      );

      enviados++;
    } catch (error: unknown) {
      fallidos++;

      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error
          ? Number(
              (
                error as {
                  statusCode?: number;
                }
              ).statusCode,
            )
          : undefined;

      console.error(
        "[sendUserNotification]",
        error,
      );

      if (
        statusCode === 404 ||
        statusCode === 410
      ) {
        await subscriptionDoc.ref.set(
          {
            activa: false,
            actualizadoEn: new Date(),
          },
          { merge: true },
        );
      }
    }
  }

  return {
    enviados,
    fallidos,
  };
}