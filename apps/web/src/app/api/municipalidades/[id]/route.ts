import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

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

/*
 * Busca primero por ID del documento.
 * Si no existe, busca por el campo Id.
 */
async function findMunicipality(id: string) {
  const collection = adminDb.collection(
    "municipalidades",
  );

  /*
   * Caso 1:
   * El ID recibido corresponde al ID del documento.
   */
  const directRef = collection.doc(id);
  const directSnapshot = await directRef.get();

  if (directSnapshot.exists) {
    return directRef;
  }

  /*
   * Caso 2:
   * El ID recibido corresponde al campo Id.
   */
  const byId = await collection
    .where("Id", "==", id)
    .limit(1)
    .get();

  if (!byId.empty) {
    return byId.docs[0].ref;
  }

  /*
   * Caso 3:
   * Id podría estar almacenado como número.
   */
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

/*
 * =========================================================
 * PUT
 * =========================================================
 */

export async function PUT(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
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

    const ref = await findMunicipality(id);

    if (!ref) {
      return jsonError(
        "La municipalidad no existe.",
        404,
      );
    }

    /*
     * Comprobar duplicados ignorando mayúsculas.
     */
    const snapshot = await adminDb
      .collection("municipalidades")
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
          nombre.toLowerCase()
        );
      },
    );

    if (duplicate) {
      return jsonError(
        "Ya existe una municipalidad con ese nombre.",
        409,
      );
    }

    await ref.update({
      Nombre: nombre,
      Activo: true,
      actualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        nombre,
        activo: true,
      },
    });
  } catch (error) {
    console.error(
      "Error actualizando municipalidad:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "INVALID_ID"
    ) {
      return jsonError(
        "Identificador de municipalidad inválido.",
        400,
      );
    }

    if (
      error instanceof Error &&
      error.message === "AUTH_REQUIRED"
    ) {
      return jsonError(
        "Debes iniciar sesión.",
        401,
      );
    }

    if (
      error instanceof Error &&
      error.message === "ADMIN_REQUIRED"
    ) {
      return jsonError(
        "Solo un administrador puede gestionar municipalidades.",
        403,
      );
    }

    return jsonError(
      "No fue posible actualizar la municipalidad.",
      500,
    );
  }
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 */

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

    await ref.update({
      Activo: false,
      clausura:
        FieldValue.serverTimestamp(),
      actualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Municipalidad desactivada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error desactivando municipalidad:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "INVALID_ID"
    ) {
      return jsonError(
        "Identificador de municipalidad inválido.",
        400,
      );
    }

    if (
      error instanceof Error &&
      error.message === "AUTH_REQUIRED"
    ) {
      return jsonError(
        "Debes iniciar sesión.",
        401,
      );
    }

    if (
      error instanceof Error &&
      error.message === "ADMIN_REQUIRED"
    ) {
      return jsonError(
        "Solo un administrador puede gestionar municipalidades.",
        403,
      );
    }

    return jsonError(
      "No fue posible desactivar la municipalidad.",
      500,
    );
  }
}