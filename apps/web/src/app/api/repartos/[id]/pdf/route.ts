import { NextRequest, NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import { generarPDFReparto } from "@/lib/repartos/pdf";

import type {
  ClienteReparto,
  MunicipalidadReparto,
  Pedido,
  PuntoRecogidaPedido,
  RepartidorReparto,
} from "@/lib/repartos/types";

export const runtime = "nodejs";

/*
 * ============================================================
 * Tipos
 * ============================================================
 */

type Rol =
  | "admin"
  | "repartidor"
  | "usuario";

/*
 * ============================================================
 * Utilidades
 * ============================================================
 */

function normalizarTexto(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .trim();
}

function obtenerCampo(
  data: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null
    ) {
      return data[key];
    }
  }

  return undefined;
}

function obtenerNombreCompleto(
  data: Record<string, unknown>,
): string {
  const nombres =
    normalizarTexto(
      obtenerCampo(
        data,
        "Nombres",
        "nombres",
        "Nombre",
        "nombre",
      ),
    );

  const apellidos =
    normalizarTexto(
      obtenerCampo(
        data,
        "Apellidos",
        "apellidos",
        "Apellido",
        "apellido",
      ),
    );

  return `${nombres} ${apellidos}`
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ============================================================
 * Roles
 * ============================================================
 */

function normalizarRol(
  value: unknown,
): Rol {
  if (
    typeof value !== "string"
  ) {
    return "usuario";
  }

  const rol =
    value
      .trim()
      .toLowerCase();

  if (rol === "admin") {
    return "admin";
  }

  if (rol === "repartidor") {
    return "repartidor";
  }

  return "usuario";
}

function obtenerRolDesdeClaims(
  decoded: Record<string, unknown>,
): Rol | null {
  const role =
    decoded.role ??
    decoded.Rol ??
    decoded.rol;

  if (
    role === "admin" ||
    role === "repartidor"
  ) {
    return normalizarRol(role);
  }

  return null;
}

async function obtenerRolDesdeFirestore(
  uid: string,
): Promise<Rol> {
  const usuarioSnap =
    await adminDb
      .collection("usuarios")
      .doc(uid)
      .get();

  if (!usuarioSnap.exists) {
    return "usuario";
  }

  const usuarioData =
    usuarioSnap.data() as Record<
      string,
      unknown
    >;

  return normalizarRol(
    usuarioData.Rol ??
      usuarioData.rol ??
      usuarioData.Role ??
      usuarioData.role,
  );
}

/*
 * ============================================================
 * Usuario
 * ============================================================
 */

async function obtenerUsuario(
  uid: string | null,
) {
  if (!uid) {
    return null;
  }

  const snap =
    await adminDb
      .collection("usuarios")
      .doc(uid)
      .get();

  if (!snap.exists) {
    return null;
  }

  return snap.data() as Record<
    string,
    unknown
  >;
}

/*
 * ============================================================
 * GET /api/repartos/[id]/pdf
 * ============================================================
 */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await context.params;

    /*
     * ========================================================
     * Validar ID
     * ========================================================
     */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ORDER",
          message:
            "No se especificó el pedido.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ========================================================
     * AUTENTICACIÓN
     * ========================================================
     */

    const authorization =
      request.headers.get(
        "authorization",
      );

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_AUTH",
          message:
            "No autenticado.",
        },
        {
          status: 401,
        },
      );
    }

    const token =
      authorization
        .substring(
          "Bearer ".length,
        )
        .trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_AUTH",
          message:
            "Token no proporcionado.",
        },
        {
          status: 401,
        },
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        token,
      );

    /*
     * ========================================================
     * AUTORIZACIÓN
     * ========================================================
     */

    let role =
      obtenerRolDesdeClaims(
        decoded as Record<
          string,
          unknown
        >,
      );

    if (!role) {
      role =
        await obtenerRolDesdeFirestore(
          decoded.uid,
        );
    }

    if (
      role !== "admin" &&
      role !== "repartidor"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message:
            "No tienes permisos para generar este recibo.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * ========================================================
     * PEDIDO
     * ========================================================
     */

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(id);

    const pedidoSnap =
      await pedidoRef.get();

    if (!pedidoSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message:
            "El pedido no existe.",
        },
        {
          status: 404,
        },
      );
    }

    const pedidoData =
      pedidoSnap.data() as Record<
        string,
        unknown
      >;

    const usuarioId =
      typeof pedidoData.usuarioId ===
      "string"
        ? pedidoData.usuarioId
        : null;

    const repartidorId =
      typeof pedidoData.repartidorId ===
      "string"
        ? pedidoData.repartidorId
        : null;

    /*
     * ========================================================
     * SEGURIDAD DEL REPARTIDOR
     * ========================================================
     */

    if (
      role === "repartidor" &&
      repartidorId !== decoded.uid
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message:
            "Este pedido no está asignado a este repartidor.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * ========================================================
     * DATOS RELACIONADOS
     * ========================================================
     */

    const municipalidadId =
      typeof pedidoData.IdMunicipalidad ===
      "string"
        ? pedidoData.IdMunicipalidad
        : "";

    const [
      clienteData,
      repartidorData,
      municipalidadSnap,
    ] = await Promise.all([
      obtenerUsuario(
        usuarioId,
      ),

      obtenerUsuario(
        repartidorId,
      ),

      municipalidadId
        ? adminDb
            .collection(
              "municipalidades",
            )
            .doc(
              municipalidadId,
            )
            .get()
        : Promise.resolve(null),
    ]);

    const municipalidadData =
      municipalidadSnap?.exists
        ? (municipalidadSnap.data() as Record<
            string,
            unknown
          >)
        : null;

    /*
     * ========================================================
     * CLIENTE
     * ========================================================
     */

    const cliente: ClienteReparto =
      {
        id:
          usuarioId ?? "",

        nombres:
          normalizarTexto(
            obtenerCampo(
              clienteData ?? {},
              "Nombres",
              "nombres",
              "Nombre",
              "nombre",
            ),
          ),

        apellidos:
          normalizarTexto(
            obtenerCampo(
              clienteData ?? {},
              "Apellidos",
              "apellidos",
              "Apellido",
              "apellido",
            ),
          ),

        correo:
          normalizarTexto(
            obtenerCampo(
              clienteData ?? {},
              "Correo",
              "correo",
              "email",
              "Email",
            ),
          ),

        telefono:
          normalizarTexto(
            obtenerCampo(
              clienteData ?? {},
              "Telefono",
              "telefono",
              "Teléfono",
              "phone",
            ),
          ),

        direccion:
          normalizarTexto(
            obtenerCampo(
              clienteData ?? {},
              "Direccion",
              "direccion",
              "Dirección",
            ),
          ),

        nombreCompleto:
          obtenerNombreCompleto(
            clienteData ?? {},
          ) ||
          "Cliente",
      };

    /*
     * ========================================================
     * REPARTIDOR
     * ========================================================
     */

    let repartidor:
      | RepartidorReparto
      | null = null;

    if (repartidorId) {
      const datos =
        repartidorData ?? {};

      repartidor = {
        id: repartidorId,

        nombres:
          normalizarTexto(
            obtenerCampo(
              datos,
              "Nombres",
              "nombres",
              "Nombre",
              "nombre",
            ),
          ),

        apellidos:
          normalizarTexto(
            obtenerCampo(
              datos,
              "Apellidos",
              "apellidos",
              "Apellido",
              "apellido",
            ),
          ),

        correo:
          normalizarTexto(
            obtenerCampo(
              datos,
              "Correo",
              "correo",
              "email",
              "Email",
            ),
          ),

        telefono:
          normalizarTexto(
            obtenerCampo(
              datos,
              "Telefono",
              "telefono",
              "Teléfono",
              "phone",
            ),
          ),

        nombreCompleto:
          obtenerNombreCompleto(
            datos,
          ) ||
          "Repartidor",
      };
    }

    /*
     * ========================================================
     * MUNICIPALIDAD
     * ========================================================
     */

    const municipalidad: MunicipalidadReparto =
      {
        id:
          municipalidadId,

        nombre:
          normalizarTexto(
            obtenerCampo(
              municipalidadData ?? {},
              "Nombre",
              "nombre",
            ),
          ) ||
          "Municipalidad no registrada",
      };

    /*
     * ========================================================
     * PRODUCTOS
     * ========================================================
     */

    const productosData =
      Array.isArray(
        pedidoData.productos,
      )
        ? pedidoData.productos
        : [];

    const productos =
      productosData.map(
        (producto) => {
          const item =
            producto &&
            typeof producto ===
              "object"
              ? (producto as Record<
                  string,
                  unknown
                >)
              : {};

          const cantidad =
            Number(
              item.cantidad ??
                0,
            );

          const precioUnitario =
            Number(
              item.precioUnitario ??
                0,
            );

          const subtotal =
            Number(
              item.subtotal ??
                cantidad *
                  precioUnitario,
            );

          return {
            productoId:
              String(
                item.productoId ??
                  item.id ??
                  "",
              ),

            code:
              normalizarTexto(
                item.code,
              ),

            nombre:
              normalizarTexto(
                item.nombre ??
                  item.Nombre,
              ),

            cantidad,

            precioUnitario,

            subtotal,

            unidad:
              normalizarTexto(
                item.unidad ??
                  item.presentacion,
              ),

            IdProductor:
              normalizarTexto(
                item.IdProductor,
              ),

            IdMunicipalidad:
              normalizarTexto(
                item.IdMunicipalidad,
              ),
          };
        },
      );

    /*
     * ========================================================
     * COSTOS
     * ========================================================
     */

    const subtotalProductos =
      Number(
        pedidoData.subtotal ??
          pedidoData.total ??
          0,
      );

    const entrega =
      Number(
        pedidoData.entrega ??
          0,
      );

    const logistica =
      Number(
        pedidoData.logistica ??
          0,
      );

    const almacenamiento =
      Number(
        pedidoData.almacenamiento ??
          0,
      );

    const total =
      Number(
        pedidoData.total ??
          subtotalProductos +
            entrega +
            logistica +
            almacenamiento,
      );

    /*
     * ========================================================
     * DATOS DE ENTREGA
     * ========================================================
     */

    const tipoEntrega =
      pedidoData.tipoEntrega ===
      "recogida"
        ? "recogida"
        : "domicilio";

    const telefonoEntrega =
      normalizarTexto(
        pedidoData.telefonoEntrega,
      );

    const IdPuntoRecogida =
      typeof pedidoData.IdPuntoRecogida ===
      "string"
        ? pedidoData.IdPuntoRecogida
        : "";

    /*
     * ========================================================
     * PUNTO DE RECOGIDA
     * ========================================================
     */

    const puntoRecogida:
      | PuntoRecogidaPedido
      | null =
      pedidoData.puntoRecogida &&
      typeof pedidoData.puntoRecogida ===
        "object"
        ? (() => {
            const data =
              pedidoData.puntoRecogida as Record<
                string,
                unknown
              >;

            return {
              nombre:
                normalizarTexto(
                  data.nombre ??
                    data.Nombre,
                ),

              direccion:
                normalizarTexto(
                  data.direccion ??
                    data.Direccion,
                ),

              municipio:
                normalizarTexto(
                  data.municipio ??
                    data.Municipio,
                ),
            };
          })()
        : null;

    /*
     * ========================================================
     * PEDIDO NORMALIZADO
     * ========================================================
     */

    const pedido: Pedido =
      {
        id,

        usuarioId:
          usuarioId ?? "",

        productos,

        subtotal:
          subtotalProductos,

        total,

        estado:
          String(
            pedidoData.estado ??
              "pendiente",
          ) as Pedido["estado"],

        reservaId:
          typeof pedidoData.reservaId ===
          "string"
            ? pedidoData.reservaId
            : "",

        IdMunicipalidad:
          municipalidadId,

        direccionEntrega:
          normalizarTexto(
            pedidoData.direccionEntrega,
          ),

        tipoEntrega,

        telefonoEntrega,

        IdPuntoRecogida,

        puntoRecogida,

        repartidorId,

        fechaCreacion:
          pedidoData.fechaCreacion ??
          null,

        ultimaActualizacion:
          pedidoData.ultimaActualizacion ??
          null,

        fechaCancelacion:
          pedidoData.fechaCancelacion ??
          null,
      };

    /*
     * ========================================================
     * FIRMA
     * ========================================================
     */

    const firma =
      pedidoData.firma &&
      typeof pedidoData.firma ===
        "object"
        ? pedidoData.firma
        : null;

    /*
     * ========================================================
     * GENERAR PDF
     * ========================================================
     */

    const pdfBytes =
      await generarPDFReparto({
        id,

        pedido,

        cliente,

        repartidor,

        municipalidad,

        tipoEntrega,

        costos: {
          subtotalProductos,
          entrega,
          logistica,
          almacenamiento,
          total,
        },

        firma,
      });

    /*
     * ========================================================
     * RESPUESTA
     * ========================================================
     */

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="recibo-pedido-${id}.pdf"`,

          "Cache-Control":
            "no-store",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "Error generando PDF del reparto:",
      error,
    );

    if (
      error instanceof Error &&
      error.message
        .toLowerCase()
        .includes("token")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_AUTH",
          message:
            "La sesión no es válida o ha expirado.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "PDF_ERROR",
        message:
          "No fue posible generar el recibo PDF.",
      },
      {
        status: 500,
      },
    );
  }
}
