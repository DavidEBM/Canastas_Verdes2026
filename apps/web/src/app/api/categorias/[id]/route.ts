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

function jsonError(
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

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
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

async function findCategory(id: string) {
  const collection =
    adminDb.collection("categorias");

  // Buscar por ID del documento
  const directRef =
    collection.doc(id);

  const directSnapshot =
    await directRef.get();

  if (directSnapshot.exists) {
    return directRef;
  }

  // Buscar por campo Id si existe
  const byId =
    await collection
      .where("Id", "==", id)
      .limit(1)
      .get();

  if (!byId.empty) {
    return byId.docs[0].ref;
  }

  return null;
}

/*
 * =========================================================
 * PUT
 * Editar nombre
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

    const rawBody =
      await request.text();

    if (!rawBody.trim()) {
      return jsonError(
        "El cuerpo de la solicitud está vacío.",
        400,
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400,
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return jsonError(
        "Solicitud inválida.",
        400,
      );
    }

    const nombre = text(
      "nombre" in body
        ? body.nombre
        : "",
    );

    if (!nombre) {
      return jsonError(
        "El nombre de la categoría es obligatorio.",
        400,
      );
    }

    if (nombre.length > 100) {
      return jsonError(
        "El nombre de la categoría es demasiado largo.",
        400,
      );
    }

    const ref =
      await findCategory(id);

    if (!ref) {
      return jsonError(
        "La categoría no existe.",
        404,
      );
    }

    const snapshot =
      await adminDb
        .collection("categorias")
        .get();

    const duplicate =
      snapshot.docs.some(
        (document) => {
          if (
            document.id === ref.id
          ) {
            return false;
          }

          const data =
            document.data();

          const existing =
            text(data.nombre);

          return (
            existing.toLowerCase() ===
            nombre.toLowerCase()
          );
        },
      );

    if (duplicate) {
      return jsonError(
        "Ya existe una categoría con ese nombre.",
        409,
      );
    }

    await ref.update({
      nombre,

      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,

      message:
        "Categoría actualizada correctamente.",

      data: {
        id: ref.id,
        nombre,
      },
    });
  } catch (error) {
    console.error(
      "Error actualizando categoría:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "INVALID_ID"
    ) {
      return jsonError(
        "Identificador de categoría inválido.",
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
        "Solo un administrador puede gestionar categorías.",
        403,
      );
    }

    return jsonError(
      "No fue posible actualizar la categoría.",
      500,
    );
  }
}

/*
 * =========================================================
 * PATCH
 * Activar / Desactivar
 * =========================================================
 */

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const rawBody =
      await request.text();

    if (!rawBody.trim()) {
      return jsonError(
        "El cuerpo de la solicitud está vacío.",
        400,
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no contiene JSON válido.",
        400,
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("activo" in body) ||
      typeof body.activo !== "boolean"
    ) {
      return jsonError(
        "El estado de la categoría es obligatorio.",
        400,
      );
    }

    const activo =
      body.activo;

    const ref =
      await findCategory(id);

    if (!ref) {
      return jsonError(
        "La categoría no existe.",
        404,
      );
    }

    await ref.update({
      activo,

      fechaActualizacion:
        FieldValue.serverTimestamp(),

      fechaClausura: activo
        ? null
        : FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,

      message: activo
        ? "Categoría activada correctamente."
        : "Categoría desactivada correctamente.",

      data: {
        id: ref.id,
        activo,
      },
    });
  } catch (error) {
    console.error(
      "Error cambiando estado:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "INVALID_ID"
    ) {
      return jsonError(
        "Identificador de categoría inválido.",
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
        "Solo un administrador puede gestionar categorías.",
        403,
      );
    }

    return jsonError(
      "No fue posible cambiar el estado de la categoría.",
      500,
    );
  }
}

/*
 * =========================================================
 * DELETE
 * Desactivación lógica
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

    const ref =
      await findCategory(id);

    if (!ref) {
      return jsonError(
        "La categoría no existe.",
        404,
      );
    }

    await ref.update({
      activo: false,

      fechaActualizacion:
        FieldValue.serverTimestamp(),

      fechaClausura:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,

      message:
        "Categoría desactivada correctamente.",

      data: {
        id: ref.id,
        activo: false,
      },
    });
  } catch (error) {
    console.error(
      "Error desactivando categoría:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "INVALID_ID"
    ) {
      return jsonError(
        "Identificador de categoría inválido.",
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
        "Solo un administrador puede gestionar categorías.",
        403,
      );
    }

    return jsonError(
      "No fue posible desactivar la categoría.",
      500,
    );
  }
}