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

function getErrorResponse(error: unknown, fallback: string) {
  console.error(fallback, error);

  if (error instanceof Error) {
    switch (error.message) {
      case "AUTH_REQUIRED":
        return jsonError("Debes iniciar sesión.", 401);

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
   GET
========================================================= */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const data = snapshot.docs
      .map((doc) => {
        const value = doc.data();

        return {
          id: doc.id,
          nombre:
            typeof value.Nombre === "string"
              ? value.Nombre
              : "",
          activo: value.Activo !== false,
          fechaCreacion:
            value.creacion ?? null,
          ultimaActualizacion:
            value.actualizacion ?? null,
          clausura:
            value.clausura ?? null,
        };
      })
      .sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es",
          {
            sensitivity: "base",
          },
        ),
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return getErrorResponse(
      error,
      "No fue posible cargar las municipalidades.",
    );
  }
}

/* =========================================================
   POST
========================================================= */

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

    const duplicate = snapshot.docs.some((doc) => {
      const data = doc.data();

      const existingName =
        typeof data.Nombre === "string"
          ? data.Nombre.trim().toLowerCase()
          : "";

      return (
        existingName === nombre.toLowerCase() &&
        data.Activo !== false
      );
    });

    if (duplicate) {
      return jsonError(
        "Ya existe una municipalidad activa con ese nombre.",
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
    return getErrorResponse(
      error,
      "No fue posible crear la municipalidad.",
    );
  }
}