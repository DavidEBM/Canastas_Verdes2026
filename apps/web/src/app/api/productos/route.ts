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
    IdGranja: text(input.IdGranja),
    IdMunicipalidad: text(
      input.IdMunicipalidad,
    ),
  };
}

function authorizationError(
  error: unknown,
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "AUTH_REQUIRED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes iniciar sesión.",
        },
        { status: 401 },
      );

    case "USER_NOT_FOUND":
      return NextResponse.json(
        {
          success: false,
          message:
            "Tu cuenta no está registrada en el sistema.",
        },
        { status: 403 },
      );

    case "USER_INVALID":
      return NextResponse.json(
        {
          success: false,
          message:
            "La información de tu cuenta no es válida.",
        },
        { status: 403 },
      );

    case "ADMIN_REQUIRED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Solo un administrador puede gestionar productos.",
        },
        { status: 403 },
      );

    default:
      return null;
  }
}

/**
 * GET
 *
 * Público.
 *
 * La tienda utiliza esta ruta para
 * obtener los productos disponibles.
 */
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("productos")
      .get();

    const data = snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      }),
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error obteniendo productos:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible obtener los productos.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Solo administrador.
 */
export async function POST(
  request: Request,
) {
  try {
    await requireAdmin(request);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los datos del producto no son válidos.",
        },
        { status: 400 },
      );
    }

    const data = product(
      body as Record<string, unknown>,
    );

    /*
     * Evitar códigos duplicados.
     */
    const duplicateSnapshot =
      await adminDb
        .collection("productos")
        .where("code", "==", data.code)
        .limit(1)
        .get();

    if (!duplicateSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          message: `Ya existe un producto con el código ${data.code}.`,
        },
        { status: 409 },
      );
    }

    const ref = adminDb
      .collection("productos")
      .doc();

    await ref.set({
      ...data,
      fechaCreacion:
        FieldValue.serverTimestamp(),
      ultimaActualizacion:
        FieldValue.serverTimestamp(),
      fechaCierre: null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ref.id,
          ...data,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const authResponse =
      authorizationError(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Error creando producto:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible crear el producto.",
      },
      { status: 500 },
    );
  }
}