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

/*
 * GET
 * Público.
 */
export async function GET() {
  try {
    const snapshot =
      await adminDb
        .collection("categorias")
        .orderBy("nombre")
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
      "Error obteniendo categorías:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible obtener las categorías.",
      },
      { status: 500 },
    );
  }
}

/*
 * POST
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
            "Solicitud inválida.",
        },
        { status: 400 },
      );
    }

    const nombre = text(
      "nombre" in body
        ? body.nombre
        : "",
    );

    if (!nombre) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre de la categoría es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (nombre.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El nombre de la categoría es demasiado largo.",
        },
        { status: 400 },
      );
    }

    const duplicate =
      await adminDb
        .collection("categorias")
        .where("nombre", "==", nombre)
        .limit(1)
        .get();

    if (!duplicate.empty) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe una categoría con ese nombre.",
        },
        { status: 409 },
      );
    }

    const ref =
      adminDb
        .collection("categorias")
        .doc();

    const data = {
      nombre,
      fechaCreacion:
        FieldValue.serverTimestamp(),
      fechaActualizacion:
        FieldValue.serverTimestamp(),
      fechaClausura: null,
    };

    await ref.set(data);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ref.id,
          nombre,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error creando categoría:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "NO_AUTH"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
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
          "No fue posible crear la categoría.",
      },
      { status: 500 },
    );
  }
}