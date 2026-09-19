import { NextRequest, NextResponse } from "next/server";

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

function getSubscriptionId(
  endpoint: string
) {
  return Buffer.from(endpoint)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

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

    const body = await request.json();

    const subscription =
      body?.subscription;

    if (
      !subscription ||
      typeof subscription.endpoint !==
        "string" ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        {
          error:
            "La suscripción del navegador es inválida.",
        },
        { status: 400 }
      );
    }

    const endpoint =
      subscription.endpoint;

    const subscriptionId =
      getSubscriptionId(endpoint);

    const ref = adminDb
      .collection("usuarios")
      .doc(decoded.uid)
      .collection("notificaciones")
      .doc(subscriptionId);

    await ref.set(
      {
        endpoint,
        keys: {
          p256dh:
            subscription.keys.p256dh,
          auth:
            subscription.keys.auth,
        },

        plataforma: "web",

        activa: true,

        actualizadoEn: new Date(),
      },
      {
        merge: true,
      }
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "[notifications/subscribe POST]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la suscripción.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const body = await request.json();

    const endpoint =
      typeof body?.endpoint === "string"
        ? body.endpoint
        : "";

    if (!endpoint) {
      return NextResponse.json(
        {
          error:
            "El endpoint es obligatorio.",
        },
        { status: 400 }
      );
    }

    const subscriptionId =
      getSubscriptionId(endpoint);

    await adminDb
      .collection("usuarios")
      .doc(decoded.uid)
      .collection("notificaciones")
      .doc(subscriptionId)
      .set(
        {
          activa: false,
          actualizadoEn: new Date(),
        },
        {
          merge: true,
        }
      );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "[notifications/subscribe DELETE]",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo desactivar la suscripción.",
      },
      { status: 500 }
    );
  }
}