import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.substring(7).trim();

  return token.length > 0 ? token : null;
}

function normalizeRole(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value.trim().toLowerCase();

  if (!role) {
    return null;
  }

  return role;
}

export async function GET(request: Request) {
  try {
    // --------------------------------------------------
    // 1. Obtener token de Firebase Authentication
    // --------------------------------------------------

    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Validar token y obtener UID
    // --------------------------------------------------

    const decodedToken = await adminAuth.verifyIdToken(token);

    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message: "El token no contiene un UID válido.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 3. Buscar usuarios/{uid} en Firestore
    // --------------------------------------------------

    const userRef = adminDb.collection("usuarios").doc(uid);

    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "No existe un perfil de usuario.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 4. Obtener datos del documento
    // --------------------------------------------------

    const userData = userSnapshot.data();

    if (!userData) {
      return NextResponse.json(
        {
          success: false,
          message: "El perfil de usuario está vacío.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // 5. Obtener y normalizar rol
    // --------------------------------------------------

    const role = normalizeRole(userData.Rol);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: "El usuario no tiene un rol válido.",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // 6. Construir perfil
    // --------------------------------------------------

    const user = {
      uid,

      email:
        typeof userData.Correo === "string"
          ? userData.Correo.trim()
          : decodedToken.email ?? "",

      nombres:
        typeof userData.Nombres === "string"
          ? userData.Nombres.trim()
          : "",

      apellidos:
        typeof userData.Apellidos === "string"
          ? userData.Apellidos.trim()
          : "",

      direccion:
        typeof userData.Direccion === "string"
          ? userData.Direccion.trim()
          : "",

      telefono:
        typeof userData.Telefono === "string"
          ? userData.Telefono.trim()
          : "",

      role,
    };

    // --------------------------------------------------
    // 7. Respuesta
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error obteniendo usuario:", error);

    // Token inválido o expirado
    if (
      error instanceof Error &&
      (
        error.message.includes("expired") ||
        error.message.includes("invalid")
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "La sesión no es válida o ha expirado.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible obtener los datos del usuario.",
      },
      { status: 500 },
    );
  }
}