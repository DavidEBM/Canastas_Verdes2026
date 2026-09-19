import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_DAYS = 15;

function configureWebPush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Faltan las variables de entorno VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY."
    );
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );
}

function isAuthorized(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

function getDateDaysAgo(days: number) {
  const date = new Date();

  date.setDate(
    date.getDate() - days
  );

  return date;
}

export async function GET(
  request: NextRequest
) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Configuramos Web Push solamente cuando
     * se ejecuta realmente el endpoint.
     *
     * Esto evita que el build de Next.js falle
     * si las variables VAPID no están disponibles
     * durante la evaluación del módulo.
     */
    configureWebPush();

    const limitDate =
      getDateDaysAgo(REMINDER_DAYS);

    /*
     * Buscamos carritos activos que no hayan
     * sido modificados durante los últimos
     * 15 días.
     */
    const cartsSnapshot =
      await adminDb
        .collection("carritos")
        .where("activo", "==", true)
        .where(
          "actualizadoEn",
          "<=",
          limitDate
        )
        .limit(100)
        .get();

    let usuariosProcesados = 0;
    let notificacionesEnviadas = 0;
    let notificacionesFallidas = 0;

    for (const cartDoc of cartsSnapshot.docs) {
      const cart = cartDoc.data();

      const uid = cartDoc.id;

      /*
       * No enviar recordatorios para carritos
       * que no tengan productos.
       */
      const items = Array.isArray(
        cart.items
      )
        ? cart.items
        : [];

      if (items.length === 0) {
        continue;
      }

      /*
       * Evitamos enviar nuevamente el mismo
       * recordatorio antes de que transcurran
       * otros 15 días.
       */
      const ultimoRecordatorio =
        cart.recordatorioEnviadoEn;

      if (
        ultimoRecordatorio &&
        typeof ultimoRecordatorio.toDate ===
          "function"
      ) {
        const lastReminder =
          ultimoRecordatorio.toDate();

        const nextReminder = new Date(
          lastReminder
        );

        nextReminder.setDate(
          nextReminder.getDate() +
            REMINDER_DAYS
        );

        if (
          new Date() <
          nextReminder
        ) {
          continue;
        }
      }

      const subscriptionsSnapshot =
        await adminDb
          .collection("usuarios")
          .doc(uid)
          .collection("notificaciones")
          .where("activa", "==", true)
          .get();

      if (subscriptionsSnapshot.empty) {
        continue;
      }

      usuariosProcesados++;

      const notification = {
        title:
          "¿Todavía quieres tus productos?",
        body:
          "Tienes productos en tu cesta esperando por ti.",
        icon:
          "/images/logos/logo-canastas-verdes.svg",
        badge:
          "/images/logos/logo-canastas-verdes.svg",
        url: "/tienda",
        tag: `recordatorio-compra-${uid}`,
      };

      let userNotificationSent = false;

      for (
        const subscriptionDoc of
          subscriptionsSnapshot.docs
      ) {
        const subscription =
          subscriptionDoc.data();

        if (
          !subscription.endpoint ||
          !subscription.keys?.p256dh ||
          !subscription.keys?.auth
        ) {
          continue;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint:
                subscription.endpoint,

              keys: {
                p256dh:
                  subscription.keys.p256dh,
                auth:
                  subscription.keys.auth,
              },
            },
            JSON.stringify(
              notification
            )
          );

          notificacionesEnviadas++;
          userNotificationSent = true;
        } catch (error: unknown) {
          notificacionesFallidas++;

          console.error(
            "[recordatorios-compras] Error enviando notificación:",
            error
          );

          /*
           * 404 / 410 significa que la
           * suscripción ya no existe.
           */
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(
                  (
                    error as {
                      statusCode?: number;
                    }
                  ).statusCode
                )
              : undefined;

          if (
            statusCode === 404 ||
            statusCode === 410
          ) {
            await subscriptionDoc.ref.set(
              {
                activa: false,
                actualizadoEn:
                  new Date(),
              },
              {
                merge: true,
              }
            );
          }
        }
      }

      /*
       * Solo marcamos el recordatorio como
       * enviado si al menos un dispositivo
       * recibió correctamente el push.
       */
      if (userNotificationSent) {
        await cartDoc.ref.set(
          {
            recordatorioEnviadoEn:
              new Date(),
          },
          {
            merge: true,
          }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      usuariosProcesados,
      notificacionesEnviadas,
      notificacionesFallidas,
      carritosEncontrados:
        cartsSnapshot.size,
    });
  } catch (error) {
    console.error(
      "[recordatorios-compras]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error ejecutando los recordatorios.",
      },
      {
        status: 500,
      }
    );
  }
}

