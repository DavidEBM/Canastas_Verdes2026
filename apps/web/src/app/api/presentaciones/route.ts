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

      case "INVALID_PRESENTATION":
        return NextResponse.json(
          {
            success: false,
            message: "El nombre de la presentación es obligatorio.",
          },
          { status: 400 },
        );
    }
  }

  console.error("Error administrando presentaciones:", error);

  return NextResponse.json(
    {
      success: false,
      message: "No fue posible procesar la presentación.",
    },
    { status: 500 },
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("nombre")
      .get();

    const data = snapshot.docs.map((doc) => {
      const value = doc.data();

      return {
        id: doc.id,
        nombre:
          typeof value.nombre === "string"
            ? value.nombre
            : "",
        descripcion:
          typeof value.descripcion === "string"
            ? value.descripcion
            : "",
        activo: value.activo !== false,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      throw new Error("INVALID_PRESENTATION");
    }

    const input = body as PresentationInput;

    const nombre = text(input.nombre, 100);
    const descripcion = text(input.descripcion, 500);

    if (!nombre) {
      throw new Error("INVALID_PRESENTATION");
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const normalizedName = nombre.toLowerCase();

    const duplicate = snapshot.docs.some((doc) => {
      const value = doc.data();

      if (value.activo === false) {
        return false;
      }

      if (typeof value.nombre !== "string") {
        return false;
      }

      return (
        value.nombre.trim().toLowerCase() ===
        normalizedName
      );
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe una presentación activa con ese nombre.",
        },
        { status: 409 },
      );
    }

    const ref = adminDb
      .collection(COLLECTION)
      .doc();

    await ref.set({
      nombre,
      descripcion,
      activo: true,
      fechaCreacion:
        FieldValue.serverTimestamp(),
      fechaActualizacion:
        FieldValue.serverTimestamp(),
      fechaClausura: null,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Presentación creada correctamente.",
        data: {
          id: ref.id,
          nombre,
          descripcion,
          activo: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}