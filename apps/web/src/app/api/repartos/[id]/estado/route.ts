import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ESTADOS = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

type Estado =
  (typeof ESTADOS)[number];

type Rol =
  | "usuario"
  | "repartidor"
  | "admin";

/*
 * ====================================================
 * UTILIDADES
 * ====================================================
 */

function tokenFrom(
  request: Request,
): string | null {
  const value =
    request.headers.get(
      "authorization",
    );

  if (
    !value?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    value
      .slice(7)
      .trim();

  return token || null;
}

function normalizeEstado(
  value: unknown,
): Estado | null {
  if (
    typeof value !==
      "string" ||
    !ESTADOS.includes(
      value as Estado,
    )
  ) {
    return null;
  }

  return value as Estado;
}

function normalizeRole(
  value: unknown,
): Rol {
  if (
    typeof value !==
    "string"
  ) {
    return "usuario";
  }

  const role =
    value
      .trim()
      .toLowerCase();

  if (
    role === "admin"
  ) {
    return "admin";
  }

  if (
    role === "repartidor"
  ) {
    return "repartidor";
  }

  return "usuario";
}

function roleFromClaims(
  claims: Record<
    string,
    unknown
  >,
): Rol | null {
  const role =
    claims.role ??
    claims.Rol ??
    claims.rol;

  if (
    role === "admin" ||
    role === "repartidor"
  ) {
    return normalizeRole(
      role,
    );
  }

  return null;
}

/*
 * ====================================================
 * AUTENTICACIÓN
 * ====================================================
 */

async function authenticate(
  request: Request,
) {
  const token =
    tokenFrom(request);

  if (!token) {
    throw new Error(
      "NO_AUTH",
    );
  }

  const user =
    await adminAuth.verifyIdToken(
      token,
    );

  let role =
    roleFromClaims(
      user as Record<
        string,
        unknown
      >,
    );

  if (!role) {
    const usuarioSnap =
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .get();

    if (
      usuarioSnap.exists
    ) {
      const usuarioData =
        usuarioSnap.data() as Record<
          string,
          unknown
        >;

      role =
        normalizeRole(
          usuarioData.Rol ??
            usuarioData.rol ??
            usuarioData.Role ??
            usuarioData.role,
        );
    } else {
      role = "usuario";
    }
  }

  return {
    user,
    role,
  };
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

/*
 * ====================================================
 * PATCH
 * ====================================================
 *
 * Cambia exclusivamente el estado del reparto.
 *
 * IMPORTANTE:
 *
 * La ruta /api/pedidos/[id]/route.ts continúa siendo
 * compatible con RepartoCard.
 *
 * Esta ruta existe como endpoint específico del módulo
 * de repartos.
 *
 * REPARTIDOR:
 *   asignado -> en_camino
 *
 * ADMIN:
 *   pendiente -> asignado
 *   asignado -> en_camino
 *   pendiente -> cancelado
 *   asignado -> cancelado
 *
 * ENTREGADO:
 *   Se registra mediante /recibido, con firma.
 */

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const {
      user,
      role,
    } =
      await authenticate(
        request,
      );

    if (
      role !== "admin" &&
      role !== "repartidor"
    ) {
      return errorResponse(
        "No tienes permiso para modificar repartos.",
        403,
      );
    }

    const { id } =
      await params;

    const repartoId =
      id.trim();

    if (!repartoId) {
      return errorResponse(
        "El reparto es obligatorio.",
        400,
      );
    }

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !==
        "object"
    ) {
      return errorResponse(
        "Solicitud inválida.",
        400,
      );
    }

    const input =
      body as Record<
        string,
        unknown
      >;

    /*
     * Este endpoint solamente acepta estado.
     */

    const keys =
      Object.keys(input);

    if (
      keys.length !== 1 ||
      keys[0] !== "estado"
    ) {
      return errorResponse(
        "Esta ruta solamente permite modificar el estado del reparto.",
        400,
      );
    }

    const estado =
      normalizeEstado(
        input.estado,
      );

    if (!estado) {
      return errorResponse(
        "El estado indicado no es válido.",
        400,
      );
    }

    /*
     * Entregado debe pasar por /recibido.
     */

    if (
      estado ===
      "entregado"
    ) {
      return errorResponse(
        "Un pedido solamente puede marcarse como entregado mediante la confirmación de recepción.",
        409,
      );
    }

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(repartoId);

    const result =
      await adminDb.runTransaction(
        async (
          transaction,
        ) => {
          const pedido =
            await transaction.get(
              pedidoRef,
            );

          if (
            !pedido.exists
          ) {
            throw new Error(
              "NOT_FOUND",
            );
          }

          const current =
            pedido.data();

          if (!current) {
            throw new Error(
              "INVALID_ORDER",
            );
          }

          const currentEstado =
            normalizeEstado(
              current.estado,
            );

          if (
            !currentEstado
          ) {
            throw new Error(
              "INVALID_CURRENT_STATUS",
            );
          }

          /*
           * Repartidor solamente puede modificar
           * su propio pedido.
           */

          if (
            role ===
              "repartidor" &&
            current.repartidorId !==
              user.uid
          ) {
            throw new Error(
              "NOT_ASSIGNED",
            );
          }

          /*
           * Estados finales.
           */

          if (
            currentEstado ===
              "entregado" ||
            currentEstado ===
              "cancelado"
          ) {
            throw new Error(
              "FINAL_STATUS",
            );
          }

          /*
           * ==================================================
           * REGLAS PARA REPARTIDOR
           * ==================================================
           */

          if (
            role ===
            "repartidor"
          ) {
            if (
              !(
                currentEstado ===
                  "asignado" &&
                estado ===
                  "en_camino"
              )
            ) {
              throw new Error(
                "DELIVERER_STATUS_FORBIDDEN",
              );
            }
          }

          /*
           * ==================================================
           * REGLAS PARA ADMIN
           * ==================================================
           */

          if (
            role ===
            "admin"
          ) {
            const validAdminTransitions:
              Record<
                Estado,
                Estado[]
              > = {
              pendiente: [
                "asignado",
                "cancelado",
              ],

              asignado: [
                "en_camino",
                "cancelado",
              ],

              en_camino: [],

              entregado: [],

              cancelado: [],
            };

            if (
              currentEstado !==
                estado &&
              !validAdminTransitions[
                currentEstado
              ].includes(
                estado,
              )
            ) {
              throw new Error(
                "INVALID_TRANSITION",
              );
            }
          }

          /*
           * No hacemos escritura innecesaria
           * si el estado ya es el solicitado.
           */

          if (
            currentEstado ===
            estado
          ) {
            return {
              id: repartoId,
              estado,
              cambio: false,
            };
          }

          const updates: Record<
            string,
            unknown
          > = {
            estado,
            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

          if (
            estado ===
            "cancelado"
          ) {
            updates.fechaCancelacion =
              FieldValue.serverTimestamp();
          }

          transaction.update(
            pedidoRef,
            updates,
          );

          return {
            id: repartoId,
            estado,
            cambio: true,
          };
        },
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Error actualizando estado del reparto:",
      error,
    );

    if (
      error instanceof Error
    ) {
      switch (
        error.message
      ) {
        case "NO_AUTH":
          return errorResponse(
            "Debes iniciar sesión.",
            401,
          );

        case "NOT_FOUND":
          return errorResponse(
            "El reparto no existe.",
            404,
          );

        case "INVALID_ORDER":
          return errorResponse(
            "El pedido contiene información inválida.",
            409,
          );

        case "NOT_ASSIGNED":
          return errorResponse(
            "Este reparto no está asignado a este repartidor.",
            403,
          );

        case "DELIVERER_STATUS_FORBIDDEN":
          return errorResponse(
            "Un repartidor solamente puede marcar en camino un pedido asignado a él.",
            403,
          );

        case "INVALID_STATUS":
          return errorResponse(
            "El estado indicado no es válido.",
            400,
          );

        case "INVALID_CURRENT_STATUS":
          return errorResponse(
            "El estado actual del pedido no es válido.",
            409,
          );

        case "FINAL_STATUS":
          return errorResponse(
            "Un pedido entregado o cancelado no puede modificarse.",
            409,
          );

        case "INVALID_TRANSITION":
          return errorResponse(
            "El cambio de estado solicitado no está permitido.",
            409,
          );
      }
    }

    return errorResponse(
      "No fue posible actualizar el estado del reparto.",
      500,
    );
  }
}