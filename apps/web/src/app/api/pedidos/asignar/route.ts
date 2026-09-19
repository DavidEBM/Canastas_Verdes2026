import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { sendUserNotification } from "@/lib/send-user-notification";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (
    error instanceof Error &&
    error.message === "NO_AUTH"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "FORBIDDEN"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Solo un administrador puede asignar repartidores.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "REPARTIDOR_INVALIDO"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "El usuario seleccionado no es un repartidor.",
      },
      { status: 400 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "PEDIDO_NO_ENCONTRADO"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "El pedido no existe.",
      },
      { status: 404 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "ESTADO_INVALIDO"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "El pedido no puede ser asignado en su estado actual.",
      },
      { status: 409 },
    );
  }

  console.error(
    "Error asignando repartidor:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible asignar el repartidor.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Solicitud inválida.",
        },
        { status: 400 },
      );
    }

    const input = body as {
      pedidoId?: unknown;
      repartidorId?: unknown;
    };

    const pedidoId =
      typeof input.pedidoId === "string"
        ? input.pedidoId.trim()
        : "";

    const repartidorId =
      typeof input.repartidorId === "string"
        ? input.repartidorId.trim()
        : "";

    if (!pedidoId || !repartidorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El pedido y el repartidor son obligatorios.",
        },
        { status: 400 },
      );
    }

    /*
     * Verificar que el usuario seleccionado
     * realmente sea un repartidor.
     */
    const repartidorRef = adminDb
      .collection("usuarios")
      .doc(repartidorId);

    const repartidorSnapshot =
      await repartidorRef.get();

    if (!repartidorSnapshot.exists) {
      throw new Error(
        "REPARTIDOR_INVALIDO",
      );
    }

    const repartidorData =
      repartidorSnapshot.data();

    if (!repartidorData) {
      throw new Error(
        "REPARTIDOR_INVALIDO",
      );
    }

    const rol =
      typeof repartidorData.Rol === "string"
        ? repartidorData.Rol
            .trim()
            .toLowerCase()
        : "";

    if (rol !== "repartidor") {
      throw new Error(
        "REPARTIDOR_INVALIDO",
      );
    }

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(pedidoId);

    /*
     * La notificación se enviará después
     * de que la transacción termine correctamente.
     */
    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const pedido =
            await transaction.get(
              pedidoRef,
            );

          if (!pedido.exists) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const data =
            pedido.data();

          if (!data) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const estado =
            typeof data.estado === "string"
              ? data.estado
              : "pendiente";

          if (
            estado !== "pendiente" &&
            estado !== "asignado"
          ) {
            throw new Error(
              "ESTADO_INVALIDO",
            );
          }

          const usuarioId =
            typeof data.usuarioId === "string"
              ? data.usuarioId.trim()
              : "";

          if (!usuarioId) {
            throw new Error(
              "USUARIO_PEDIDO_INVALIDO",
            );
          }

          transaction.update(
            pedidoRef,
            {
              repartidorId,

              estado: "asignado",

              fechaAsignacion:
                FieldValue.serverTimestamp(),

              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            },
          );

          return {
            pedidoId,
            repartidorId,
            usuarioId,
            estado: "asignado" as const,
          };
        },
      );

    /*
     * La transacción ya terminó correctamente.
     * Ahora enviamos la notificación al consumidor.
     *
     * Si el usuario no tiene notificaciones activadas,
     * el pedido igualmente queda asignado.
     */
    let notificacion = {
      enviados: 0,
      fallidos: 0,
    };

    try {
      notificacion =
        await sendUserNotification({
          userId: result.usuarioId,
          title:
            "Tu pedido fue asignado",
          body:
            `Tu pedido #${result.pedidoId} ya tiene un repartidor asignado. Pronto comenzará el reparto.`,
          url: "/dashboard/pedidos",
          tag: `pedido-asignado-${result.pedidoId}`,
        });
    } catch (notificationError) {
      /*
       * Un error de notificación no debe
       * deshacer la asignación del pedido.
       */
      console.error(
        "Error enviando notificación de asignación:",
        notificationError,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pedidoId: result.pedidoId,
        repartidorId: result.repartidorId,
        estado: result.estado,
      },
      notification: notificacion,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "USUARIO_PEDIDO_INVALIDO"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El pedido no tiene un consumidor asociado.",
        },
        { status: 400 },
      );
    }

    return errorResponse(error);
  }
}