import { NextResponse } from "next/server";
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

type EstadoPedido = (typeof ESTADOS)[number];

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function normalizeEstado(
  value: unknown,
): EstadoPedido | null {
  if (
    typeof value === "string" &&
    ESTADOS.includes(
      value as EstadoPedido,
    )
  ) {
    return value as EstadoPedido;
  }

  return null;
}

function limpiarNombre(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(
  value: unknown,
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    if (
      date instanceof Date &&
      !Number.isNaN(date.getTime())
    ) {
      return date.toISOString();
    }
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value.toISOString();
  }

  return null;
}

function mapPedido(
  document: FirebaseFirestore.QueryDocumentSnapshot,
) {
  const data = document.data();

  return {
    id: document.id,

    usuarioId:
      typeof data.usuarioId === "string"
        ? data.usuarioId
        : "",

    productos:
      Array.isArray(data.productos)
        ? data.productos
        : [],

    subtotal:
      typeof data.subtotal === "number"
        ? data.subtotal
        : 0,

    total:
      typeof data.total === "number"
        ? data.total
        : 0,

    estado:
      normalizeEstado(data.estado) ??
      "pendiente",

    reservaId:
      typeof data.reservaId === "string"
        ? data.reservaId
        : null,

    IdMunicipalidad:
      typeof data.IdMunicipalidad ===
      "string"
        ? data.IdMunicipalidad
        : "",

    direccionEntrega:
      typeof data.direccionEntrega ===
      "string"
        ? data.direccionEntrega
        : "",

    repartidorId:
      typeof data.repartidorId ===
      "string"
        ? data.repartidorId
        : null,

    fechaCreacion:
      normalizeDate(
        data.fechaCreacion,
      ),

    ultimaActualizacion:
      normalizeDate(
        data.ultimaActualizacion,
      ),

    fechaCancelacion:
      normalizeDate(
        data.fechaCancelacion,
      ),
  };
}

export async function GET(
  request: Request,
) {
  try {
    await requireAdmin(request);

    const url = new URL(
      request.url,
    );

    const estadoParam =
      url.searchParams.get(
        "estado",
      );

    const estado = estadoParam
      ? normalizeEstado(
          estadoParam,
        )
      : null;

    if (
      estadoParam &&
      !estado
    ) {
      return errorResponse(
        "El estado solicitado no es válido.",
        400,
      );
    }

    /*
     * Obtener pedidos
     */
    const pedidosSnapshot =
      await adminDb
        .collection("pedidos")
        .get();

    const pedidosBase =
      pedidosSnapshot.docs.map(
        mapPedido,
      );

    /*
     * Obtener todos los usuarios
     * necesarios para resolver los nombres.
     *
     * Usamos getAll() para evitar
     * una consulta por cada pedido.
     */
    const usuarioIds = [
      ...new Set(
        pedidosBase
          .map(
            (pedido) =>
              pedido.usuarioId,
          )
          .filter(Boolean),
      ),
    ];

    const usuariosMap =
      new Map<
        string,
        string
      >();

    if (
      usuarioIds.length > 0
    ) {
      const referencias =
        usuarioIds.map(
          (uid) =>
            adminDb
              .collection(
                "usuarios",
              )
              .doc(uid),
        );

      const usuarios =
        await adminDb.getAll(
          ...referencias,
        );

      usuarios.forEach(
        (
          snapshot,
          index,
        ) => {
          if (
            !snapshot.exists
          ) {
            return;
          }

          const data =
            snapshot.data();

          if (!data) {
            return;
          }

          const nombres =
            limpiarNombre(
              data.Nombres,
            );

          const apellidos =
            limpiarNombre(
              data.Apellidos,
            );

          const nombreCompleto =
            `${nombres} ${apellidos}`.trim();

          if (
            nombreCompleto
          ) {
            usuariosMap.set(
              usuarioIds[index],
              nombreCompleto,
            );
          }
        },
      );
    }

    /*
     * Agregar nombre del cliente
     */
    let pedidos =
      pedidosBase.map(
        (pedido) => ({
          ...pedido,

          nombreCliente:
            usuariosMap.get(
              pedido.usuarioId,
            ) ??
            "Cliente no identificado",
        }),
      );

    /*
     * Filtro por estado
     */
    if (estado) {
      pedidos =
        pedidos.filter(
          (pedido) =>
            pedido.estado ===
            estado,
        );
    }

    /*
     * Más recientes primero
     */
    pedidos.sort(
      (a, b) => {
        if (
          !a.fechaCreacion
        ) {
          return 1;
        }

        if (
          !b.fechaCreacion
        ) {
          return -1;
        }

        return (
          new Date(
            b.fechaCreacion,
          ).getTime() -
          new Date(
            a.fechaCreacion,
          ).getTime()
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
      error instanceof Error &&
      error.message ===
        "NO_AUTH"
    ) {
      return errorResponse(
        "Debes iniciar sesión.",
        401,
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "FORBIDDEN"
    ) {
      return errorResponse(
        "Solo un administrador puede consultar los pedidos.",
        403,
      );
    }

    return errorResponse(
      "No fue posible cargar los pedidos.",
      500,
    );
  }
}