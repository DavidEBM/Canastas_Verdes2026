import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

async function requireAdmin(request: Request) {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  if (decoded.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

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
          "Solo un administrador puede asignar repartidores.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "REPARTIDOR_INVALIDO"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "El usuario seleccionado no es un repartidor.",
      },
      { status: 400 },
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
          "El pedido no puede ser asignado en su estado actual.",
      },
      { status: 409 },
    );
  }

  console.error(
    "Error asignando repartidor:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible asignar el repartidor.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body: unknown = await request.json();

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
      repartidorId?: unknown;
    };

    const pedidoId =
      typeof input.pedidoId === "string"
        ? input.pedidoId.trim()
        : "";

    const repartidorId =
      typeof input.repartidorId === "string"
        ? input.repartidorId.trim()
        : "";

    if (!pedidoId || !repartidorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El pedido y el repartidor son obligatorios.",
        },
        { status: 400 },
      );
    }

    const repartidor =
      await adminAuth.getUser(repartidorId);

    if (
      repartidor.disabled ||
      repartidor.customClaims?.role !==
        "repartidor"
    ) {
      throw new Error("REPARTIDOR_INVALIDO");
    }

    const pedidoRef =
      adminDb.collection("pedidos").doc(pedidoId);

    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const pedido =
            await transaction.get(pedidoRef);

          if (!pedido.exists) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const data = pedido.data();

          if (!data) {
            throw new Error(
              "PEDIDO_NO_ENCONTRADO",
            );
          }

          const estado = data.estado;

          if (
            estado !== "pendiente" &&
            estado !== "asignado"
          ) {
            throw new Error(
              "ESTADO_INVALIDO",
            );
          }

          transaction.update(
            pedidoRef,
            {
              repartidorId,
              estado: "asignado",
              fechaAsignacion:
                FieldValue.serverTimestamp(),
              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            },
          );

          return {
            pedidoId,
            repartidorId,
            estado: "asignado",
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