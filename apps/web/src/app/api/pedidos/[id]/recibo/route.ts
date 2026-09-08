import {
  NextRequest,
  NextResponse,
} from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAuthRole } from "@/lib/require-auth-role";

import {
  generarPDFReparto,
  type RepartoPDFData,
} from "@/lib/repartos/pdf";

export const runtime = "nodejs";

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

interface ProductoRecibo {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
}

interface ClienteRecibo {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  direccion: string;
}

interface RepartidorRecibo {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string;
}

interface MunicipalidadRecibo {
  id: string;
  nombre: string;
}

interface FirmaRecibo {
  metodo: "manuscrita" | "texto";
  valor: string | null;
  recibidoPor: string | null;
  fechaRecibido: string | null;
}

/*
 * ============================================================
 * FUNCIONES AUXILIARES
 * ============================================================
 */

function limpiarTexto(
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

function numero(
  value: unknown,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function convertirFecha(
  value: unknown,
): string | null {
  if (!value) {
    return null;
  }

  /*
   * Firestore Timestamp
   */
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    try {
      const date = (
        value as {
          toDate: () => Date;
        }
      ).toDate();

      if (
        date instanceof Date &&
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        return date.toISOString();
      }
    } catch {
      return null;
    }
  }

  /*
   * Timestamp serializado
   */
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = numero(
      (
        value as {
          seconds?: unknown;
        }
      ).seconds,
    );

    if (seconds > 0) {
      const date = new Date(
        seconds * 1000,
      );

      if (
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        return date.toISOString();
      }
    }
  }

  /*
   * Fecha como string
   */
  if (typeof value === "string") {
    const date = new Date(value);

    if (
      !Number.isNaN(
        date.getTime(),
      )
    ) {
      return date.toISOString();
    }
  }

  /*
   * Fecha como Date
   */
  if (value instanceof Date) {
    if (
      !Number.isNaN(
        value.getTime(),
      )
    ) {
      return value.toISOString();
    }
  }

  return null;
}

function nombreCompleto(
  nombres: unknown,
  apellidos: unknown,
): string {
  return [
    limpiarTexto(nombres),
    limpiarTexto(apellidos),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function errorResponse(
  status: number,
  error: string,
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
    },
    { status },
  );
}

