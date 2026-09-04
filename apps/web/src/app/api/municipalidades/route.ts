import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "municipalidades";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const data = snapshot.docs.map((doc) => {
      const value = doc.data();

      return {
        id: doc.id,
        nombre:
          typeof value.Nombre === "string"
            ? value.Nombre
            : "",
        activo:
          value.Activo !== false,
        fechaCreacion:
          value.creacion ?? null,
        ultimaActualizacion:
          value.actualizacion ?? null,
        clausura:
          value.clausura ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error obteniendo municipalidades:",
      error,
    );

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
      "No fue posible cargar las municipalidades.",
      500,
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

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

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const duplicate = snapshot.docs.some(
      (doc) => {
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

    const ref = adminDb
      .collection(COLLECTION)
      .doc();

    await ref.set({
      Nombre: nombre,
      Activo: true,
      creacion:
        FieldValue.serverTimestamp(),
      actualizacion:
        FieldValue.serverTimestamp(),
      clausura: null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ref.id,
          nombre,
          activo: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error creando municipalidad:",
      error,
    );

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
      "No fue posible crear la municipalidad.",
      500,
    );
  }
}