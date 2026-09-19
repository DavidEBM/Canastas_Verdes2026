import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAuthRole } from "@/lib/require-auth-role";
import {
  normalizeEstado,
} from "@/lib/pedidos/estados";

export const runtime = "nodejs";

const TIPOS_ENTREGA = [
  "domicilio",
  "recogida",
] as const;

type TipoEntrega =
  (typeof TIPOS_ENTREGA)[number];

type PedidoListado = Record<
  string,
  unknown
> & {
  id: string;
  usuarioId?: string;
  repartidorId?: string | null;
  estado:
    | "pendiente"
    | "asignado"
    | "en_camino"
    | "entregado"
    | "cancelado";
  tipoEntrega: TipoEntrega;
  fechaCreacion: string | null;
  ultimaActualizacion: string | null;
  fechaEntrega: string | null;
  fechaCancelacion: string | null;
  usuarioNombre: string;
  repartidorNombre: string;
};

function normalizeTipoEntrega(
  value: unknown,
): TipoEntrega {
  if (
    value === "recogida"
  ) {
    return "recogida";
  }

  return "domicilio";
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

function limpiarNombre(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeDate(
  value: unknown,
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      )
        .toDate()
        .toISOString();
    } catch {
      return null;
    }
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return null;
}

function mapPedido(
  id: string,
  data: Record<
    string,
    unknown
  >,
): PedidoListado {
  return {
    ...data,

    id,

    usuarioId:
      typeof data.usuarioId ===
      "string"
        ? data.usuarioId
        : undefined,

    repartidorId:
      typeof data.repartidorId ===
        "string"
        ? data.repartidorId
        : null,

    estado:
      normalizeEstado(
        data.estado,
      ) ?? "pendiente",

    tipoEntrega:
      normalizeTipoEntrega(
        data.tipoEntrega,
      ),

    fechaCreacion:
      normalizeDate(
        data.fechaCreacion,
      ),

    ultimaActualizacion:
      normalizeDate(
        data.ultimaActualizacion,
      ),

    fechaEntrega:
      normalizeDate(
        data.fechaEntrega,
      ),

    fechaCancelacion:
      normalizeDate(
        data.fechaCancelacion,
      ),

    usuarioNombre:
      limpiarNombre(
        data.usuarioNombre,
      ),

    repartidorNombre:
      limpiarNombre(
        data.repartidorNombre,
      ),
  };
}

export async function GET(
  request: Request,
) {
  try {
    const auth =
      await requireAuthRole(
        request,
      );

    const url =
      new URL(
        request.url,
      );

    const estadoParam =
      url.searchParams.get(
        "estado",
      );

    const estadoFiltro =
      estadoParam
        ? normalizeEstado(
            estadoParam,
          )
        : null;

    if (
      estadoParam &&
      !estadoFiltro
    ) {
      return errorResponse(
        "El estado indicado no es válido.",
        400,
      );
    }

    const snapshot =
      await adminDb
        .collection("pedidos")
        .get();

    const pedidos =
      snapshot.docs
        .map(
          (doc) =>
            mapPedido(
              doc.id,
              doc.data(),
            ),
        )
        .filter(
          (pedido) => {
            if (
              estadoFiltro &&
              pedido.estado !==
                estadoFiltro
            ) {
              return false;
            }

            if (
              auth.role ===
              "consumidor"
            ) {
              return (
                pedido.usuarioId ===
                auth.uid
              );
            }

            if (
              auth.role ===
              "repartidor"
            ) {
              return (
                pedido.repartidorId ===
                auth.uid
              );
            }

            return true;
          },
        )
        .sort(
          (
            a,
            b,
          ) => {
            const dateA =
              a.fechaCreacion
                ? new Date(
                    a.fechaCreacion,
                  ).getTime()
                : 0;

            const dateB =
              b.fechaCreacion
                ? new Date(
                    b.fechaCreacion,
                  ).getTime()
                : 0;

            return (
              dateB -
              dateA
            );
          },
        );

    return NextResponse.json({
      success: true,
      data: pedidos,
    });
  } catch (error) {
    console.error(
      "Error obteniendo pedidos:",
      error,
    );

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        "NO_AUTH"
      ) {
        return errorResponse(
          "Debes iniciar sesión.",
          401,
        );
      }

      if (
        error.message ===
        "FORBIDDEN"
      ) {
        return errorResponse(
          "No tienes permiso para consultar estos pedidos.",
          403,
        );
      }
    }

    return errorResponse(
      "No fue posible obtener los pedidos.",
      500,
    );
  }
}