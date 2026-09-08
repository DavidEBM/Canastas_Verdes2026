import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type MetodoFirma = "manuscrita" | "texto";
type RolUsuario = "admin" | "repartidor" | "usuario";

interface RecibidoBody {
  metodo: MetodoFirma;
  valor: string;
  recibidoPor?: string;
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

/**
 * Normaliza el valor del rol para soportar:
 * - role
 * - rol
 * - Rol
 *
 * El sistema utiliza principalmente "Rol" en Firestore.
 */
function normalizarRol(value: unknown): RolUsuario | null {
  if (typeof value !== "string") {
    return null;
  }

  const rol = value.trim().toLowerCase();

  if (rol === "admin") {
    return "admin";
  }

  if (rol === "repartidor") {
    return "repartidor";
  }

  if (rol === "usuario") {
    return "usuario";
  }

  return null;
}

/**
 * Obtiene el rol desde los custom claims del usuario.
 */
function obtenerRolDesdeClaims(
  claims: Record<string, unknown>,
): RolUsuario | null {
  return (
    normalizarRol(claims.role) ??
    normalizarRol(claims.rol) ??
    normalizarRol(claims.Rol)
  );
}

/**
 * Obtiene el rol del usuario desde Firestore.
 *
 * Esto es necesario porque en Canastas Verdes el rol se encuentra
 * almacenado en usuarios/{uid}.Rol y no necesariamente está
 * presente como custom claim de Firebase Auth.
 */
async function obtenerRol(
  uid: string,
  claims: Record<string, unknown>,
): Promise<RolUsuario | null> {
  // Primero intentamos utilizar el custom claim.
  const rolClaims = obtenerRolDesdeClaims(claims);

  if (rolClaims) {
    return rolClaims;
  }

  // Si no existe, consultamos Firestore.
  const usuarioSnap = await adminDb
    .collection("usuarios")
    .doc(uid)
    .get();

  if (!usuarioSnap.exists) {
    return null;
  }

  const usuario = usuarioSnap.data();

  if (!usuario) {
    return null;
  }

  return (
    normalizarRol(usuario.Rol) ??
    normalizarRol(usuario.rol) ??
    normalizarRol(usuario.role)
  );
}

function esFirmaValida(
  metodo: MetodoFirma,
  valor: string,
): boolean {
  if (!valor.trim()) {
    return false;
  }

  if (metodo === "texto") {
    return valor.trim().length >= 2;
  }

  if (metodo === "manuscrita") {
    /**
     * La firma manuscrita llega como Data URL.
     *
     * Permitimos imágenes PNG/JPEG generadas desde canvas.
     */
    return /^data:image\/(png|jpeg|jpg);base64,/i.test(
      valor.trim(),
    );
  }

  return false;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    // ==========================================================
    // AUTENTICACIÓN
    // ==========================================================

    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_AUTH",
          message:
            "No se proporcionó un token de autenticación.",
        },
        { status: 401 },
      );
    }

    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TOKEN",
          message:
            "El token de autenticación no es válido.",
        },
        { status: 401 },
      );
    }

    // ==========================================================
    // OBTENER ROL
    // ==========================================================

    const role = await obtenerRol(
      decodedToken.uid,
      decodedToken as Record<string, unknown>,
    );

    if (role !== "admin" && role !== "repartidor") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message:
            "No tienes permisos para registrar entregas.",
        },
        { status: 403 },
      );
    }

    // ==========================================================
    // ID DEL PEDIDO
    // ==========================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ID",
          message:
            "No se proporcionó un ID de pedido válido.",
        },
        { status: 400 },
      );
    }

    // ==========================================================
    // BODY
    // ==========================================================

    let body: RecibidoBody;

    try {
      body = (await request.json()) as RecibidoBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message:
            "El cuerpo de la solicitud no es válido.",
        },
        { status: 400 },
      );
    }

    const metodo = body.metodo;

    const valor =
      typeof body.valor === "string"
        ? body.valor.trim()
        : "";

    if (
      metodo !== "manuscrita" &&
      metodo !== "texto"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_METHOD",
          message:
            "El método debe ser 'manuscrita' o 'texto'.",
        },
        { status: 400 },
      );
    }

    if (!esFirmaValida(metodo, valor)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SIGNATURE",
          message:
            metodo === "manuscrita"
              ? "La firma manuscrita no es válida."
              : "La confirmación textual debe contener al menos 2 caracteres.",
        },
        { status: 400 },
      );
    }

    // ==========================================================
    // PEDIDO
    // ==========================================================

    const pedidoRef = adminDb
      .collection("pedidos")
      .doc(id);

    // ==========================================================
    // TRANSACCIÓN
    // ==========================================================

    /**
     * Se verifica el estado y el repartidor dentro de la
     * transacción para evitar que dos solicitudes registren
     * simultáneamente la misma entrega.
     */
    const resultado = await adminDb.runTransaction(
      async (transaction) => {
        const pedidoSnap = await transaction.get(
          pedidoRef,
        );

        if (!pedidoSnap.exists) {
          throw new Error("NOT_FOUND");
        }

        const pedido = pedidoSnap.data();

        if (!pedido) {
          throw new Error("INVALID_ORDER");
        }

        const estado = String(
          pedido.estado ?? "",
        );

        // ======================================================
        // VALIDAR ESTADO
        // ======================================================

        /**
         * Solo se puede confirmar una entrega cuando
         * el pedido está en camino.
         */
        if (estado !== "en_camino") {
          throw new Error("INVALID_STATUS");
        }

        // ======================================================
        // VALIDAR REPARTIDOR
        // ======================================================

        /**
         * Un repartidor únicamente puede confirmar
         * pedidos que estén asignados a su propio UID.
         *
         * El administrador puede confirmar cualquier pedido
         * que esté en camino.
         */
        if (
          role === "repartidor" &&
          pedido.repartidorId !== decodedToken.uid
        ) {
          throw new Error("NOT_ASSIGNED");
        }

        // ======================================================
        // INFORMACIÓN DE RECEPCIÓN
        // ======================================================

        const recibidoPor =
          typeof body.recibidoPor === "string"
            ? body.recibidoPor.trim()
            : "";

        // ======================================================
        // ACTUALIZAR PEDIDO
        // ======================================================

        transaction.update(pedidoRef, {
          estado: "entregado",

          firma: {
            metodo,
            valor,
            recibidoPor: recibidoPor || null,
            fechaRecibido:
              FieldValue.serverTimestamp(),
          },

          fechaRecibido:
            FieldValue.serverTimestamp(),

          ultimaActualizacion:
            FieldValue.serverTimestamp(),
        });

        return {
          pedidoId: pedidoSnap.id,
          estado: "entregado",
          metodo,
        };
      },
    );

    // ==========================================================
    // RESPUESTA
    // ==========================================================

    return NextResponse.json({
      success: true,
      message:
        "La entrega fue registrada correctamente.",
      data: resultado,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    switch (message) {
      case "NOT_FOUND":
        return NextResponse.json(
          {
            success: false,
            error: "NOT_FOUND",
            message:
              "El pedido no existe.",
          },
          { status: 404 },
        );

      case "INVALID_ORDER":
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_ORDER",
            message:
              "Los datos del pedido no son válidos.",
          },
          { status: 400 },
        );

      case "INVALID_STATUS":
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_STATUS",
            message:
              "El pedido debe estar en estado 'en_camino' para registrar la recepción.",
          },
          { status: 409 },
        );

      case "NOT_ASSIGNED":
        return NextResponse.json(
          {
            success: false,
            error: "NOT_ASSIGNED",
            message:
              "Este pedido no está asignado al repartidor actual.",
          },
          { status: 403 },
        );

      default:
        console.error(
          "Error registrando recepción:",
          error,
        );

        return NextResponse.json(
          {
            success: false,
            error: "SERVER_ERROR",
            message:
              "Ocurrió un error al registrar la recepción.",
          },
          { status: 500 },
        );
    }
  }
}