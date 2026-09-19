import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "presentaciones";

interface PresentationInput {
  nombre?: unknown;
  descripcion?: unknown;
}

function text(value: unknown, max: number): string {
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

      case "USER_NOT_FOUND":
        return NextResponse.json(
          {
            success: false,
            message: "El usuario no existe en Firestore.",
          },
          { status: 403 },
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
   GET INDIVIDUAL
========================================================= */

export async function GET(
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

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Presentación no encontrada.",
        },
        { status: 404 },
      );
    }

    const value = snapshot.data() ?? {};

    return NextResponse.json({
      success: true,
      data: {
        id: snapshot.id,
        nombre:
          typeof value.nombre === "string"
            ? value.nombre
            : "",
        descripcion:
          typeof value.descripcion === "string"
            ? value.descripcion
            : "",
        activo: value.activo !== false,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
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
      activo?: unknown;
    };

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

    const currentData = current.data() ?? {};

    /*
     * Cambio de estado
     */
    if (typeof input.activo === "boolean") {
      const activo = input.activo;

      if (activo) {
        await ref.update({
          activo: true,
          fechaClausura: null,
          fechaActualizacion:
            FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          message:
            "Presentación activada correctamente.",
          data: {
            id,
            activo: true,
          },
        });
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
        data: {
          id,
          activo: false,
        },
      });
    }

    /*
     * Edición de datos
     */
    const nombre = text(input.nombre, 100);
    const descripcion = text(
      input.descripcion,
      500,
    );

    if (!nombre) {
      throw new Error("INVALID_PRESENTATION");
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const normalizedName =
      nombre.toLowerCase();

    const duplicate = snapshot.docs.some(
      (doc) => {
        if (doc.id === id) {
          return false;
        }

        const value = doc.data();

        if (value.activo === false) {
          return false;
        }

        if (
          typeof value.nombre !== "string"
        ) {
          return false;
        }

        return (
          value.nombre.trim().toLowerCase() ===
          normalizedName
        );
      },
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe otra presentación activa con ese nombre.",
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
      message:
        "Presentación actualizada correctamente.",
      data: {
        id,
        nombre,
        descripcion,
        activo:
          currentData.activo !== false,
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

    const currentData = current.data() ?? {};

    /*
     * DELETE solo permite eliminar físicamente
     * una presentación que ya esté desactivada.
     */
    if (currentData.activo !== false) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Solo se pueden eliminar presentaciones desactivadas.",
        },
        { status: 409 },
      );
    }

    await ref.delete();

    return NextResponse.json({
      success: true,
      message:
        "Presentación eliminada correctamente.",
      data: {
        id,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}