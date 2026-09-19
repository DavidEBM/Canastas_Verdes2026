import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import {
  normalizeEstado,
  puedeTransicionar,
} from "@/lib/pedidos/estados";
import { sendUserNotification } from "@/lib/send-user-notification";

export const runtime = "nodejs";

function errorResponse(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    switch (
      error.message
    ) {
      case "NO_AUTH":
        return NextResponse.json(
          {
            success: false,
            message:
              "Debes iniciar sesión.",
          },
          { status: 401 },
        );

      case "FORBIDDEN":
        return NextResponse.json(
          {
            success: false,
            message:
              "No tienes permisos para modificar estados.",
          },
          { status: 403 },
        );

      case "PEDIDO_NO_ENCONTRADO":
        return NextResponse.json(
          {
            success: false,
            message:
              "El pedido no existe.",
          },
          { status: 404 },
        );

      case "ESTADO_INVALIDO":
        return NextResponse.json(
          {
            success: false,
            message:
              "El estado indicado no es válido.",
          },
          { status: 400 },
        );

      case "TRANSICION_INVALIDA":
        return NextResponse.json(
          {
            success: false,
            message:
              "El cambio de estado no está permitido.",
          },
          { status: 409 },
        );

      case "USUARIO_PEDIDO_INVALIDO":
        return NextResponse.json(
          {
            success: false,
            message:
              "El pedido no tiene un consumidor asociado.",
          },
          { status: 400 },
        );
    }
  }

  console.error(
    "Error modificando estado:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible actualizar el estado del pedido.",
    },
    { status: 500 },
  );
}

export async function POST(
  request: Request,
) {
  try {
    await requireAdmin(
      request,
    );

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      throw new Error(
        "ESTADO_INVALIDO",
      );
    }

    const {
      pedidoId,
      nuevoEstado,
    } =
      body as {
        pedidoId?: unknown;
        nuevoEstado?: unknown;
      };

    if (
      typeof pedidoId !==
        "string" ||
      !pedidoId.trim()
    ) {
      throw new Error(
        "PEDIDO_NO_ENCONTRADO",
      );
    }

    const estado =
      normalizeEstado(
        nuevoEstado,
      );

    if (!estado) {
      throw new Error(
        "ESTADO_INVALIDO",
      );
    }

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(
          pedidoId.trim(),
        );

    const resultado =
      await adminDb.runTransaction(
        async (
          transaction,
        ) => {
          const snapshot =
            await transaction.get(
              pedidoRef,
            );

          if (
            !snapshot.exists
          ) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const data =
            snapshot.data() ??
            {};

          const estadoActual =
            normalizeEstado(
              data.estado,
            ) ?? "pendiente";

          if (
            estadoActual ===
            estado
          ) {
            return {
              cambio: false,
              pedidoId:
                pedidoId.trim(),
              estadoActual,
              nuevoEstado: estado,
              usuarioId:
                typeof data.usuarioId ===
                "string"
                  ? data.usuarioId.trim()
                  : "",
              tipoEntrega:
                typeof data.tipoEntrega ===
                "string"
                  ? data.tipoEntrega
                      .trim()
                      .toLowerCase()
                  : "",
            };
          }

          if (
            !puedeTransicionar(
              estadoActual,
              estado,
            )
          ) {
            throw new Error(
              "TRANSICION_INVALIDA",
            );
          }

          const usuarioId =
            typeof data.usuarioId ===
            "string"
              ? data.usuarioId.trim()
              : "";

          if (!usuarioId) {
            throw new Error(
              "USUARIO_PEDIDO_INVALIDO",
            );
          }

          const tipoEntrega =
            typeof data.tipoEntrega ===
            "string"
              ? data.tipoEntrega
                  .trim()
                  .toLowerCase()
              : "";

          const updates: Record<
            string,
            unknown
          > = {
            estado,
            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

          if (
            estado ===
            "entregado"
          ) {
            updates.fechaEntrega =
              FieldValue.serverTimestamp();
          }

          if (
            estado ===
            "cancelado"
          ) {
            updates.fechaCancelacion =
              FieldValue.serverTimestamp();
          }

          transaction.update(
            pedidoRef,
            updates,
          );

          return {
            cambio: true,
            pedidoId:
              pedidoId.trim(),
            estadoActual,
            nuevoEstado: estado,
            usuarioId,
            tipoEntrega,
          };
        },
      );

    let notificacion = {
      enviados: 0,
      fallidos: 0,
    };

    /*
     * Si el estado realmente cambió,
     * enviamos la notificación correspondiente.
     */
    if (
      resultado.cambio &&
      resultado.usuarioId
    ) {
      let title = "";
      let body = "";
      let tag = "";

      /*
       * DOMICILIO:
       *
       * asignado -> en_camino
       */
      if (
        resultado.nuevoEstado ===
          "en_camino" &&
        resultado.tipoEntrega ===
          "domicilio"
      ) {
        title =
          "Tu pedido está en camino";

        body =
          `El pedido #${resultado.pedidoId} ya salió para ser entregado en tu domicilio.`;

        tag =
          `pedido-en-camino-${resultado.pedidoId}`;
      }

      /*
       * RECOGIDA:
       *
       * asignado -> en_camino
       *
       * En recogida usamos este estado como
       * indicación de que ya está disponible.
       */
      else if (
        resultado.nuevoEstado ===
          "en_camino" &&
        resultado.tipoEntrega ===
          "recogida"
      ) {
        title =
          "Tu pedido está listo para recoger";

        body =
          `El pedido #${resultado.pedidoId} ya está disponible para recoger en el punto correspondiente.`;

        tag =
          `pedido-listo-recoger-${resultado.pedidoId}`;
      }

      /*
       * PEDIDO ENTREGADO
       */
      else if (
        resultado.nuevoEstado ===
        "entregado"
      ) {
        title =
          "Pedido entregado";

        body =
          `Tu pedido #${resultado.pedidoId} ha sido entregado correctamente.`;

        tag =
          `pedido-entregado-${resultado.pedidoId}`;
      }

      /*
       * PEDIDO CANCELADO
       */
      else if (
        resultado.nuevoEstado ===
        "cancelado"
      ) {
        title =
          "Pedido cancelado";

        body =
          `El pedido #${resultado.pedidoId} ha sido cancelado.`;

        tag =
          `pedido-cancelado-${resultado.pedidoId}`;
      }

      /*
       * Solo enviamos si existe una
       * notificación definida para ese estado.
       */
      if (
        title &&
        body &&
        tag
      ) {
        try {
          notificacion =
            await sendUserNotification({
              userId:
                resultado.usuarioId,
              title,
              body,
              url:
                "/dashboard/pedidos",
              tag,
            });
        } catch (
          notificationError
        ) {
          console.error(
            "Error enviando notificación de pedido:",
            notificationError,
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        resultado.cambio
          ? "Estado actualizado correctamente."
          : "El pedido ya tenía ese estado.",
      data: {
        pedidoId:
          resultado.pedidoId,
        estado:
          resultado.nuevoEstado,
      },
      notification:
        notificacion,
    });
  } catch (error) {
    return errorResponse(
      error,
    );
  }
}