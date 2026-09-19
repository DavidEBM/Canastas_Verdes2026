import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

function getToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.substring(7);
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(
  request: NextRequest
) {
  try {
    const idToken = getToken(request);

    if (!idToken) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(idToken);

    const adminSnapshot =
      await adminDb
        .collection("usuarios")
        .doc(decoded.uid)
        .get();

    if (!adminSnapshot.exists) {
      return NextResponse.json(
        {
          error: "Usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    const role =
      adminSnapshot.data()?.Rol;

    if (role !== "admin") {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para enviar notificaciones.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const userIds = Array.isArray(
      body.userIds
    )
      ? body.userIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" &&
            id.trim().length > 0
        )
      : [];

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.body === "string"
        ? body.body.trim()
        : "";

    const url =
      typeof body.url === "string"
        ? body.url
        : "/";

    if (!userIds.length) {
      return NextResponse.json(
        {
          error:
            "Debes indicar al menos un usuario.",
        },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        {
          error:
            "title y body son obligatorios.",
        },
        { status: 400 }
      );
    }

    const subscriptions: Array<{
      ref: FirebaseFirestore.DocumentReference;
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    }> = [];

    for (const userId of userIds) {
      const snapshot =
        await adminDb
          .collection("usuarios")
          .doc(userId)
          .collection("notificaciones")
          .where("activa", "==", true)
          .get();

      snapshot.forEach((doc) => {
        const data = doc.data();

        if (
          data.endpoint &&
          data.keys?.p256dh &&
          data.keys?.auth
        ) {
          subscriptions.push({
            ref: doc.ref,
            endpoint: data.endpoint,
            keys: {
              p256dh: data.keys.p256dh,
              auth: data.keys.auth,
            },
          });
        }
      });
    }

    let enviados = 0;
    let fallidos = 0;

    for (const item of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: item.endpoint,
            keys: item.keys,
          },
          JSON.stringify({
            title,
            body: message,
            icon:
              "/images/logos/logo-canastas-verdes.svg",
            badge:
              "/images/logos/logo-canastas-verdes.svg",
            url,
          })
        );

        enviados++;
      } catch (error: unknown) {
        fallidos++;

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? Number(
                (error as {
                  statusCode?: number;
                }).statusCode
              )
            : undefined;

        if (
          statusCode === 404 ||
          statusCode === 410
        ) {
          await item.ref.set(
            {
              activa: false,
              actualizadoEn: new Date(),
            },
            {
              merge: true,
            }
          );
        }

        console.error(
          "[Web Push]",
          error
        );
      }
    }

    return NextResponse.json({
      ok: true,
      enviados,
      fallidos,
      total:
        subscriptions.length,
    });
  } catch (error) {
    console.error(
      "[notifications/send]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron enviar las notificaciones.",
      },
      { status: 500 }
    );
  }
}