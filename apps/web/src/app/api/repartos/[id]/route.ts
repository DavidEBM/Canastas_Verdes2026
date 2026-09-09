import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

type Rol =
  | "usuario"
  | "repartidor"
  | "admin";

type PedidoData = Record<string, unknown>;

interface UsuarioData {
  nombre?: unknown;
  Nombre?: unknown;
  nombres?: unknown;
  apellidos?: unknown;
  Apellidos?: unknown;
  email?: unknown;
  correo?: unknown;
  telefono?: unknown;
  celular?: unknown;
  Rol?: unknown;
  rol?: unknown;
  Role?: unknown;
  role?: unknown;
}

interface MunicipalidadData {
  Nombre?: unknown;
  nombre?: unknown;
}

/*
 * ====================================================
 * AUTENTICACIÓN
 * ====================================================
 */

function tokenFrom(
  request: Request,
): string | null {
  const value =
    request.headers.get(
      "authorization",
    );

  if (
    !value?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    value
      .slice(7)
      .trim();

  return token || null;
}

function normalizeRole(
  value: unknown,
): Rol {
  if (
    typeof value !==
    "string"
  ) {
    return "usuario";
  }

  const role =
    value
      .trim()
      .toLowerCase();

  if (
    role === "admin"
  ) {
    return "admin";
  }

  if (
    role === "repartidor"
  ) {
    return "repartidor";
  }

  return "usuario";
}

function roleFromClaims(
  claims: Record<
    string,
    unknown
  >,
): Rol | null {
  const role =
    claims.role ??
    claims.Rol ??
    claims.rol;

  if (
    role === "admin" ||
    role === "repartidor"
  ) {
    return normalizeRole(
      role,
    );
  }

  return null;
}

async function authenticate(
  request: Request,
) {
  const token =
    tokenFrom(request);

  if (!token) {
    throw new Error(
      "NO_AUTH",
    );
  }

  const user =
    await adminAuth.verifyIdToken(
      token,
    );

  let role =
    roleFromClaims(
      user as Record<
        string,
        unknown
      >,
    );

  if (!role) {
    const usuarioSnap =
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .get();

    if (
      usuarioSnap.exists
    ) {
      const usuarioData =
        usuarioSnap.data() as Record<
          string,
          unknown
        >;

      role =
        normalizeRole(
          usuarioData.Rol ??
            usuarioData.rol ??
            usuarioData.Role ??
            usuarioData.role,
        );
    } else {
      role = "usuario";
    }
  }

  return {
    user,
    role,
  };
}

/*
 * ====================================================
 * UTILIDADES
 * ====================================================
 */

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

function textValue(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result || null;
}

function numberValue(
  value: unknown,
): number {
  if (
    typeof value ===
    "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }

  return 0;
}

function timestampToMillis(
  value: unknown,
): number | null {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    const candidate =
      value as {
        toMillis?: () => number;
        seconds?: number;
        _seconds?: number;
      };

    if (
      typeof candidate.toMillis ===
      "function"
    ) {
      return candidate.toMillis();
    }

    if (
      typeof candidate.seconds ===
      "number"
    ) {
      return (
        candidate.seconds * 1000
      );
    }

    if (
      typeof candidate._seconds ===
      "number"
    ) {
      return (
        candidate._seconds * 1000
      );
    }
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Date.parse(value);

    if (
      !Number.isNaN(parsed)
    ) {
      return parsed;
    }
  }

  if (
    typeof value ===
    "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function nombreUsuario(
  data: UsuarioData | null,
): string {
  if (!data) {
    return "Sin nombre";
  }

  const nombre =
    textValue(
      data.nombre ??
        data.Nombre ??
        data.nombres,
    );

  const apellidos =
    textValue(
      data.apellidos ??
        data.Apellidos,
    );

  if (
    nombre &&
    apellidos
  ) {
    return `${nombre} ${apellidos}`;
  }

  return (
    nombre ??
    apellidos ??
    "Sin nombre"
  );
}

function correoUsuario(
  data: UsuarioData | null,
): string | null {
  if (!data) {
    return null;
  }

  return textValue(
    data.email ??
      data.correo,
  );
}

function telefonoUsuario(
  data: UsuarioData | null,
): string | null {
  if (!data) {
    return null;
  }

  return textValue(
    data.telefono ??
      data.celular,
  );
}

function nombreMunicipalidad(
  data: MunicipalidadData | null,
): string {
  if (!data) {
    return "Sin municipio";
  }

  return (
    textValue(
      data.Nombre ??
        data.nombre,
    ) ??
    "Sin municipio"
  );
}

/*
 * ====================================================
 * GET
 * ====================================================
 *
 * Obtiene un reparto individual.
 *
 * ADMIN:
 *   Puede consultar cualquiera.
 *
 * REPARTIDOR:
 *   Solamente puede consultar uno asignado a él.
 *
 * USUARIO:
 *   No tiene acceso al módulo de repartos.
 */

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const {
      user,
      role,
    } =
      await authenticate(
        request,
      );

    if (
      role !== "admin" &&
      role !== "repartidor"
    ) {
      return errorResponse(
        "No tienes permiso para consultar repartos.",
        403,
      );
    }

    const { id } =
      await params;

    const repartoId =
      id.trim();

    if (!repartoId) {
      return errorResponse(
        "El reparto es obligatorio.",
        400,
      );
    }

    const pedidoSnap =
      await adminDb
        .collection("pedidos")
        .doc(repartoId)
        .get();

    if (
      !pedidoSnap.exists
    ) {
      return errorResponse(
        "El reparto no existe.",
        404,
      );
    }

    const pedidoData =
      pedidoSnap.data() as PedidoData;

    /*
     * Solo se consideran pedidos que pertenecen
     * al flujo de reparto.
     */

    const estado =
      textValue(
        pedidoData.estado,
      );

    const estadosReparto = [
      "pendiente",
      "asignado",
      "en_camino",
      "entregado",
    ];

    if (
      !estado ||
      !estadosReparto.includes(
        estado,
      )
    ) {
      return errorResponse(
        "Este pedido no pertenece al flujo de repartos.",
        409,
      );
    }

    /*
     * Seguridad del repartidor.
     */

    if (
      role === "repartidor" &&
      pedidoData.repartidorId !==
        user.uid
    ) {
      return errorResponse(
        "Este reparto no está asignado a ti.",
        403,
      );
    }

    /*
     * ==================================================
     * USUARIO
     * ==================================================
     */

    let cliente:
      | {
          id: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
        }
      | null = null;

    const usuarioId =
      textValue(
        pedidoData.usuarioId,
      );

    if (usuarioId) {
      const usuarioSnap =
        await adminDb
          .collection("usuarios")
          .doc(usuarioId)
          .get();

      if (
        usuarioSnap.exists
      ) {
        const usuarioData =
          usuarioSnap.data() as UsuarioData;

        cliente = {
          id: usuarioSnap.id,
          nombre:
            nombreUsuario(
              usuarioData,
            ),
          email:
            correoUsuario(
              usuarioData,
            ),
          telefono:
            telefonoUsuario(
              usuarioData,
            ),
        };
      }
    }

    /*
     * ==================================================
     * REPARTIDOR
     * ==================================================
     */

    let repartidor:
      | {
          id: string;
          nombre: string;
          email: string | null;
          telefono: string | null;
        }
      | null = null;

    const repartidorId =
      textValue(
        pedidoData.repartidorId,
      );

    if (repartidorId) {
      const repartidorSnap =
        await adminDb
          .collection("usuarios")
          .doc(repartidorId)
          .get();

      if (
        repartidorSnap.exists
      ) {
        const repartidorData =
          repartidorSnap.data() as UsuarioData;

        repartidor = {
          id: repartidorSnap.id,
          nombre:
            nombreUsuario(
              repartidorData,
            ),
          email:
            correoUsuario(
              repartidorData,
            ),
          telefono:
            telefonoUsuario(
              repartidorData,
            ),
        };
      }
    }

    /*
     * ==================================================
     * MUNICIPALIDAD
     * ==================================================
     */

    let municipalidad:
      | {
          id: string;
          nombre: string;
        }
      | null = null;

    const municipalidadId =
      textValue(
        pedidoData.IdMunicipalidad,
      );

    if (
      municipalidadId
    ) {
      const municipalidadSnap =
        await adminDb
          .collection(
            "municipalidades",
          )
          .doc(
            municipalidadId,
          )
          .get();

      if (
        municipalidadSnap.exists
      ) {
        const municipalidadData =
          municipalidadSnap.data() as MunicipalidadData;

        municipalidad = {
          id:
            municipalidadSnap.id,
          nombre:
            nombreMunicipalidad(
              municipalidadData,
            ),
        };
      }
    }

    /*
     * ==================================================
     * PRODUCTOS
     * ==================================================
     */

    const productos =
      Array.isArray(
        pedidoData.productos,
      )
        ? pedidoData.productos
        : [];

    let cantidadProductos =
      productos.length;

    let cantidadUnidades = 0;

    for (
      const producto of productos
    ) {
      if (
        typeof producto ===
          "object" &&
        producto !== null
      ) {
        const item =
          producto as Record<
            string,
            unknown
          >;

        const cantidad =
          numberValue(
            item.cantidad ??
              item.quantity ??
              item.cantidadUnidades ??
              0,
          );

        cantidadUnidades +=
          cantidad;
      }
    }

    /*
     * ==================================================
     * COSTOS
     * ==================================================
     */

    const subtotal =
      numberValue(
        pedidoData.subtotal,
      );

    const total =
      numberValue(
        pedidoData.total,
      );

    /*
     * ==================================================
     * RESPUESTA
     * ==================================================
     */

    const fechaCreacion =
      timestampToMillis(
        pedidoData.fechaCreacion,
      );

    const reparto = {
      id: pedidoSnap.id,

      pedido: {
        id: pedidoSnap.id,
        usuarioId:
          usuarioId,
        productos,
        subtotal,
        total,
        estado,
        reservaId:
          pedidoData.reservaId ??
          null,
        IdMunicipalidad:
          pedidoData.IdMunicipalidad ??
          null,
        direccionEntrega:
          pedidoData.direccionEntrega ??
          null,
        repartidorId:
          pedidoData.repartidorId ??
          null,
        fechaCreacion:
          pedidoData.fechaCreacion ??
          null,
        ultimaActualizacion:
          pedidoData.ultimaActualizacion ??
          null,
        fechaCancelacion:
          pedidoData.fechaCancelacion ??
          null,
        fechaRecibido:
          pedidoData.fechaRecibido ??
          null,
        firma:
          pedidoData.firma ??
          null,
      },

      cliente,

      repartidor,

      municipalidad,

      costos: {
        subtotalProductos:
          subtotal,
        entrega: 0,
        logistica: 0,
        almacenamiento: 0,
        total,
      },

      modalidadEntrega:
        pedidoData.modalidadEntrega ===
        "recogida"
          ? "recogida"
          : "domicilio",

      firma:
        pedidoData.firma ??
        null,

      resumen: {
        id: pedidoSnap.id,
        estado,
        clienteNombre:
          cliente?.nombre ??
          "Sin nombre",
        municipioNombre:
          municipalidad?.nombre ??
          "Sin municipio",
        repartidorNombre:
          repartidor?.nombre ??
          "Sin asignar",
        cantidadProductos,
        cantidadUnidades,
        total,
        fechaCreacion,
      },
    };

    return NextResponse.json({
      success: true,
      data: reparto,
    });
  } catch (error) {
    console.error(
      "Error obteniendo reparto:",
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

    return errorResponse(
      "No fue posible obtener el reparto.",
      500,
    );
  }
}