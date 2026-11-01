import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAuthRole } from "@/lib/require-auth-role";
import {
  normalizeEstado,
} from "@/lib/pedidos/estados";
import { matchesTolerantSearch } from "@/lib/search";

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
  numeroPedido: number | null;
  numeroPedidoVisible: string;
  usuarioId?: string;
  repartidorId?: string | null;
  direccionEntrega?: unknown;
  IdMunicipalidad?: unknown;
  municipioNombre?: string;
  puntoRecogida?: unknown;
  productos?: unknown;
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

function productSearchValues(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const product = item as Record<string, unknown>;
    return [product.nombre, product.code, product.productoId];
  });
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

    numeroPedido:
      Number.isFinite(Number(data.numeroPedido))
        ? Number(data.numeroPedido)
        : null,

    numeroPedidoVisible:
      typeof data.numeroPedidoVisible === "string" &&
      data.numeroPedidoVisible.trim()
        ? data.numeroPedidoVisible.trim()
        : Number.isFinite(Number(data.numeroPedido))
          ? `CV-${String(Number(data.numeroPedido)).padStart(6, "0")}`
          : "",

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

    municipioNombre:
      limpiarNombre(
        data.municipioNombre,
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

    const search =
      url.searchParams.get("q")?.trim() ?? "";

    const paginationRequested =
      url.searchParams.has("page") ||
      url.searchParams.has("pageSize");
    const parsedPage = Number.parseInt(
      url.searchParams.get("page") ?? "1",
      10,
    );
    const parsedPageSize = Number.parseInt(
      url.searchParams.get("pageSize") ?? "25",
      10,
    );
    const page = Number.isFinite(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;
    const pageSize = Number.isFinite(parsedPageSize)
      ? Math.min(100, Math.max(1, parsedPageSize))
      : 25;

    const snapshot =
      await adminDb
        .collection("pedidos")
        .get();

    const [usersSnapshot, municipalitiesSnapshot] =
      await Promise.all([
        adminDb.collection("usuarios").get(),
        adminDb.collection("municipalidades").get(),
      ]);
    const userNames = new Map<string, string>();
    for (const document of usersSnapshot.docs) {
      const data = document.data();
      const complete = limpiarNombre(data.NombreCompleto);
      const fallback = `${limpiarNombre(data.Nombres)} ${limpiarNombre(data.Apellidos)}`.trim();
      userNames.set(document.id, complete || fallback || limpiarNombre(data.Correo));
    }

    const municipalityNames = new Map<string, string>();
    for (const document of municipalitiesSnapshot.docs) {
      const data = document.data();
      const name = limpiarNombre(
        data.Nombre ?? data.nombre ?? data.name,
      );
      if (name) {
        municipalityNames.set(document.id, name);
        const storedId = limpiarNombre(data.Id ?? data.id);
        if (storedId) {
          municipalityNames.set(storedId, name);
        }
      }
    }

    const pedidos =
      snapshot.docs
        .map((doc) => {
          const pedido = mapPedido(doc.id, doc.data());
          return {
            ...pedido,
            usuarioNombre:
              pedido.usuarioNombre || userNames.get(pedido.usuarioId ?? "") || "",
            repartidorNombre:
              pedido.repartidorNombre || userNames.get(pedido.repartidorId ?? "") || "",
            municipioNombre:
              pedido.municipioNombre ||
              municipalityNames.get(
                limpiarNombre(pedido.IdMunicipalidad),
              ) ||
              "",
          };
        })
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

            if (
              search &&
              !matchesTolerantSearch(
                [
                  pedido.numeroPedidoVisible,
                  pedido.numeroPedido,
                  pedido.id,
                  pedido.usuarioNombre,
                  pedido.repartidorNombre,
                  pedido.direccionEntrega,
                  pedido.IdMunicipalidad,
                  pedido.municipioNombre,
                  pedido.tipoEntrega,
                  typeof pedido.puntoRecogida === "object" &&
                  pedido.puntoRecogida !== null
                    ? (pedido.puntoRecogida as Record<string, unknown>).nombre
                    : "",
                  typeof pedido.puntoRecogida === "object" &&
                  pedido.puntoRecogida !== null
                    ? (pedido.puntoRecogida as Record<string, unknown>).direccion
                    : "",
                  typeof pedido.puntoRecogida === "object" &&
                  pedido.puntoRecogida !== null
                    ? (pedido.puntoRecogida as Record<string, unknown>).municipio
                    : "",
                  ...productSearchValues(pedido.productos),
                ],
                search,
              )
            ) {
              return false;
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
              dateB - dateA ||
              (b.numeroPedido ?? 0) - (a.numeroPedido ?? 0) ||
              b.id.localeCompare(a.id)
            );
          },
        );

    const total = pedidos.length;
    const data = paginationRequested
      ? pedidos.slice((page - 1) * pageSize, page * pageSize)
      : pedidos;

    return NextResponse.json({
      success: true,
      data,
      ...(paginationRequested
        ? {
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.max(1, Math.ceil(total / pageSize)),
            },
          }
        : {}),
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
