import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "municipalidades";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function validateId(id: string) {
  if (
    !id ||
    id.length > 150 ||
    id.includes("/") ||
    id.includes("\\")
  ) {
    throw new Error("INVALID_ID");
  }
}

/* =========================================================
   Buscar municipalidad
========================================================= */

async function findMunicipality(id: string) {
  const collection =
    adminDb.collection(COLLECTION);

  // 1. ID del documento
  const directRef = collection.doc(id);
  const directSnapshot = await directRef.get();

  if (directSnapshot.exists) {
    return directRef;
  }

  // 2. Campo Id como string
  const byId = await collection
    .where("Id", "==", id)
    .limit(1)
    .get();

  if (!byId.empty) {
    return byId.docs[0].ref;
  }

  // 3. Campo Id como número
  const numericId = Number(id);

  if (Number.isInteger(numericId)) {
    const byNumericId = await collection
      .where("Id", "==", numericId)
      .limit(1)
      .get();

    if (!byNumericId.empty) {
      return byNumericId.docs[0].ref;
    }
  }

  return null;
}

function getErrorResponse(
  error: unknown,
  fallback: string,
) {
  console.error(fallback, error);

  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_ID":
        return jsonError(
          "Identificador de municipalidad inválido.",
          400,
        );

      case "AUTH_REQUIRED":
        return jsonError(
          "Debes iniciar sesión.",
          401,
        );

      case "ADMIN_REQUIRED":
        return jsonError(
          "Solo un administrador puede gestionar municipalidades.",
          403,
        );
    }
  }

  return jsonError(fallback, 500);
}

/* =========================================================
   PUT
   Editar / Activar / Desactivar
========================================================= */

export async function PUT(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const ref = await findMunicipality(id);

    if (!ref) {
      return jsonError(
        "La municipalidad no existe.",
        404,
      );
    }

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return jsonError(
        "Datos inválidos.",
        400,
      );
    }

    /*
     * =====================================================
     * ACTIVAR / DESACTIVAR
     * =====================================================
     */

    if (
      "activo" in body &&
      typeof body.activo === "boolean"
    ) {
      const activo = body.activo;

      await ref.update({
        Activo: activo,
        clausura: activo
          ? null
          : FieldValue.serverTimestamp(),
        actualizacion:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        data: {
          id: ref.id,
          activo,
        },
        message: activo
          ? "Municipalidad activada correctamente."
          : "Municipalidad desactivada correctamente.",
      });
    }

    /*
     * =====================================================
     * EDITAR NOMBRE
     * =====================================================
     */

    if (
      !("nombre" in body) ||
      typeof body.nombre !== "string"
    ) {
      return jsonError(
        "El nombre de la municipalidad es obligatorio.",
        400,
      );
    }

    const nombre = body.nombre.trim();

    if (!nombre || nombre.length > 150) {
      return jsonError(
        "El nombre de la municipalidad no es válido.",
        400,
      );
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const duplicate = snapshot.docs.some(
      (doc) => {
        if (doc.id === ref.id) {
          return false;
        }

        const data = doc.data();

        const existingName =
          typeof data.Nombre === "string"
            ? data.Nombre.trim().toLowerCase()
            : "";

        return (
          existingName ===
            nombre.toLowerCase() &&
          data.Activo !== false
        );
      },
    );

    if (duplicate) {
      return jsonError(
        "Ya existe una municipalidad activa con ese nombre.",
        409,
      );
    }

    await ref.update({
      Nombre: nombre,
      actualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ref.id,
        nombre,
      },
      message:
        "Municipalidad actualizada correctamente.",
    });
  } catch (error) {
    return getErrorResponse(
      error,
      "No fue posible actualizar la municipalidad.",
    );
  }
}

/* =========================================================
   DELETE
   Eliminación permanente
========================================================= */

export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const ref = await findMunicipality(id);

    if (!ref) {
      return jsonError(
        "La municipalidad no existe.",
        404,
      );
    }

    const snapshot = await ref.get();
    const data = snapshot.data();

    /*
     * Nunca permitir eliminar físicamente
     * una municipalidad activa.
     */
    if (data?.Activo !== false) {
      return jsonError(
        "Solo se pueden eliminar municipalidades desactivadas.",
        409,
      );
    }

    await ref.delete();

    return NextResponse.json({
      success: true,
      message:
        "Municipalidad eliminada definitivamente.",
    });
  } catch (error) {
    return getErrorResponse(
      error,
      "No fue posible eliminar la municipalidad.",
    );
  }
}