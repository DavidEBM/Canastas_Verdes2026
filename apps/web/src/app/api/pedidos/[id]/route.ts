import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ESTADOS = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

type Estado = (typeof ESTADOS)[number];

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

function normalizeEstado(value: unknown): Estado | null {
  if (
    typeof value !== "string" ||
    !ESTADOS.includes(value as Estado)
  ) {
    return null;
  }

  return value as Estado;
}

function roleOf(
  claims: Record<string, unknown>,
): "usuario" | "repartidor" | "admin" {
  if (claims.role === "admin") {
    return "admin";
  }

  if (claims.role === "repartidor") {
    return "repartidor";
  }

  return "usuario";
}

async function authenticate(request: Request) {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  return adminAuth.verifyIdToken(token);
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
    { status },
  );
}

/*
 * ====================================================
 * GET
 * ====================================================
 *
 * Obtiene un pedido individual.
 *
 * Usuario:
 *   solamente puede consultar sus propios pedidos.
 *
 * Admin:
 *   puede consultar cualquier pedido.
 *
 * Repartidor:
 *   solamente puede consultar pedidos asignados a él.
 */

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const user =
      await authenticate(request);

    const { id } = await params;
    const pedidoId = id.trim();

    if (!pedidoId) {
      return errorResponse(
        "El pedido es obligatorio.",
        400,
      );
    }

    const snapshot = await adminDb
      .collection("pedidos")
      .doc(pedidoId)
      .get();

    if (!snapshot.exists) {
      return errorResponse(
        "El pedido no existe.",
        404,
      );
    }

    const data = snapshot.data();

    if (!data) {
      return errorResponse(
        "El pedido no contiene información válida.",
        409,
      );
    }

    const role = roleOf(user);

    const isOwner =
      data.usuarioId === user.uid;

    const isAssignedDeliverer =
      data.repartidorId === user.uid;

    if (
      role !== "admin" &&
      !isOwner &&
      !isAssignedDeliverer
    ) {
      return errorResponse(
        "No tienes permiso para consultar este pedido.",
        403,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: snapshot.id,
        ...data,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo pedido:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "NO_AUTH"
    ) {
      return errorResponse(
        "Debes iniciar sesión.",
        401,
      );
    }

    return errorResponse(
      "No fue posible obtener el pedido.",
      500,
    );
  }
}

/*
 * ====================================================
 * PATCH
 * ====================================================
 *
 * Actualiza datos administrativos del pedido.
 *
 * Actualmente permite:
 *
 * - cambiar estado
 * - asignar repartidor
 * - retirar repartidor
 *
 * Solamente ADMIN puede realizar estas operaciones.
 */

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const user =
      await authenticate(request);

    if (roleOf(user) !== "admin") {
      return errorResponse(
        "Solo un administrador puede modificar pedidos.",
        403,
      );
    }

    const { id } = await params;
    const pedidoId = id.trim();

    if (!pedidoId) {
      return errorResponse(
        "El pedido es obligatorio.",
        400,
      );
    }

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return errorResponse(
        "Solicitud inválida.",
        400,
      );
    }

    const input =
      body as Record<string, unknown>;

    const pedidoRef = adminDb
      .collection("pedidos")
      .doc(pedidoId);

    const result =
      await adminDb.runTransaction(
        async (transaction) => {
          const pedido =
            await transaction.get(
              pedidoRef,
            );

          if (!pedido.exists) {
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

          const updates: Record<
            string,
            unknown
          > = {
            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

          /*
           * ==========================================
           * Cambio de estado
           * ==========================================
           */

          if ("estado" in input) {
            const estado =
              normalizeEstado(
                input.estado,
              );

            if (!estado) {
              throw new Error(
                "INVALID_STATUS",
              );
            }

            const currentStatus =
              normalizeEstado(
                current.estado,
              );

            if (!currentStatus) {
              throw new Error(
                "INVALID_CURRENT_STATUS",
              );
            }

            /*
             * No permitimos modificar un pedido
             * que ya fue cancelado o entregado.
             */

            if (
              currentStatus ===
                "cancelado" ||
              currentStatus ===
                "entregado"
            ) {
              throw new Error(
                "FINAL_STATUS",
              );
            }

            /*
             * Reglas básicas de transición.
             */

            const validTransitions:
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
              en_camino: [
                "entregado",
              ],
              entregado: [],
              cancelado: [],
            };

            if (
              currentStatus !==
                estado &&
              !validTransitions[
                currentStatus
              ].includes(estado)
            ) {
              throw new Error(
                "INVALID_TRANSITION",
              );
            }

            updates.estado =
              estado;

            if (
              estado ===
              "cancelado"
            ) {
              updates.fechaCancelacion =
                FieldValue.serverTimestamp();
            }
          }

          /*
           * ==========================================
           * Asignación de repartidor
           * ==========================================
           */

          if (
            "repartidorId" in input
          ) {
            const value =
              input.repartidorId;

            if (
              value !== null &&
              typeof value !==
                "string"
            ) {
              throw new Error(
                "INVALID_DELIVERER",
              );
            }

            if (
              typeof value ===
                "string" &&
              value.trim()
            ) {
              const delivererId =
                value.trim();

              const deliverer =
                await adminAuth.getUser(
                  delivererId,
                );

              const delivererRole =
                roleOf(
                  deliverer
                    .customClaims ??
                    {},
                );

              if (
                delivererRole !==
                "repartidor"
              ) {
                throw new Error(
                  "INVALID_DELIVERER",
                );
              }

              if (
                deliverer.disabled
              ) {
                throw new Error(
                  "DISABLED_DELIVERER",
                );
              }

              updates.repartidorId =
                deliverer.uid;

              /*
               * Si se asigna un repartidor
               * a un pedido pendiente,
               * pasa automáticamente a asignado.
               */

              const currentStatus =
                normalizeEstado(
                  current.estado,
                );

              if (
                currentStatus ===
                "pendiente" &&
                !("estado" in input)
              ) {
                updates.estado =
                  "asignado";
              }
            } else {
              updates.repartidorId =
                null;
            }
          }

          transaction.update(
            pedidoRef,
            updates,
          );

          return {
            id: pedidoId,
            ...updates,
          };
        },
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Error actualizando pedido:",
      error,
    );

    if (
      error instanceof Error
    ) {
      switch (error.message) {
        case "NO_AUTH":
          return errorResponse(
            "Debes iniciar sesión.",
            401,
          );

        case "NOT_FOUND":
          return errorResponse(
            "El pedido no existe.",
            404,
          );

        case "INVALID_ORDER":
          return errorResponse(
            "El pedido contiene información inválida.",
            409,
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

        case "INVALID_DELIVERER":
          return errorResponse(
            "El usuario indicado no tiene el rol de repartidor.",
            400,
          );

        case "DISABLED_DELIVERER":
          return errorResponse(
            "El repartidor seleccionado está deshabilitado.",
            409,
          );
      }
    }

    return errorResponse(
      "No fue posible actualizar el pedido.",
      500,
    );
  }
}
