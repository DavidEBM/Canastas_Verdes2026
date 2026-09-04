import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const ESTADOS = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

type Estado = (typeof ESTADOS)[number];

const TRANSICIONES: Record<
  Estado,
  Estado[]
> = {
  pendiente: [
    "asignado",
    "cancelado",
  ],

  asignado: [
    "en_camino",
    "cancelado",
  ],

  en_camino: [
    "entregado",
  ],

  entregado: [],

  cancelado: [],
};

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
          "Solo un administrador puede modificar estados.",
      },
      { status: 403 },
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
          "El estado indicado no es válido.",
      },
      { status: 400 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "TRANSICION_INVALIDA"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "El pedido no puede pasar a ese estado desde su estado actual.",
      },
      { status: 409 },
    );
  }

  console.error(
    "Error modificando estado del pedido:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible modificar el estado del pedido.",
    },
    { status: 500 },
  );
}

export async function POST(
  request: Request,
) {
  try {
    // Verifica usuarios/{UID}.Rol
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
      estado?: unknown;
    };

    const pedidoId =
      typeof input.pedidoId === "string"
        ? input.pedidoId.trim()
        : "";

    const nuevoEstado =
      typeof input.estado === "string"
        ? input.estado.trim()
        : "";

    if (
      !pedidoId ||
      !nuevoEstado
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El pedido y el nuevo estado son obligatorios.",
        },
        { status: 400 },
      );
    }

    if (
      !ESTADOS.includes(
        nuevoEstado as Estado,
      )
    ) {
      throw new Error(
        "ESTADO_INVALIDO",
      );
    }

    const estado =
      nuevoEstado as Estado;

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(pedidoId);

    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const snapshot =
            await transaction.get(
              pedidoRef,
            );

          if (!snapshot.exists) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const data =
            snapshot.data();

          if (!data) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const estadoActual: Estado =
            ESTADOS.includes(
              data.estado as Estado,
            )
              ? (data.estado as Estado)
              : "pendiente";

          /*
           * Si ya está en ese estado,
           * no hacemos ninguna modificación.
           */
          if (
            estadoActual === estado
          ) {
            return {
              pedidoId,
              estado,
            };
          }

          /*
           * Validamos la transición.
           */
          if (
            !TRANSICIONES[
              estadoActual
            ].includes(estado)
          ) {
            throw new Error(
              "TRANSICION_INVALIDA",
            );
          }

          const update: Record<
            string,
            unknown
          > = {
            estado,

            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

          if (
            estado === "entregado"
          ) {
            update.fechaEntrega =
              FieldValue.serverTimestamp();
          }

          if (
            estado === "cancelado"
          ) {
            update.fechaCancelacion =
              FieldValue.serverTimestamp();
          }

          transaction.update(
            pedidoRef,
            update,
          );

          return {
            pedidoId,
            estado,
          };
        },
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}