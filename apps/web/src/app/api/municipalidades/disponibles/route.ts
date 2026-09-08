import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/_/g, " ").trim();
}

async function getAuthenticatedUser(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  return adminAuth.verifyIdToken(token);
}

export async function GET(request: Request) {
  try {
    // Cualquier usuario autenticado puede consultar
    // las municipalidades disponibles.
    await getAuthenticatedUser(request);

    const snapshot = await adminDb
      .collection(COLLECTION)
      .get();

    const data = snapshot.docs
      .filter((doc) => {
        const value = doc.data();

        return value.Activo === true;
      })
      .map((doc) => {
        const value = doc.data();

        return {
          id: doc.id,
          nombre:
            normalizeText(value.Nombre) ||
            doc.id,
        };
      })
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

    if (
      error instanceof Error &&
      error.message === "AUTH_REQUIRED"
    ) {
      return jsonError(
        "Debes iniciar sesión.",
        401,
      );
    }

    return jsonError(
      "No fue posible cargar las municipalidades.",
      500,
    );
  }
}