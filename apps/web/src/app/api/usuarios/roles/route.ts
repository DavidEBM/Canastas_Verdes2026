import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const ROLES = ["usuario", "repartidor", "admin"] as const;

type Role = (typeof ROLES)[number];

function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    ROLES.includes(value as Role)
  );
}

function errorResponse(error: unknown) {
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
          "Solo un administrador puede gestionar roles.",
      },
      { status: 403 },
    );
  }

  console.error(
    "Error gestionando roles:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible gestionar los roles.",
    },
    { status: 500 },
  );
}

/**
 * GET
 *
 * Obtiene todos los usuarios de Firebase Authentication
 * y obtiene su rol desde:
 *
 * usuarios/{UID}.Rol
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const usersResult =
      await adminAuth.listUsers(1000);

    const users = await Promise.all(
      usersResult.users.map(
        async (user) => {
          const userSnapshot =
            await adminDb
              .collection("usuarios")
              .doc(user.uid)
              .get();

          const data =
            userSnapshot.exists
              ? userSnapshot.data()
              : undefined;

          const firestoreRole =
            typeof data?.Rol === "string"
              ? data.Rol
                  .trim()
                  .toLowerCase()
              : "usuario";

          const role: Role = isRole(
            firestoreRole,
          )
            ? firestoreRole
            : "usuario";

          return {
            uid: user.uid,
            email: user.email ?? "",
            displayName:
              user.displayName ?? "",
            disabled: user.disabled,
            role,
          };
        },
      ),
    );

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST
 *
 * Cambia el rol de un usuario en:
 *
 * usuarios/{UID}.Rol
 */
export async function POST(request: Request) {
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
            "Usuario o rol inválido.",
        },
        { status: 400 },
      );
    }

    const input =
      body as {
        usuarioId?: unknown;
        rol?: unknown;
      };

    if (
      typeof input.usuarioId !==
        "string" ||
      !input.usuarioId.trim() ||
      !isRole(input.rol)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Usuario o rol inválido.",
        },
        { status: 400 },
      );
    }

    const uid =
      input.usuarioId.trim();

    // Verificar que el usuario exista
    // en Firebase Authentication.
    await adminAuth.getUser(uid);

    const userRef =
      adminDb
        .collection("usuarios")
        .doc(uid);

    const userSnapshot =
      await userRef.get();

    if (userSnapshot.exists) {
      await userRef.update({
        Rol: input.rol,
        ultimaActualizacion:
          new Date(),
      });
    } else {
      await userRef.set({
        Rol: input.rol,
        ultimaActualizacion:
          new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        usuarioId: uid,
        rol: input.rol,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}