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

type Estado = (typeof ESTADOS)[number];

type Rol =
  | "consumidor"
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
    typeof value !== "string" ||
    !ESTADOS.includes(
      value as Estado,
    )
  ) {
    return null;
  }

  return value as Estado;
}

/*
 * ====================================================
 * ROLES
 * ====================================================
 */

function normalizeRole(
  value: unknown,
): Rol {
  if (
    typeof value !== "string"
  ) {
    return "consumidor";
  }

  const role =
    value
      .trim()
      .toLowerCase();

  if (role === "admin") {
    return "admin";
  }

  if (
    role === "repartidor"
  ) {
    return "repartidor";
  }

  return "consumidor";
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
 *
 * Primero se revisan Custom Claims.
 *
 * Si no existe el rol allí, se consulta:
 *
 * usuarios/{uid}.Rol
 *
 * Esto permite trabajar con el esquema actual
 * de Canastas Verdes.
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

  /*
   * Si Firebase Auth no tiene el rol como
   * Custom Claim, buscamos el documento del usuario.
   */

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
      role = "consumidor";
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

    const { id } =
      await params;

    const pedidoId =
      id.trim();

    if (!pedidoId) {
      return errorResponse(
        "El pedido es obligatorio.",
        400,
      );
    }

    const snapshot =
      await adminDb
        .collection("pedidos")
        .doc(pedidoId)
        .get();

    if (!snapshot.exists) {
      return errorResponse(
        "El pedido no existe.",
        404,
      );
    }

    const data =
      snapshot.data();

    if (!data) {
      return errorResponse(
        "El pedido no contiene información válida.",
        409,
      );
    }

    const isOwner =
      data.usuarioId ===
      user.uid;

    const isAssignedDeliverer =
      data.repartidorId ===
      user.uid;

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
      error.message ===
        "NO_AUTH"
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
 * ADMIN:
 *   - puede cambiar estados
 *   - puede asignar repartidores
 *   - puede retirar repartidores
 *
 * REPARTIDOR:
 *   - solamente puede cambiar su propio pedido
 *   - solamente puede pasar:
 *
 *       asignado -> en_camino
 *
 * USUARIO:
 *   - no puede modificar pedidos
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

    const { id } =
      await params;

    const pedidoId =
      id.trim();

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
     * ==================================================
     * REGLAS PREVIAS DE AUTORIZACIÓN
     * ==================================================
     *
     * Un repartidor solamente puede solicitar:
     *
     * {
     *   estado: "en_camino"
     * }
     *
     * No puede asignarse pedidos,
     * cambiar repartidores,
     * cancelar pedidos,
     * ni modificar otros estados.
     */

    if (
      role === "consumidor"
    ) {
      return errorResponse(
        "No tienes permiso para modificar pedidos.",
        403,
      );
    }

    if (
      role ===
      "repartidor"
    ) {
      const keys =
        Object.keys(input);

      const soloEstado =
        keys.length === 1 &&
        keys[0] ===
          "estado";

      const estadoSolicitado =
        normalizeEstado(
          input.estado,
        );

      if (
        !soloEstado ||
        estadoSolicitado !==
          "en_camino"
      ) {
        return errorResponse(
          "Un repartidor solamente puede marcar en camino sus pedidos asignados.",
          403,
        );
      }
    }

    /*
     * ==================================================
     * REFERENCIA DEL PEDIDO
     * ==================================================
     */

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(pedidoId);

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

          /*
           * ==================================================
           * SEGURIDAD DEL REPARTIDOR
           * ==================================================
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

          const updates: Record<
            string,
            unknown
          > = {
            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

          /*
           * ==================================================
           * CAMBIO DE ESTADO
           * ==================================================
           */

          if (
            "estado" in input
          ) {
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

            if (
              !currentStatus
            ) {
              throw new Error(
                "INVALID_CURRENT_STATUS",
              );
            }

            /*
             * Pedidos finales.
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
             * Reglas de transición.
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
              ].includes(
                estado,
              )
            ) {
              throw new Error(
                "INVALID_TRANSITION",
              );
            }

            /*
             * Repartidor solamente puede:
             *
             * asignado -> en_camino
             */

            if (
              role ===
                "repartidor" &&
              !(
                currentStatus ===
                  "asignado" &&
                estado ===
                  "en_camino"
              )
            ) {
              throw new Error(
                "DELIVERER_STATUS_FORBIDDEN",
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
           * ==================================================
           * ASIGNACIÓN DE REPARTIDOR
           * ==================================================
           *
           * Solamente ADMIN puede realizar esto.
           */

          if (
            "repartidorId" in
            input
          ) {
            if (
              role !== "admin"
            ) {
              throw new Error(
                "DELIVERER_ASSIGN_FORBIDDEN",
              );
            }

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

              /*
               * Primero intentamos Custom Claims.
               */

              let delivererRole =
                roleFromClaims(
                  deliverer.customClaims ??
                    {},
                );

              /*
               * Si no existe el claim,
               * buscamos usuarios/{uid}.Rol
               */

              if (
                !delivererRole
              ) {
                const delivererSnap =
                  await adminDb
                    .collection(
                      "usuarios",
                    )
                    .doc(
                      deliverer.uid,
                    )
                    .get();

                if (
                  delivererSnap.exists
                ) {
                  const data =
                    delivererSnap.data() as Record<
                      string,
                      unknown
                    >;

                  delivererRole =
                    normalizeRole(
                      data.Rol ??
                        data.rol ??
                        data.Role ??
                        data.role,
                    );
                }
              }

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
                !(
                  "estado" in
                  input
                )
              ) {
                updates.estado =
                  "asignado";
              }
            } else {
              updates.repartidorId =
                null;
            }
          }

          /*
           * ==================================================
           * ACTUALIZAR
           * ==================================================
           */

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
            "El pedido no existe.",
            404,
          );

        case "INVALID_ORDER":
          return errorResponse(
            "El pedido contiene información inválida.",
            409,
          );

        case "NOT_ASSIGNED":
          return errorResponse(
            "Este pedido no está asignado a este repartidor.",
            403,
          );

        case "DELIVERER_STATUS_FORBIDDEN":
          return errorResponse(
            "Un repartidor solamente puede marcar en camino un pedido asignado a él.",
            403,
          );

        case "DELIVERER_ASSIGN_FORBIDDEN":
          return errorResponse(
            "Solo un administrador puede asignar repartidores.",
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