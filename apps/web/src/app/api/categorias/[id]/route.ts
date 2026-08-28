import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(
  request: Request,
  { params }: Params,
) {
  try {
    await requireAdmin(request);

    const { id } =
      await params;

    if (!id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El identificador es obligatorio.",
        },
        { status: 400 },
      );
    }

    const ref =
      adminDb
        .collection("categorias")
        .doc(id);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Categoría no encontrada.",
        },
        { status: 404 },
      );
    }

    const body: unknown =
      await request.json();

    const nombre = text(
      body &&
        typeof body === "object" &&
        "nombre" in body
        ? body.nombre
        : "",
    );

    if (!nombre) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre es obligatorio.",
        },
        { status: 400 },
      );
    }

    const duplicate =
      await adminDb
        .collection("categorias")
        .where("nombre", "==", nombre)
        .limit(2)
        .get();

    const duplicateExists =
      duplicate.docs.some(
        (document) =>
          document.id !== id,
      );

    if (duplicateExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe otra categoría con ese nombre.",
        },
        { status: 409 },
      );
    }

    await ref.update({
      nombre,
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        nombre,
      },
    });
  } catch (error) {
    console.error(
      "Error actualizando categoría:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "NO_AUTH") {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Solo un administrador puede gestionar categorías.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible actualizar la categoría.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params,
) {
  try {
    await requireAdmin(request);

    const { id } =
      await params;

    const ref =
      adminDb
        .collection("categorias")
        .doc(id);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Categoría no encontrada.",
        },
        { status: 404 },
      );
    }

    /*
     * Por ahora eliminamos físicamente.
     * Más adelante podemos impedirlo si
     * existen productos asociados.
     */
    await ref.delete();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Error eliminando categoría:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "NO_AUTH") {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Solo un administrador puede gestionar categorías.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible eliminar la categoría.",
      },
      { status: 500 },
    );
  }
}