/*
 * ============================================================
 * GET /api/pedidos/[id]/recibo
 * ============================================================
 *
 * Permisos:
 *
 * admin:
 *   Puede consultar cualquier pedido.
 *
 * usuario:
 *   Solo puede consultar sus propios pedidos.
 *
 * repartidor:
 *   Solo puede consultar pedidos que tenga asignados.
 *
 * Adicionalmente:
 *
 *   El pedido debe estar en estado "entregado".
 *
 * El endpoint devuelve un PDF real generado mediante
 * generarPDFReparto().
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
    /*
     * ========================================================
     * 1. AUTENTICACIÓN
     * ========================================================
     */

    const authenticatedUser =
      await requireAuthRole(
        request,
      );

    const uid =
      authenticatedUser.uid;

    const role =
      authenticatedUser.role;

    /*
     * ========================================================
     * 2. ID DEL PEDIDO
     * ========================================================
     */

    const { id } =
      await context.params;

    const pedidoId =
      id?.trim();

    if (!pedidoId) {
      return errorResponse(
        400,
        "INVALID_ID",
        "No se proporcionó un ID de pedido válido.",
      );
    }

    /*
     * ========================================================
     * 3. OBTENER PEDIDO
     * ========================================================
     */

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(pedidoId);

    const pedidoSnap =
      await pedidoRef.get();

    if (!pedidoSnap.exists) {
      return errorResponse(
        404,
        "NOT_FOUND",
        "El pedido solicitado no existe.",
      );
    }

    const pedido =
      pedidoSnap.data();

    if (!pedido) {
      return errorResponse(
        400,
        "INVALID_ORDER",
        "Los datos del pedido no son válidos.",
      );
    }

    /*
     * ========================================================
     * 4. AUTORIZACIÓN POR ROL
     * ========================================================
     */

    const usuarioId =
      typeof pedido.usuarioId === "string"
        ? pedido.usuarioId.trim()
        : "";

    const repartidorId =
      typeof pedido.repartidorId === "string"
        ? pedido.repartidorId.trim()
        : "";

    /*
     * ADMIN
     *
     * Puede consultar cualquier pedido.
     */
    if (role === "admin") {
      // Permitido.
    }

    /*
     * USUARIO
     *
     * Solo puede consultar sus propios pedidos.
     */
    else if (role === "usuario") {
      if (
        !usuarioId ||
        usuarioId !== uid
      ) {
        return errorResponse(
          403,
          "FORBIDDEN",
          "No tienes permisos para consultar el recibo de este pedido.",
        );
      }
    }

    /*
     * REPARTIDOR
     *
     * Solo puede consultar pedidos asignados a él.
     */
    else if (
      role === "repartidor"
    ) {
      if (
        !repartidorId ||
        repartidorId !== uid
      ) {
        return errorResponse(
          403,
          "FORBIDDEN",
          "No tienes permisos para consultar el recibo de este pedido.",
        );
      }
    }

    /*
     * requireAuthRole() ya valida el rol,
     * pero mantenemos esta protección defensiva.
     */
    else {
      return errorResponse(
        403,
        "FORBIDDEN",
        "No tienes permisos para consultar este pedido.",
      );
    }

    /*
     * ========================================================
     * 5. VALIDAR ESTADO
     * ========================================================
     */

    if (
      pedido.estado !==
      "entregado"
    ) {
      return errorResponse(
        409,
        "NOT_DELIVERED",
        "Este pedido todavía no cuenta con una entrega confirmada.",
      );
    }

    /*
     * ========================================================
     * 6. CLIENTE
     * ========================================================
     */

    let cliente: ClienteRecibo = {
      id: usuarioId,
      nombres: "",
      apellidos: "",
      nombreCompleto: "",
      correo: "",
      telefono: "",
      direccion:
        limpiarTexto(
          pedido.direccionEntrega,
        ),
    };

    if (usuarioId) {
      const usuarioSnap =
        await adminDb
          .collection("usuarios")
          .doc(usuarioId)
          .get();

      if (usuarioSnap.exists) {
        const usuario =
          usuarioSnap.data();

        if (usuario) {
          const nombres =
            limpiarTexto(
              usuario.Nombres,
            );

          const apellidos =
            limpiarTexto(
              usuario.Apellidos,
            );

          cliente = {
            id: usuarioId,

            nombres,

            apellidos,

            nombreCompleto:
              nombreCompleto(
                nombres,
                apellidos,
              ),

            correo:
              limpiarTexto(
                usuario.Correo,
              ),

            telefono:
              limpiarTexto(
                usuario.Telefono,
              ),

            direccion:
              limpiarTexto(
                pedido.direccionEntrega,
              ) ||
              limpiarTexto(
                usuario.Direccion,
              ),
          };
        }
      }
    }

    /*
     * ========================================================
     * 7. REPARTIDOR
     * ========================================================
     */

    let repartidor:
      | RepartidorRecibo
      | null = null;

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
          repartidorSnap.data();

        if (repartidorData) {
          const nombres =
            limpiarTexto(
              repartidorData.Nombres,
            );

          const apellidos =
            limpiarTexto(
              repartidorData.Apellidos,
            );

          repartidor = {
            id: repartidorId,

            nombres,

            apellidos,

            nombreCompleto:
              nombreCompleto(
                nombres,
                apellidos,
              ),

            telefono:
              limpiarTexto(
                repartidorData.Telefono,
              ),
          };
        }
      }
    }

    /*
     * ========================================================
     * 8. MUNICIPALIDAD
     * ========================================================
     */

    let municipalidad:
      | MunicipalidadRecibo
      | null = null;

    const municipalidadId =
      limpiarTexto(
        pedido.IdMunicipalidad,
      );

    if (municipalidadId) {
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
          municipalidadSnap.data();

        if (
          municipalidadData
        ) {
          municipalidad = {
            id: municipalidadId,

            nombre:
              limpiarTexto(
                municipalidadData.Nombre,
              ),
          };
        }
      }
    }

    /*
     * ========================================================
     * 9. PRODUCTOS
     * ========================================================
     */

    const productos: ProductoRecibo[] =
      Array.isArray(
        pedido.productos,
      )
        ? pedido.productos.map(
            (
              producto: Record<
                string,
                unknown
              >,
            ) => ({
              productoId:
                limpiarTexto(
                  producto.productoId,
                ),

              code:
                limpiarTexto(
                  producto.code,
                ),

              nombre:
                limpiarTexto(
                  producto.nombre,
                ),

              cantidad:
                numero(
                  producto.cantidad,
                ),

              precioUnitario:
                numero(
                  producto.precioUnitario,
                ),

              subtotal:
                numero(
                  producto.subtotal,
                ),

              unidad:
                limpiarTexto(
                  producto.unidad,
                ),
            }),
          )
        : [];

    /*
     * ========================================================
     * 10. COSTOS
     * ========================================================
     */

    const subtotal =
      numero(
        pedido.subtotal,
      );

    const total =
      numero(
        pedido.total ??
          pedido.subtotal,
      );

    const entrega =
      numero(
        pedido.entrega,
      );

    const logistica =
      numero(
        pedido.logistica,
      );

    const almacenamiento =
      numero(
        pedido.almacenamiento,
      );

    /*
     * ========================================================
     * 11. FIRMA
     * ========================================================
     */

    let firma:
      | FirmaRecibo
      | null = null;

    if (
      pedido.firma &&
      typeof pedido.firma ===
        "object"
    ) {
      const firmaData =
        pedido.firma as Record<
          string,
          unknown
        >;

      const metodo =
        firmaData.metodo;

      if (
        metodo === "manuscrita" ||
        metodo === "texto"
      ) {
        const valor =
          typeof firmaData.valor ===
          "string"
            ? firmaData.valor
            : null;

        const recibidoPor =
          typeof firmaData.recibidoPor ===
          "string"
            ? limpiarTexto(
                firmaData.recibidoPor,
              )
            : null;

        const fechaRecibido =
          convertirFecha(
            firmaData.fechaRecibido ??
              pedido.fechaRecibido,
          );

        /*
         * Importante:
         *
         * Todas las propiedades se declaran
         * explícitamente para evitar conflictos
         * entre undefined y null.
         */
        firma = {
          metodo,

          valor,

          recibidoPor,

          fechaRecibido,
        };
      }
    }

    /*
     * ========================================================
     * 12. FECHAS
     * ========================================================
     */

    const fechaCreacion =
      convertirFecha(
        pedido.fechaCreacion,
      );

    const fechaRecibido =
      convertirFecha(
        pedido.fechaRecibido,
      );

    const fechaFirma =
      pedido.firma &&
      typeof pedido.firma ===
        "object"
        ? convertirFecha(
            (
              pedido.firma as Record<
                string,
                unknown
              >
            ).fechaRecibido ??
              pedido.fechaRecibido,
          )
        : fechaRecibido;

    /*
     * ========================================================
     * 13. MODALIDAD
     * ========================================================
     */

    const modalidadEntrega =
      pedido.modalidadEntrega ===
        "recogida"
        ? "recogida"
        : "domicilio";

    /*
     * ========================================================
     * 14. DATOS PARA GENERAR PDF
     * ========================================================
     */

    const pdfData:
      RepartoPDFData = {
      id: pedidoSnap.id,

      pedido: {
        id: pedidoSnap.id,

        productos,

        subtotal,

        total,

        estado: "entregado",

        IdMunicipalidad:
          municipalidadId,

        direccionEntrega:
          limpiarTexto(
            pedido.direccionEntrega,
          ),

        fechaCreacion,

        fechaRecibido,
      },

      cliente: {
        nombres:
          cliente.nombres,

        apellidos:
          cliente.apellidos,

        correo:
          cliente.correo,

        telefono:
          cliente.telefono,

        direccion:
          cliente.direccion,
      },

      repartidor:
        repartidor
          ? {
              nombres:
                repartidor.nombres,

              apellidos:
                repartidor.apellidos,

              correo: "",

              telefono:
                repartidor.telefono,
            }
          : null,

      municipalidad: {
        nombre:
          municipalidad?.nombre ??
          "No especificada",
      },

      costos: {
        subtotalProductos:
          subtotal,

        entrega,

        logistica,

        almacenamiento,

        total,
      },

      modalidadEntrega,

      firma: firma
        ? {
            metodo:
              firma.metodo,

            valor:
              firma.valor,

            recibidoPor:
              firma.recibidoPor,

            fechaRecibido:
              firma.fechaRecibido,
          }
        : null,
    };

    /*
     * ========================================================
     * 15. GENERAR PDF
     * ========================================================
     */

    const baseUrl =
      request.nextUrl.origin;

    const pdfBytes =
      await generarPDFReparto(
        pdfData,
        {
          baseUrl,
        },
      );

    /*
     * ========================================================
     * 16. CONVERTIR Uint8Array -> Buffer
     * ========================================================
     *
     * NextResponse puede presentar un conflicto de tipos
     * con Uint8Array<ArrayBufferLike>.
     *
     * Buffer es aceptado correctamente en runtime Node.js.
     */

    const pdfBuffer =
      Buffer.from(
        pdfBytes,
      );

    /*
     * ========================================================
     * 17. RESPUESTA PDF
     * ========================================================
     */

    return new NextResponse(
      pdfBuffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="recibo-${pedidoSnap.id}.pdf"`,

          "Content-Length":
            pdfBuffer.length.toString(),

          "Cache-Control":
            "private, no-store",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "Error generando recibo PDF:",
      error,
    );

    /*
     * ========================================================
     * ERRORES DE AUTENTICACIÓN
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "NO_AUTH"
    ) {
      return errorResponse(
        401,
        "NO_AUTH",
        "Debes iniciar sesión.",
      );
    }

    /*
     * ========================================================
     * ERRORES DE AUTORIZACIÓN
     * ========================================================
     */

    if (
      error instanceof Error &&
      error.message ===
        "FORBIDDEN"
    ) {
      return errorResponse(
        403,
        "FORBIDDEN",
        "No tienes permisos para consultar este recibo.",
      );
    }

    /*
     * ========================================================
     * ERROR GENERAL
     * ========================================================
     */

    return errorResponse(
      500,
      "SERVER_ERROR",
      "Ocurrió un error al generar el recibo PDF.",
    );
  }
}