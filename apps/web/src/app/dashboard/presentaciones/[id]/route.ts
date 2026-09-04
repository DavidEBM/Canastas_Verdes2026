import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "presentaciones";

function text(value: unknown, max = 500): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, max);
}

function validateId(id: string) {
  if (
    !id ||
    id.length > 200 ||
    id.includes("/") ||
    id.includes("\\")
  ) {
    throw new Error("INVALID_ID");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    switch (error.message) {
      case "AUTH_REQUIRED":
        return NextResponse.json(
          {
            success: false,
            message: "Debes iniciar sesión.",
          },
          { status: 401 },
        );

      case "ADMIN_REQUIRED":
        return NextResponse.json(
          {
            success: false,
            message:
              "Solo un administrador puede gestionar presentaciones.",
          },
          { status: 403 },
        );

      case "INVALID_ID":
        return NextResponse.json(
          {
            success: false,
            message:
              "Identificador de presentación inválido.",
          },
          { status: 400 },
        );

      case "INVALID_PRESENTATION":
        return NextResponse.json(
          {
            success: false,
            message:
              "El nombre de la presentación es obligatorio.",
          },
          { status: 400 },
        );
    }
  }

  console.error(
    "Error administrando presentación:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible procesar la presentación.",
    },
    { status: 500 },
  );
}

/* =========================================================
   PUT
========================================================= */

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

    validateId(id);

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      throw new Error("INVALID_PRESENTATION");
    }

    const input = body as {
      nombre?: unknown;
      descripcion?: unknown;
    };

    const nombre = text(input.nombre, 100);
    const descripcion = text(
      input.descripcion,
      500,
    );

    if (!nombre) {
      throw new Error("INVALID_PRESENTATION");
    }

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const current = await ref.get();

    if (!current.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Presentación no encontrada.",
        },
        { status: 404 },
      );
    }

    const existing = await adminDb
      .collection(COLLECTION)
      .get();

    const duplicate = existing.docs.some(
      (doc) => {
        if (doc.id === id) {
          return false;
        }

        const value = doc.data();

        return (
          typeof value.nombre === "string" &&
          value.nombre.trim().toLowerCase() ===
            nombre.toLowerCase() &&
          value.activo !== false
        );
      },
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe otra presentación con ese nombre.",
        },
        { status: 409 },
      );
    }

    await ref.update({
      nombre,
      descripcion,
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        nombre,
        descripcion,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/* =========================================================
   DELETE
   Desactivación lógica
========================================================= */

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

    validateId(id);

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const current = await ref.get();

    if (!current.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Presentación no encontrada.",
        },
        { status: 404 },
      );
    }

    await ref.update({
      activo: false,
      fechaClausura:
        FieldValue.serverTimestamp(),
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Presentación desactivada correctamente.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}