import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { requirePrivilegedAdmin } from "@/lib/require-privileged-admin";
import {
  ensureSystemLabels,
  legacyLabelMap,
  listUserLabels,
  normalizeLabelIds,
  storedDate,
  syncAutomaticLabels,
} from "@/lib/user-labels";

export const runtime = "nodejs";

const ROLES = [
  "consumidor",
  "repartidor",
  "admin",
] as const;

type Role = (typeof ROLES)[number];

function isRole(
  value: unknown,
): value is Role {
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

  if (
    error instanceof Error &&
    error.message === "PRIVILEGED_ADMIN_NOT_CONFIGURED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La gestión privilegiada no está configurada en el servidor.",
      },
      { status: 503 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "PRIVILEGED_ADMIN_FORBIDDEN"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Solo el administrador con permisos elevados puede modificar cuentas administrativas.",
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
    const administrator = await requireAdmin(request);

    await ensureSystemLabels();
    const [usersResult, labels] = await Promise.all([
      adminAuth.listUsers(1000),
      listUserLabels(),
    ]);
    const labelMap = new Map(labels.map((label) => [label.id, label]));

    const users = await Promise.all(
      usersResult.users.map(
        async (user) => {
          const userSnapshot =
            await adminDb
              .collection("usuarios")
              .doc(user.uid)
              .get();

          const data = userSnapshot.exists
            ? userSnapshot.data() ?? {}
            : {};

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
          const labelIds = await syncAutomaticLabels(user.uid);

          return {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? data.NombreCompleto ?? "",
            disabled: user.disabled,
            role,
            labelIds,
            labels: labelIds
              .map((id) => labelMap.get(id))
              .filter(Boolean)
              .map((label) => ({
                id: label!.id,
                name: label!.name,
                color: label!.color,
              })),
            labelRegisteredAt:
              storedDate(data?.FechaRegistro)?.toISOString() ?? null,
          };
        },
      ),
    );

    return NextResponse.json({
      success: true,
      data: users,
      labels,
      canManageAdminRoles:
        administrator.email_verified === true &&
        typeof administrator.email === "string" &&
        administrator.email.trim().toLowerCase() ===
          process.env.PRIVILEGED_ADMIN_EMAIL?.trim().toLowerCase(),
      canDeleteProfiles:
        administrator.email_verified === true &&
        typeof administrator.email === "string" &&
        administrator.email.trim().toLowerCase() ===
          process.env.PRIVILEGED_ADMIN_EMAIL?.trim().toLowerCase(),
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
    const administrator = await requireAdmin(request);

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

    const input = body as {
      usuarioId?: unknown;
      rol?: unknown;
      etiqueta?: unknown;
      addLabelId?: unknown;
      removeLabelId?: unknown;
    };

    const validRole = input.rol === undefined || isRole(input.rol);

    if (
      typeof input.usuarioId !== "string" ||
      !input.usuarioId.trim() ||
      !validRole
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
    const currentData = userSnapshot.exists
      ? userSnapshot.data() ?? {}
      : {};

    const currentRole =
      typeof currentData.Rol === "string"
        ? currentData.Rol.trim().toLowerCase()
        : "consumidor";

    if (
      input.rol !== undefined &&
      uid === administrator.uid
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No puedes cambiar tu propio rol desde este panel.",
        },
        { status: 409 },
      );
    }

    if (
      input.rol !== undefined &&
      (input.rol === "admin" || currentRole === "admin")
    ) {
      await requirePrivilegedAdmin(request);
    }

    const changes: Record<string, unknown> = {
      ultimaActualizacion: new Date(),
    };

    if (input.rol !== undefined) {
      changes.Rol = input.rol;
    }

    if (input.etiqueta !== undefined) {
      const legacyValue =
        typeof input.etiqueta === "string"
          ? input.etiqueta.trim().toLowerCase()
          : "";
      const labelId = legacyLabelMap[legacyValue] ?? legacyValue;
      const labels = await listUserLabels();
      if (!labelId || !labels.some((label) => label.id === labelId)) {
        return NextResponse.json(
          { success: false, message: "La etiqueta seleccionada no existe." },
          { status: 400 },
        );
      }
      changes.Etiquetas = [labelId];
      changes.EtiquetaUsuario = labelId;
    }

    if (
      input.addLabelId !== undefined ||
      input.removeLabelId !== undefined
    ) {
      const labels = await listUserLabels();
      const labelIds = new Set(normalizeLabelIds(currentData));
      const addLabelId =
        typeof input.addLabelId === "string"
          ? input.addLabelId.trim()
          : "";
      const removeLabelId =
        typeof input.removeLabelId === "string"
          ? input.removeLabelId.trim()
          : "";

      if (
        addLabelId &&
        !labels.some((label) => label.id === addLabelId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "La etiqueta seleccionada no existe.",
          },
          { status: 400 },
        );
      }

      if (
        removeLabelId &&
        !labels.some((label) => label.id === removeLabelId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "La etiqueta seleccionada no existe.",
          },
          { status: 400 },
        );
      }

      if (addLabelId) labelIds.add(addLabelId);
      if (removeLabelId) labelIds.delete(removeLabelId);
      changes.Etiquetas = [...labelIds];
      changes.EtiquetaUsuario = [...labelIds][0] ?? "default";
    }

    if (
      input.rol === undefined &&
      input.etiqueta === undefined &&
      input.addLabelId === undefined &&
      input.removeLabelId === undefined
    ) {
      return NextResponse.json(
        { success: false, message: "No se indicó ningún cambio." },
        { status: 400 },
      );
    }

    if (userSnapshot.exists) {
      await userRef.update(changes);
    } else {
      await userRef.set({
        ...changes,
        Rol: input.rol ?? "consumidor",
        Etiquetas: (changes.Etiquetas as string[] | undefined) ?? ["default"],
        EtiquetaUsuario:
          (changes.EtiquetaUsuario as string | undefined) ?? "default",
        FechaRegistro: new Date(),
      });
    }

    const labelIds = await syncAutomaticLabels(uid);

    return NextResponse.json({
      success: true,
      data: {
        usuarioId: uid,
        rol: input.rol,
        etiqueta: input.etiqueta,
        labelIds,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
