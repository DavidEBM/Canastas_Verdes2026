import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

function tokenFrom(
  request: Request,
): string | null {
  const value =
    request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value
    .slice(7)
    .trim();

  return token || null;
}

export async function GET(
  request: Request,
) {
  try {
    const token =
      tokenFrom(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        token,
      );

    const userRef =
      adminDb
        .collection("usuarios")
        .doc(decoded.uid);

    const snapshot =
      await userRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No existe un perfil de usuario.",
        },
        { status: 404 },
      );
    }

    const data =
      snapshot.data();

    const role =
      typeof data?.Rol === "string"
        ? data.Rol.trim().toLowerCase()
        : null;

    return NextResponse.json({
      success: true,
      data: {
        uid: decoded.uid,
        email:
          typeof data?.Correo === "string"
            ? data.Correo
            : decoded.email ?? "",
        nombres:
          typeof data?.Nombres === "string"
            ? data.Nombres
            : "",
        apellidos:
          typeof data?.Apellidos === "string"
            ? data.Apellidos
            : "",
        role,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo usuario:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible obtener los datos del usuario.",
      },
      { status: 401 },
    );
  }
}