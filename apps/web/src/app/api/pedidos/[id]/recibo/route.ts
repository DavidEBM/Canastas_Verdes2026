import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  generarPDFReparto,
  type RepartoPDFData,
} from "@/lib/repartos/pdf";
import { normalizeEstado } from "@/lib/pedidos/estados";

export const runtime = "nodejs";

type Rol =
  | "consumidor"
  | "repartidor"
  | "admin";

type TipoEntrega =
  | "domicilio"
  | "recogida";

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
    typeof value !== "string"
  ) {
    return "consumidor";
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

  return "consumidor";
}

function normalizeTipoEntrega(
  value: unknown,
): TipoEntrega {
  return value === "recogida"
    ? "recogida"
    : "domicilio";
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
    const snap =
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .get();

    if (
      snap.exists
    ) {
      const data =
        snap.data() as Record<
          string,
          unknown
        >;

      role =
        normalizeRole(
          data.Rol ??
            data.rol ??
            data.Role ??
            data.role,
        );
    } else {
      role = "consumidor";
    }
  }

  return {
    user,
    role,
  };
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
    { status },
  );
}

function numberValue(
  value: unknown,
): number {
  const number =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

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
    /*
     * =====================================================
     * AUTENTICACIÓN
     * =====================================================
     */

    const {
      user,
      role,
    } =
      await authenticate(
        request,
      );

    const { id } =
      await params;

    const pedidoId =
      id.trim();

    if (!pedidoId) {
      return errorResponse(
        "El pedido es obligatorio.",
        400,
      );
    }

    /*
     * =====================================================
     * PEDIDO
     * =====================================================
     */

    const pedidoSnap =
      await adminDb
        .collection("pedidos")
        .doc(pedidoId)
        .get();

    if (
      !pedidoSnap.exists
    ) {
      return errorResponse(
        "El pedido no existe.",
        404,
      );
    }

    const data =
      pedidoSnap.data();

    if (!data) {
      return errorResponse(
        "El pedido no contiene información válida.",
        409,
      );
    }

    /*
     * =====================================================
     * AUTORIZACIÓN
     * =====================================================
     */

    const isOwner =
      data.usuarioId ===
      user.uid;

    const isAssignedDeliverer =
      data.repartidorId ===
      user.uid;

    if (
      role !== "admin" &&
      !isOwner &&
      !isAssignedDeliverer
    ) {
      return errorResponse(
        "No tienes permiso para consultar este recibo.",
        403,
      );
    }

    /*
     * =====================================================
     * VALIDAR ESTADO
     * =====================================================
     */

    const estado =
      normalizeEstado(
        data.estado,
      );

    if (
      estado !==
      "entregado"
    ) {
      return errorResponse(
        "El recibo solamente está disponible cuando el pedido ha sido entregado o completado.",
        409,
      );
    }

    /*
     * =====================================================
     * TIPO DE ENTREGA
     * =====================================================
     */

    const tipoEntrega =
      normalizeTipoEntrega(
        data.tipoEntrega,
      );

    /*
     * =====================================================
     * CLIENTE
     * =====================================================
     */

    const usuarioId =
      String(
        data.usuarioId ??
          "",
      );

    let cliente:
      RepartoPDFData["cliente"] =
        {
          nombres: "",
          apellidos: "",
          correo: "",
          telefono: "",
          direccion: "",
        };

    if (usuarioId) {
      const clienteSnap =
        await adminDb
          .collection(
            "usuarios",
          )
          .doc(usuarioId)
          .get();

      if (
        clienteSnap.exists
      ) {
        const clienteData =
          clienteSnap.data() as Record<
            string,
            unknown
          >;

        cliente = {
          nombres: String(
            clienteData.Nombres ??
              clienteData.nombres ??
              "",
          ),

          apellidos: String(
            clienteData.Apellidos ??
              clienteData.apellidos ??
              "",
          ),

          correo: String(
            clienteData.Correo ??
              clienteData.correo ??
              "",
          ),

          telefono: String(
            clienteData.Telefono ??
              clienteData.telefono ??
              "",
          ),

          direccion: String(
            clienteData.Direccion ??
              clienteData.direccion ??
              "",
          ),
        };
      }
    }

    /*
     * =====================================================
     * MUNICIPALIDAD
     * =====================================================
     */

    let municipalidad:
      RepartoPDFData["municipalidad"] =
        {
          nombre: "",
        };

    const municipalidadId =
      String(
        data.IdMunicipalidad ??
          "",
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
          municipalidadSnap.data() as Record<
            string,
            unknown
          >;

        municipalidad = {
          nombre: String(
            municipalidadData.Nombre ??
              municipalidadData.nombre ??
              "",
          ),
        };
      }
    }

    /*
     * =====================================================
     * PUNTO DE RECOGIDA
     * =====================================================
     *
     * Puede estar guardado como:
     *
     * puntoRecogida: {
     *   id,
     *   nombre,
     *   direccion,
     *   ...
     * }
     *
     * o como:
     *
     * puntoRecogida: "ID"
     */

    const puntoRecogidaRaw:
      unknown =
        data.puntoRecogida ??
        null;

    let puntoRecogida:
      RepartoPDFData["puntoRecogida"] =
        null;

    if (
      puntoRecogidaRaw &&
      typeof puntoRecogidaRaw ===
        "object" &&
      !Array.isArray(
        puntoRecogidaRaw,
      )
    ) {
      puntoRecogida =
        puntoRecogidaRaw as NonNullable<
          RepartoPDFData["puntoRecogida"]
        >;
    }

    if (
      tipoEntrega ===
        "recogida" &&
      typeof puntoRecogidaRaw ===
        "string"
    ) {
      const puntoId =
        puntoRecogidaRaw.trim();

      if (puntoId) {
        const puntoSnap =
          await adminDb
            .collection(
              "lugaresRecogida",
            )
            .doc(puntoId)
            .get();

        if (
          puntoSnap.exists
        ) {
          puntoRecogida = {
            id: puntoSnap.id,
            ...puntoSnap.data(),
          };
        }
      }
    }

    /*
     * =====================================================
     * REPARTIDOR
     * =====================================================
     *
     * Los pedidos de recogida no tienen repartidor.
     */

    let repartidor:
      RepartoPDFData["repartidor"] =
        null;

    if (
      tipoEntrega ===
        "domicilio" &&
      data.repartidorId
    ) {
      const repartidorSnap =
        await adminDb
          .collection(
            "usuarios",
          )
          .doc(
            String(
              data.repartidorId,
            ),
          )
          .get();

      if (
        repartidorSnap.exists
      ) {
        const repartidorData =
          repartidorSnap.data() as Record<
            string,
            unknown
          >;

        repartidor = {
          nombres: String(
            repartidorData.Nombres ??
              repartidorData.nombres ??
              "",
          ),

          apellidos: String(
            repartidorData.Apellidos ??
              repartidorData.apellidos ??
              "",
          ),

          correo: String(
            repartidorData.Correo ??
              repartidorData.correo ??
              "",
          ),

          telefono: String(
            repartidorData.Telefono ??
              repartidorData.telefono ??
              "",
          ),
        };
      }
    }

    /*
     * =====================================================
     * VENTA COMPLETADA
     * =====================================================
     */

    const ventaCompletada =
      data.ventaCompletada ===
        true ||
      estado ===
        "entregado";

    /*
     * =====================================================
     * COSTOS
     * =====================================================
     */

    const subtotalProductos =
      numberValue(
        data.subtotal ??
          data.subtotalProductos,
      );

    const entrega =
      numberValue(
        data.entrega,
      );

    const logistica =
      numberValue(
        data.logistica,
      );

    const almacenamiento =
      numberValue(
        data.almacenamiento,
      );

    const total =
      numberValue(
        data.total ??
          subtotalProductos +
            entrega +
            logistica +
            almacenamiento,
      );

    /*
     * =====================================================
     * DATOS DEL PDF
     * =====================================================
     */

    const pdfData:
      RepartoPDFData = {
        id: pedidoId,

        pedido: {
          id: pedidoId,

          productos:
            Array.isArray(
              data.productos,
            )
              ? data.productos
              : [],

          subtotal:
            subtotalProductos,

          total,

          estado,

          IdMunicipalidad:
            String(
              data.IdMunicipalidad ??
                "",
            ),

          direccionEntrega:
            data.direccionEntrega ??
            null,

          telefonoEntrega:
            data.telefonoEntrega ??
            null,

          fechaCreacion:
            data.fechaCreacion,

          fechaRecibido:
            data.fechaRecibido,

          completadoEn:
            data.completadoEn,

          tipoEntrega,

          puntoRecogida,

          ventaCompletada,

          repartidorId:
            data.repartidorId ??
            null,
        },

        cliente,

        repartidor,

        municipalidad,

        puntoRecogida,

        costos: {
          subtotalProductos,
          entrega,
          logistica,
          almacenamiento,
          total,
        },

        tipoEntrega,

        firma:
          data.firma ??
          null,

        ventaCompletada,
      };

    /*
     * =====================================================
     * GENERAR PDF
     * =====================================================
     */

    const baseUrl =
      process.env
        .NEXT_PUBLIC_APP_URL ||
      new URL(
        request.url,
      ).origin;

    const pdf =
      await generarPDFReparto(
        pdfData,
        {
          baseUrl,
        },
      );

    /*
     * pdf-lib devuelve Uint8Array.
     * Buffer lo convierte a un BodyInit
     * compatible con NextResponse.
     */

    return new NextResponse(
      Buffer.from(pdf),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="recibo-${pedidoId}.pdf"`,

          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Error generando recibo:",
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
      "No fue posible generar el recibo.",
      500,
    );
  }
}