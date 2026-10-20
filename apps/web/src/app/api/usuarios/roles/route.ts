import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const ROLES = [
  "consumidor",
  "repartidor",
  "admin",
] as const;
const USER_LABELS = [
  "usuario_nuevo",
  "usuario_frecuente",
  "comprador_frecuente",
  "asociacion_agricultores",
  "mayorista",
] as const;
const USER_LABEL_DAYS = 30;

type Role = (typeof ROLES)[number];
type UserLabel = (typeof USER_LABELS)[number];

function isRole(
  value: unknown,
): value is Role {
  return (
    typeof value === "string" &&
    ROLES.includes(value as Role)
  );
}

function isUserLabel(value: unknown): value is UserLabel {
  return (
    typeof value === "string" &&
    USER_LABELS.includes(value as UserLabel)
  );
}

function storedDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  return value instanceof Date ? value : null;
}

function resolveLabel(data: FirebaseFirestore.DocumentData): UserLabel {
  const current = isUserLabel(data.EtiquetaUsuario)
    ? data.EtiquetaUsuario
    : "usuario_nuevo";
  const registeredAt = storedDate(data.FechaRegistro);
  const elapsedDays = registeredAt
    ? (Date.now() - registeredAt.getTime()) / 86400000
    : 0;

  if (current === "usuario_nuevo" && elapsedDays >= USER_LABEL_DAYS) {
    return "usuario_frecuente";
  }

  return current;
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
              : "consumidor";

          const role: Role = isRole(
            firestoreRole,
          )
            ? firestoreRole
            : "consumidor";
          const label = resolveLabel(data ?? {});

          if (label !== data?.EtiquetaUsuario) {
            await adminDb
              .collection("usuarios")
              .doc(user.uid)
              .set(
                {
                  EtiquetaUsuario: label,
                  ultimaActualizacion: new Date(),
                },
                { merge: true },
              );
          }

          return {
            uid: user.uid,
            email: user.email ?? "",
            displayName:
              user.displayName ?? "",
            disabled: user.disabled,
            role,
            label,
            labelRegisteredAt:
              storedDate(data?.FechaRegistro)?.toISOString() ?? null,
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
        etiqueta?: unknown;
      };

    const validRole = input.rol === undefined || isRole(input.rol);
    const validLabel = input.etiqueta === undefined || isUserLabel(input.etiqueta);

    if (
      typeof input.usuarioId !== "string" ||
      !input.usuarioId.trim() ||
      !validRole ||
      !validLabel ||
      (input.rol === undefined && input.etiqueta === undefined)
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

    const changes: Record<string, unknown> = {
      ultimaActualizacion: new Date(),
    };

    if (input.rol !== undefined) {
      changes.Rol = input.rol;
    }

    if (input.etiqueta !== undefined) {
      changes.EtiquetaUsuario = input.etiqueta;
    }

    if (userSnapshot.exists) {
      await userRef.update(changes);
    } else {
      await userRef.set({
        ...changes,
        Rol: input.rol ?? "consumidor",
        EtiquetaUsuario: input.etiqueta ?? "usuario_nuevo",
        FechaRegistro: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        usuarioId: uid,
        rol: input.rol,
        etiqueta: input.etiqueta,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
