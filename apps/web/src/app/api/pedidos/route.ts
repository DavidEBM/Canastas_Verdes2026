import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthRole } from "@/lib/require-auth-role";

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
    /*
     * ============================================================
     * AUTENTICACIÓN Y ROL
     * ============================================================
     */

    const authenticatedUser =
      await requireAuthRole(request);

    const uid =
      authenticatedUser.uid;

    const role =
      authenticatedUser.role;

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
     * ============================================================
     * OBTENER PEDIDOS SEGÚN EL ROL
     * ============================================================
     *
     * admin:
     *   puede consultar todos.
     *
     * usuario:
     *   solamente pedidos creados por ese usuario.
     *
     * repartidor:
     *   solamente pedidos asignados a ese repartidor.
     */

    let pedidosQuery:
      FirebaseFirestore.Query =
      adminDb.collection("pedidos");

    if (role === "usuario") {
      pedidosQuery =
        pedidosQuery.where(
          "usuarioId",
          "==",
          uid,
        );
    }

    if (role === "repartidor") {
      pedidosQuery =
        pedidosQuery.where(
          "repartidorId",
          "==",
          uid,
        );
    }

    const pedidosSnapshot =
      await pedidosQuery.get();

    const pedidosBase =
      pedidosSnapshot.docs.map(
        mapPedido,
      );

    /*
     * ============================================================
     * OBTENER USUARIOS NECESARIOS
     * ============================================================
     *
     * Como la consulta ya está restringida
     * por rol, solamente resolvemos los
     * usuarios pertenecientes a esos pedidos.
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
     * ============================================================
     * AGREGAR NOMBRE DEL CLIENTE
     * ============================================================
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
     * ============================================================
     * FILTRO POR ESTADO
     * ============================================================
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
     * ============================================================
     * MÁS RECIENTES PRIMERO
     * ============================================================
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
        "No tienes permisos para consultar pedidos.",
        403,
      );
    }

    return errorResponse(
      "No fue posible cargar los pedidos.",
      500,
    );
  }
}