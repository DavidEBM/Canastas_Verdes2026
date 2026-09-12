import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/*
 * ============================================================
 * Tipos internos
 * ============================================================
 */

type Rol = "admin" | "repartidor" | "consumidor";

const ESTADOS_REPARTO = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
] as const;

type EstadoReparto =
  (typeof ESTADOS_REPARTO)[number];

interface ProductoPedido {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
  IdProductor: string;
  IdMunicipalidad: string;
}

interface PedidoData {
  usuarioId?: unknown;
  productos?: unknown;
  subtotal?: unknown;
  total?: unknown;
  estado?: unknown;
  reservaId?: unknown;
  IdMunicipalidad?: unknown;
  direccionEntrega?: unknown;
  repartidorId?: unknown;
  fechaCreacion?: unknown;
  ultimaActualizacion?: unknown;
  fechaCancelacion?: unknown;
}

interface UsuarioData {
  Nombres?: unknown;
  Apellidos?: unknown;
  Correo?: unknown;
  Telefono?: unknown;
  Direccion?: unknown;
  Rol?: unknown;
}

interface MunicipalidadData {
  Id?: unknown;
  Nombre?: unknown;
}

/*
 * ============================================================
 * Autenticación
 * ============================================================
 */

function tokenFrom(
  request: Request,
): string | null {
  const value =
    request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

function normalizeRole(
  value: unknown,
): Rol {
  if (typeof value !== "string") {
    return "consumidor";
  }

  const role = value
    .trim()
    .toLowerCase();

  if (role === "admin") {
    return "admin";
  }

  if (role === "repartidor") {
    return "repartidor";
  }

  /*
   * Sistema actual:
   * usuario -> consumidor
   */
  return "consumidor";
}

function roleFromClaims(
  claims: Record<string, unknown>,
): Rol | null {
  const role =
    claims.role ??
    claims.Rol ??
    claims.rol;

  if (
    role === "admin" ||
    role === "repartidor" ||
    role === "consumidor"
  ) {
    return normalizeRole(role);
  }

  return null;
}

async function authenticate(
  request: Request,
) {
  const token = tokenFrom(request);

  if (!token) {
    return {
      ok: false as const,
      response: errorResponse(
        "Debes iniciar sesión para consultar los repartos.",
        401,
      ),
    };
  }

  try {
    const user =
      await adminAuth.verifyIdToken(token);

    /*
     * ========================================================
     * 1. Intentar obtener el rol desde Firebase Custom Claims
     * ========================================================
     */

    const claimRole =
      roleFromClaims(user);

    if (claimRole) {
      return {
        ok: true as const,
        user,
        role: claimRole,
      };
    }

    /*
     * ========================================================
     * 2. Obtener el rol desde usuarios/{uid}.Rol
     * ========================================================
     */

    const usuarioSnapshot =
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .get();

    if (usuarioSnapshot.exists) {
      const usuarioData =
        usuarioSnapshot.data() as {
          Rol?: unknown;
        };

      const firestoreRole =
        normalizeRole(
          usuarioData.Rol,
        );

      return {
        ok: true as const,
        user,
        role: firestoreRole,
      };
    }

    /*
     * ========================================================
     * 3. Usuario autenticado sin perfil
     * ========================================================
     */

    return {
      ok: true as const,
      user,
      role: "consumidor" as const,
    };
  } catch (error) {
    console.error(
      "Error autenticando usuario en /api/repartos:",
      error,
    );

    return {
      ok: false as const,
      response: errorResponse(
        "La sesión no es válida o ha expirado.",
        401,
      ),
    };
  }
}

/*
 * ============================================================
 * Respuestas
 * ============================================================
 */

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
 * ============================================================
 * Utilidades
 * ============================================================
 */

function stringValue(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
    : "";
}

function numberValue(
  value: unknown,
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeText(
  value: unknown,
): string {
  return stringValue(value)
    .replace(/_/g, " ")
    .trim();
}

function normalizeEstado(
  value: unknown,
): EstadoReparto | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return (
    ESTADOS_REPARTO as readonly string[]
  ).includes(value)
    ? (value as EstadoReparto)
    : null;
}

function serializeTimestamp(
  value: unknown,
): unknown {
  if (!value) {
    return null;
  }

  /*
   * Firestore Timestamp.
   */
  if (
    typeof value === "object" &&
    value !== null
  ) {
    const candidate =
      value as {
        toDate?: () => Date;
        seconds?: number;
        nanoseconds?: number;
      };

    if (
      typeof candidate.toDate ===
      "function"
    ) {
      return candidate
        .toDate()
        .toISOString();
    }

    if (
      typeof candidate.seconds ===
      "number"
    ) {
      return {
        seconds: candidate.seconds,
        nanoseconds:
          candidate.nanoseconds ?? 0,
      };
    }
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  return value;
}

/*
 * ============================================================
 * Usuario vacío
 * ============================================================
 */

function emptyClient(
  userId: string,
) {
  return {
    id: userId,
    nombres: "",
    apellidos: "",
    nombreCompleto: "Consumidor",
    correo: "",
    telefono: "",
    direccion: "",
  };
}

function emptyCourier(
  userId: string,
) {
  return {
    id: userId,
    nombres: "",
    apellidos: "",
    nombreCompleto: "Repartidor",
    correo: "",
    telefono: "",
  };
}

/*
 * ============================================================
 * GET /api/repartos
 * ============================================================
 *
 * Admin:
 *   devuelve todos los pedidos que pertenecen al flujo
 *   de repartos.
 *
 * Repartidor:
 *   devuelve únicamente los pedidos asignados a su UID.
 *
 * Consumidor:
 *   no tiene acceso a este endpoint.
 */

export async function GET(
  request: Request,
) {
  try {
    /*
     * ========================================================
     * Autenticación
     * ========================================================
     */

    const authentication =
      await authenticate(request);

    if (!authentication.ok) {
      return authentication.response;
    }

    const {
      user,
      role,
    } = authentication;

    /*
     * ========================================================
     * Autorización
     * ========================================================
     */

    if (
      role !== "admin" &&
      role !== "repartidor"
    ) {
      return errorResponse(
        "No tienes permisos para consultar los repartos.",
        403,
      );
    }

    /*
     * ========================================================
     * Obtener pedidos
     * ========================================================
     *
     * No utilizamos orderBy() para evitar depender de índices
     * compuestos de Firestore.
     *
     * Posteriormente ordenamos en memoria.
     */

    const snapshot =
      await adminDb
        .collection("pedidos")
        .get();

    const pedidos = snapshot.docs
      .map((document) => ({
        id: document.id,
        data:
          document.data() as PedidoData,
      }))
      .filter(({ data }) => {
        const estado =
          normalizeEstado(
            data.estado,
          );

        /*
         * Solamente pedidos pertenecientes
         * al flujo de repartos.
         */
        if (!estado) {
          return false;
        }

        /*
         * Un repartidor solamente puede ver
         * sus propios pedidos.
         */
        if (
          role === "repartidor"
        ) {
          return (
            data.repartidorId ===
            user.uid
          );
        }

        return true;
      });

    /*
     * ========================================================
     * Obtener IDs relacionados
     * ========================================================
     */

    const usuarioIds =
      new Set<string>();

    const repartidorIds =
      new Set<string>();

    const municipalidadIds =
      new Set<string>();

    for (const pedido of pedidos) {
      const data =
        pedido.data;

      const usuarioId =
        stringValue(
          data.usuarioId,
        );

      if (usuarioId) {
        usuarioIds.add(
          usuarioId,
        );
      }

      const repartidorId =
        stringValue(
          data.repartidorId,
        );

      if (repartidorId) {
        repartidorIds.add(
          repartidorId,
        );
      }

      const municipalidadId =
        stringValue(
          data.IdMunicipalidad,
        );

      if (municipalidadId) {
        municipalidadIds.add(
          municipalidadId,
        );
      }
    }

    /*
     * ========================================================
     * Cargar usuarios relacionados
     * ========================================================
     */

    const usuarios =
      new Map<
        string,
        UsuarioData
      >();

    const allUserIds =
      Array.from(
        new Set([
          ...usuarioIds,
          ...repartidorIds,
        ]),
      );

    for (
      let index = 0;
      index < allUserIds.length;
      index += 30
    ) {
      const batch =
        allUserIds.slice(
          index,
          index + 30,
        );

      if (batch.length === 0) {
        continue;
      }

      const references =
        batch.map((id) =>
          adminDb
            .collection("usuarios")
            .doc(id),
        );

      const documents =
        await adminDb.getAll(
          ...references,
        );

      for (
        let documentIndex = 0;
        documentIndex <
        documents.length;
        documentIndex += 1
      ) {
        const document =
          documents[documentIndex];

        if (!document.exists) {
          continue;
        }

        usuarios.set(
          batch[documentIndex],
          document.data() as UsuarioData,
        );
      }
    }

    /*
     * ========================================================
     * Cargar municipalidades
     * ========================================================
     *
     * La ubicación del pedido se obtiene exclusivamente
     * desde la colección municipalidades mediante
     * IdMunicipalidad.
     *
     * productores se mantiene como información administrativa
     * y no interviene en la resolución de la ubicación.
     */

    const municipalidades =
      new Map<
        string,
        MunicipalidadData
      >();

    const allMunicipalidadIds =
      Array.from(
        municipalidadIds,
      );

    for (
      let index = 0;
      index <
      allMunicipalidadIds.length;
      index += 30
    ) {
      const batch =
        allMunicipalidadIds.slice(
          index,
          index + 30,
        );

      if (batch.length === 0) {
        continue;
      }

      const references =
        batch.map((id) =>
          adminDb
            .collection("municipalidades")
            .doc(id),
        );

      const documents =
        await adminDb.getAll(
          ...references,
        );

      for (
        let documentIndex = 0;
        documentIndex <
        documents.length;
        documentIndex += 1
      ) {
        const document =
          documents[documentIndex];

        if (!document.exists) {
          continue;
        }

        municipalidades.set(
          batch[documentIndex],
          document.data() as MunicipalidadData,
        );
      }
    }

    /*
     * ========================================================
     * Construcción de respuesta
     * ========================================================
     */

    const data = pedidos.map(
      ({ id, data: pedido }) => {
        /*
         * ----------------------------------------------------
         * Consumidor
         * ----------------------------------------------------
         */

        const usuarioId =
          stringValue(
            pedido.usuarioId,
          );

        const usuario =
          usuarios.get(
            usuarioId,
          );

        const nombres =
          normalizeText(
            usuario?.Nombres,
          );

        const apellidos =
          normalizeText(
            usuario?.Apellidos,
          );

        const nombreCompleto =
          [
            nombres,
            apellidos,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          "Consumidor";

        const cliente = {
          id: usuarioId,

          nombres,

          apellidos,

          nombreCompleto,

          correo:
            stringValue(
              usuario?.Correo,
            ),

          telefono:
            stringValue(
              usuario?.Telefono,
            ),

          direccion:
            normalizeText(
              usuario?.Direccion,
            ),
        };

        /*
         * ----------------------------------------------------
         * Repartidor
         * ----------------------------------------------------
         */

        const repartidorId =
          stringValue(
            pedido.repartidorId,
          );

        let repartidor:
          | ReturnType<
              typeof emptyCourier
            >
          | null = null;

        if (repartidorId) {
          const repartidorUsuario =
            usuarios.get(
              repartidorId,
            );

          const repartidorNombres =
            normalizeText(
              repartidorUsuario?.Nombres,
            );

          const repartidorApellidos =
            normalizeText(
              repartidorUsuario?.Apellidos,
            );

          const repartidorNombre =
            [
              repartidorNombres,
              repartidorApellidos,
            ]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "Repartidor";

          repartidor = {
            id: repartidorId,

            nombres:
              repartidorNombres,

            apellidos:
              repartidorApellidos,

            nombreCompleto:
              repartidorNombre,

            correo:
              stringValue(
                repartidorUsuario?.Correo,
              ),

            telefono:
              stringValue(
                repartidorUsuario?.Telefono,
              ),
          };
        }

        /*
         * ----------------------------------------------------
         * Municipalidad
         * ----------------------------------------------------
         */

        const municipalidadId =
          stringValue(
            pedido.IdMunicipalidad,
          );

        const municipalidad =
          municipalidades.get(
            municipalidadId,
          );

        const municipalidadNombre =
          normalizeText(
            municipalidad?.Nombre,
          ) ||
          municipalidadId ||
          "Municipalidad";

        /*
         * ----------------------------------------------------
         * Productos
         * ----------------------------------------------------
         *
         * Sistema actual:
         * IdProductor
         *
         * productores continúa existiendo para información
         * administrativa, pero no se consulta desde esta API.
         */

        const productosRaw =
          Array.isArray(
            pedido.productos,
          )
            ? pedido.productos
            : [];

        const productos =
          productosRaw.map(
            (producto) => {
              const value =
                producto &&
                typeof producto ===
                  "object"
                  ? (producto as Record<
                      string,
                      unknown
                    >)
                  : {};

              return {
                productoId:
                  stringValue(
                    value.productoId,
                  ),

                code:
                  stringValue(
                    value.code,
                  ),

                nombre:
                  normalizeText(
                    value.nombre,
                  ),

                cantidad:
                  numberValue(
                    value.cantidad,
                  ),

                precioUnitario:
                  numberValue(
                    value.precioUnitario,
                  ),

                subtotal:
                  numberValue(
                    value.subtotal,
                  ),

                unidad:
                  normalizeText(
                    value.unidad,
                  ),

                IdProductor:
                  stringValue(
                    value.IdProductor,
                  ),

                IdMunicipalidad:
                  stringValue(
                    value.IdMunicipalidad,
                  ),
              } satisfies ProductoPedido;
            },
          );

        /*
         * ----------------------------------------------------
         * Cantidades
         * ----------------------------------------------------
         */

        const cantidadProductos =
          productos.length;

        const cantidadUnidades =
          productos.reduce(
            (total, producto) =>
              total +
              producto.cantidad,
            0,
          );

        /*
         * ----------------------------------------------------
         * Costos
         * ----------------------------------------------------
         */

        const subtotalProductos =
          numberValue(
            pedido.subtotal,
          );

        const total =
          numberValue(
            pedido.total,
          );

        const costos = {
          subtotalProductos,

          entrega: 0,

          logistica: 0,

          almacenamiento: 0,

          total,
        };

        /*
         * ----------------------------------------------------
         * Modalidad
         * ----------------------------------------------------
         *
         * El esquema actual no almacena modalidadEntrega.
         *
         * Como crear/route.ts actualmente exige una dirección,
         * interpretamos estos pedidos como domicilio.
         */

        const modalidadEntrega =
          "domicilio" as const;

        /*
         * ----------------------------------------------------
         * Pedido normalizado
         * ----------------------------------------------------
         */

        const pedidoNormalizado = {
          id,

          usuarioId,

          productos,

          subtotal:
            subtotalProductos,

          total,

          estado:
            normalizeEstado(
              pedido.estado,
            ) as EstadoReparto,

          reservaId:
            stringValue(
              pedido.reservaId,
            ),

          IdMunicipalidad:
            municipalidadId,

          direccionEntrega:
            normalizeText(
              pedido.direccionEntrega,
            ),

          repartidorId:
            repartidorId || null,

          fechaCreacion:
            serializeTimestamp(
              pedido.fechaCreacion,
            ),

          ultimaActualizacion:
            serializeTimestamp(
              pedido.ultimaActualizacion,
            ),

          fechaCancelacion:
            serializeTimestamp(
              pedido.fechaCancelacion,
            ),
        };

        /*
         * ----------------------------------------------------
         * Resultado enriquecido
         * ----------------------------------------------------
         */

        return {
          id,

          pedido:
            pedidoNormalizado,

          cliente,

          repartidor,

          municipalidad: {
            id: municipalidadId,

            nombre:
              municipalidadNombre,
          },

          costos,

          modalidadEntrega,

          firma: null,

          resumen: {
            id,

            estado:
              pedidoNormalizado.estado,

            clienteNombre:
              cliente.nombreCompleto,

            municipioNombre:
              municipalidadNombre,

            repartidorNombre:
              repartidor?.nombreCompleto ??
              null,

            cantidadProductos,

            cantidadUnidades,

            total,

            fechaCreacion:
              pedidoNormalizado.fechaCreacion,
          },
        };
      },
    );

    /*
     * ========================================================
     * Ordenamiento
     * ========================================================
     */

    data.sort(
      (a, b) => {
        const dateA =
          timestampToMillis(
            a.pedido.fechaCreacion,
          );

        const dateB =
          timestampToMillis(
            b.pedido.fechaCreacion,
          );

        return dateB - dateA;
      },
    );

    /*
     * ========================================================
     * Respuesta
     * ========================================================
     */

    return NextResponse.json(
      {
        success: true,

        data,

        meta: {
          total: data.length,

          rol: role,

          estados: ESTADOS_REPARTO,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Error obteniendo repartos:",
      error,
    );

    return errorResponse(
      "No fue posible obtener los repartos.",
      500,
    );
  }
}

/*
 * ============================================================
 * Conversión de fechas
 * ============================================================
 */

function timestampToMillis(
  value: unknown,
): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "string"
  ) {
    const milliseconds =
      Date.parse(value);

    return Number.isNaN(
      milliseconds,
    )
      ? 0
      : milliseconds;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const candidate =
      value as {
        seconds?: number;
        nanoseconds?: number;
      };

    if (
      typeof candidate.seconds ===
      "number"
    ) {
      return (
        candidate.seconds * 1000 +
        Math.floor(
          (candidate.nanoseconds ??
            0) /
            1_000_000,
        )
      );
    }
  }

  return 0;
}