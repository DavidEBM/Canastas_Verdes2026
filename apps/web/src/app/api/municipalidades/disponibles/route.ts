import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COLLECTION = "municipalidades";

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/_/g, " ").trim();
}

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const data = snapshot.docs
      .map((doc) => {
        const value = doc.data();

        // Compatibilidad con la estructura actual de Firebase
        // y con la nueva nomenclatura.
        const nombre =
          normalizeText(value.nombre) ||
          normalizeText(value.Nombre) ||
          doc.id;

        const activo =
          typeof value.activo === "boolean"
            ? value.activo
            : typeof value.Activo === "boolean"
              ? value.Activo
              : true;

        return {
          id: doc.id,
          nombre,
          activo,
        };
      })
      .filter((municipalidad) => municipalidad.activo)
      .map(({ id, nombre }) => ({
        id,
        nombre,
      }))
      .sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es",
        ),
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error obteniendo municipalidades disponibles:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible cargar las municipalidades.",
      },
      { status: 500 },
    );
  }
}