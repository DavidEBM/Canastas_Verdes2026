import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function product(
  input: Record<string, unknown>,
) {
  const precio = Number(input.precio);
  const stock = Number(input.stock);

  if (
    !text(input.code) ||
    !text(input.nombre) ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error(
      "Cada producto requiere código, nombre, precio y stock válidos.",
    );
  }

  return {
    code: text(input.code),
    nombre: text(input.nombre),
    descripcion: text(input.descripcion),
    precio,
    stock,
    categoria: text(input.categoria),
    unidad: text(input.unidad),
    imgPath: text(input.imgPath),
    imageName: text(input.imageName),
    activo:
      input.activo !== false &&
      input.activo !== "false" &&
      input.activo !== "FALSE",
    IdProductor: text(input.IdProductor),
    IdMunicipalidad: text(
      input.IdMunicipalidad,
    ),
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

function authorizationError(
  error: unknown,
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "AUTH_REQUIRED":
      return errorResponse(
        "Debes iniciar sesión.",
        401,
      );

    case "USER_NOT_FOUND":
      return errorResponse(
        "Tu cuenta no está registrada en el sistema.",
        403,
      );

    case "USER_INVALID":
      return errorResponse(
        "La información de tu cuenta no es válida.",
        403,
      );

    case "ADMIN_REQUIRED":
      return errorResponse(
        "Solo un administrador puede gestionar productos.",
        403,
      );

    default:
      return null;
  }
}

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse(
        "El identificador del producto es obligatorio.",
        400,
      );
    }

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return errorResponse(
        "Los datos del producto no son válidos.",
        400,
      );
    }

    const data = product(
      body as Record<string, unknown>,
    );

    const ref = adminDb
      .collection("productos")
      .doc(id);

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return errorResponse(
        "Producto no encontrado.",
        404,
      );
    }

    await ref.update({
      ...data,
      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...data,
      },
    });
  } catch (error) {
    const authResponse =
      authorizationError(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Error actualizando producto:",
      error,
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el producto.",
      500,
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse(
        "El identificador del producto es obligatorio.",
        400,
      );
    }

    const ref = adminDb
      .collection("productos")
      .doc(id);

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return errorResponse(
        "Producto no encontrado.",
        404,
      );
    }

    await ref.delete();

    return NextResponse.json({
      success: true,
      data: {
        id,
      },
    });
  } catch (error) {
    const authResponse =
      authorizationError(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Error eliminando producto:",
      error,
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "No fue posible eliminar el producto.",
      500,
    );
  }
}