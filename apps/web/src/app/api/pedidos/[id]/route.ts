import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  normalizeEstado,
  puedeTransicionar,
} from "@/lib/pedidos/estados";

export const runtime = "nodejs";

type Rol =
  | "consumidor"
  | "repartidor"
  | "admin";

type TipoEntrega =
  | "domicilio"
  | "recogida";

interface PedidoProducto {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
  IdProductor: string;
  IdMunicipalidad: string;
  presentacionCantidad?: number | null;
  presentacionNombre?: string;
}

interface PickupPointSnapshot {
  nombre: string;
  direccion: string;
  municipio: string;
}

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

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function finiteNumber(
  value: unknown,
): number | null {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  return number;
}

function integerNumber(
  value: unknown,
): number | null {
  const number =
    finiteNumber(value);

  if (
    number === null ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
}

function getUserDisplayName(
  data:
    | Record<string, unknown>
    | undefined,
): string {
  if (!data) {
    return "";
  }

  const nombres =
    cleanString(
      data.Nombres,
    );

  const apellidos =
    cleanString(
      data.Apellidos,
    );

  return [
    nombres,
    apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeExistingProduct(
  value: unknown,
): PedidoProducto | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<
      string,
      unknown
    >;

  const productoId =
    cleanString(
      item.productoId,
    );

  const cantidad =
    integerNumber(
      item.cantidad,
    );

  const precioUnitario =
    finiteNumber(
      item.precioUnitario,
    );

  if (
    !productoId ||
    cantidad === null ||
    cantidad <= 0 ||
    cantidad > 999 ||
    precioUnitario === null ||
    precioUnitario < 0
  ) {
    return null;
  }

  const subtotal =
    precioUnitario *
    cantidad;

  const presentacionCantidad =
    finiteNumber(
      item.presentacionCantidad,
    );

  return {
    productoId,
    code: cleanString(
      item.code,
    ),
    nombre: cleanString(
      item.nombre,
    ),
    cantidad,
    precioUnitario,
    subtotal,
    unidad: cleanString(
      item.unidad,
    ),
    IdProductor: cleanString(
      item.IdProductor,
    ),
    IdMunicipalidad:
      cleanString(
        item.IdMunicipalidad,
      ),
    ...(presentacionCantidad !==
    null
      ? {
          presentacionCantidad,
        }
      : {}),
    ...(typeof item.presentacionNombre ===
      "string"
      ? {
          presentacionNombre:
            cleanString(
              item.presentacionNombre,
            ),
        }
      : {}),
  };
}

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
      typeof body !== "object"
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

          const isFullEdit =
            role === "admin" &&
            (
              "productos" in
                input ||
              "subtotal" in
                input ||
              "total" in
                input ||
              "descuento" in
                input ||
              "tipoEntrega" in
                input ||
              "IdMunicipalidad" in
                input ||
              "direccionEntrega" in
                input ||
              "telefonoEntrega" in
                input ||
              "IdPuntoRecogida" in
                input ||
              "repartidorId" in
                input ||
              "descripcionCambio" in
                input ||
              "confirmarEdicionEntregado" in
                input
            );

          if (isFullEdit) {
            if (
              currentStatus ===
                "entregado" &&
              input.confirmarEdicionEntregado !==
                true
            ) {
              throw new Error(
                "DELIVERED_CONFIRMATION_REQUIRED",
              );
            }

            const descripcionCambio =
              cleanString(
                input.descripcionCambio,
              );

            if (
              descripcionCambio.length >
              1000
            ) {
              throw new Error(
                "DESCRIPTION_TOO_LONG",
              );
            }

            let nuevosProductos:
              PedidoProducto[];

            if (
              "productos" in
              input
            ) {
              if (
                !Array.isArray(
                  input.productos,
                ) ||
                input.productos.length ===
                  0
              ) {
                throw new Error(
                  "INVALID_PRODUCTS",
                );
              }

              const requested =
                input.productos.map(
                  (
                    item,
                  ) =>
                    normalizeExistingProduct(
                      item,
                    ),
                );

              if (
                requested.some(
                  (
                    item,
                  ) =>
                    item ===
                    null,
                )
              ) {
                throw new Error(
                  "INVALID_PRODUCTS",
                );
              }

              const requestedProducts =
                requested as PedidoProducto[];

              const uniqueIds =
                new Set(
                  requestedProducts.map(
                    (
                      item,
                    ) =>
                      item.productoId,
                  ),
                );

              if (
                uniqueIds.size !==
                requestedProducts.length
              ) {
                throw new Error(
                  "DUPLICATE_PRODUCTS",
                );
              }

              const productRefs =
                requestedProducts.map(
                  (
                    item,
                  ) =>
                    adminDb
                      .collection(
                        "productos",
                      )
                      .doc(
                        item.productoId,
                      ),
                );

              const productSnapshots =
                [];

              for (
                const ref of productRefs
              ) {
                productSnapshots.push(
                  await transaction.get(
                    ref,
                  ),
                );
              }

              const currentProducts =
                Array.isArray(
                  current.productos,
                )
                  ? current.productos
                  : [];

              const oldQuantity =
                new Map<
                  string,
                  number
                >();

              for (
                const item of currentProducts
              ) {
                if (
                  !item ||
                  typeof item !==
                    "object"
                ) {
                  continue;
                }

                const old =
                  item as Record<
                    string,
                    unknown
                  >;

                const productId =
                  cleanString(
                    old.productoId,
                  );

                const quantity =
                  integerNumber(
                    old.cantidad,
                  );

                if (
                  productId &&
                  quantity !==
                    null &&
                  quantity > 0
                ) {
                  oldQuantity.set(
                    productId,
                    quantity,
                  );
                }
              }

              nuevosProductos =
                [];

              for (
                let index = 0;
                index <
                requestedProducts.length;
                index += 1
              ) {
                const requestedProduct =
                  requestedProducts[
                    index
                  ];

                const snapshot =
                  productSnapshots[
                    index
                  ];

                if (
                  !snapshot.exists
                ) {
                  throw new Error(
                    "PRODUCT_NOT_FOUND",
                  );
                }

                const product =
                  snapshot.data();

                if (!product) {
                  throw new Error(
                    "PRODUCT_INVALID",
                  );
                }

                const stock =
                  integerNumber(
                    product.stock ??
                      0,
                  );

                if (
                  stock === null ||
                  stock < 0
                ) {
                  throw new Error(
                    "INVALID_STOCK",
                  );
                }

                const oldQty =
                  oldQuantity.get(
                    requestedProduct.productoId,
                  ) ?? 0;

                const delta =
                  requestedProduct.cantidad -
                  oldQty;

                if (
                  delta > 0 &&
                  stock < delta
                ) {
                  throw new Error(
                    `No hay stock suficiente para ${String(
                      product.nombre ??
                        requestedProduct.productoId,
                    )}.`,
                  );
                }

                if (
                  product.activo !==
                    true &&
                  oldQty === 0
                ) {
                  throw new Error(
                    `El producto "${String(
                      product.nombre ??
                        requestedProduct.productoId,
                    )}" no está disponible.`,
                  );
                }

                const precio =
                  finiteNumber(
                    requestedProduct.precioUnitario,
                  );

                if (
                  precio === null ||
                  precio < 0
                ) {
                  throw new Error(
                    "INVALID_PRICE",
                  );
                }

                if (
                  delta !== 0
                ) {
                  transaction.update(
                    productRefs[
                      index
                    ],
                    {
                      stock:
                        stock -
                        delta,
                      ultimaActualizacion:
                        FieldValue.serverTimestamp(),
                    },
                  );
                }

                const presentacionCantidad =
                  finiteNumber(
                    product.presentacionCantidad,
                  );

                const presentacionNombre =
                  cleanString(
                    product.presentacionNombre,
                  );

                nuevosProductos.push({
                  productoId:
                    requestedProduct.productoId,
                  code: String(
                    product.code ??
                      "",
                  ),
                  nombre: String(
                    product.nombre ??
                      "",
                  ),
                  cantidad:
                    requestedProduct.cantidad,
                  precioUnitario:
                    precio,
                  subtotal:
                    precio *
                    requestedProduct.cantidad,
                  unidad: String(
                    product.unidad ??
                      requestedProduct.unidad ??
                      "",
                  ),
                  IdProductor:
                    String(
                      product.IdProductor ??
                        requestedProduct.IdProductor ??
                        "",
                    ),
                  IdMunicipalidad:
                    String(
                      product.IdMunicipalidad ??
                        requestedProduct.IdMunicipalidad ??
                        "",
                    ),
                  ...(presentacionCantidad !==
                  null
                    ? {
                        presentacionCantidad,
                      }
                    : {}),
                  ...(presentacionNombre
                    ? {
                        presentacionNombre,
                      }
                    : {}),
                });
              }

              const newIds =
                new Set(
                  nuevosProductos.map(
                    (
                      item,
                    ) =>
                      item.productoId,
                  ),
                );

              for (
                const oldItem of currentProducts
              ) {
                if (
                  !oldItem ||
                  typeof oldItem !==
                    "object"
                ) {
                  continue;
                }

                const old =
                  oldItem as Record<
                    string,
                    unknown
                  >;

                const productId =
                  cleanString(
                    old.productoId,
                  );

                const quantity =
                  integerNumber(
                    old.cantidad,
                  );

                if (
                  !productId ||
                  quantity ===
                    null ||
                  quantity <= 0 ||
                  newIds.has(
                    productId,
                  )
                ) {
                  continue;
                }

                const ref =
                  adminDb
                    .collection(
                      "productos",
                    )
                    .doc(
                      productId,
                    );

                const snapshot =
                  await transaction.get(
                    ref,
                  );

                if (
                  snapshot.exists
                ) {
                  const data =
                    snapshot.data();

                  const stock =
                    integerNumber(
                      data?.stock ??
                        0,
                    );

                  if (
                    stock !==
                      null
                  ) {
                    transaction.update(
                      ref,
                      {
                        stock:
                          stock +
                          quantity,
                        ultimaActualizacion:
                          FieldValue.serverTimestamp(),
                      },
                    );
                  }
                }
              }
            } else {
              nuevosProductos =
                Array.isArray(
                  current.productos,
                )
                  ? current.productos
                      .map(
                        (
                          item,
                        ) =>
                          normalizeExistingProduct(
                            item,
                          ),
                      )
                      .filter(
                        (
                          item,
                        ): item is PedidoProducto =>
                          item !==
                          null,
                      )
                  : [];
            }

            if (
              nuevosProductos.length ===
              0
            ) {
              throw new Error(
                "INVALID_PRODUCTS",
              );
            }

            const tipoEntrega =
              cleanString(
                input.tipoEntrega ??
                  current.tipoEntrega ??
                  "domicilio",
              ) as TipoEntrega;

            if (
              tipoEntrega !==
                "domicilio" &&
              tipoEntrega !==
                "recogida"
            ) {
              throw new Error(
                "INVALID_DELIVERY_TYPE",
              );
            }

            const municipality =
              cleanString(
                input.IdMunicipalidad ??
                  current.IdMunicipalidad,
              );

            if (
              !municipality
            ) {
              throw new Error(
                "INVALID_MUNICIPALITY",
              );
            }

            const municipalityRef =
              adminDb
                .collection(
                  "municipalidades",
                )
                .doc(
                  municipality,
                );

            const municipalitySnapshot =
              await transaction.get(
                municipalityRef,
              );

            if (
              !municipalitySnapshot.exists
            ) {
              throw new Error(
                "MUNICIPALITY_NOT_FOUND",
              );
            }

            const municipalityData =
              municipalitySnapshot.data() ??
              {};

            if (
              municipalityData.Activo ===
              false
            ) {
              throw new Error(
                "MUNICIPALITY_INACTIVE",
              );
            }

            const municipalityName =
              cleanString(
                municipalityData.Nombre,
              );

            if (
              !municipalityName
            ) {
              throw new Error(
                "MUNICIPALITY_INVALID",
              );
            }

            let direccionEntrega:
              string | null =
              null;

            let telefonoEntrega:
              string | null =
              null;

            let idPuntoRecogida:
              string | null =
              null;

            let puntoRecogida:
              PickupPointSnapshot | null =
              null;

            if (
              tipoEntrega ===
              "domicilio"
            ) {
              const address =
                cleanString(
                  input.direccionEntrega ??
                    current.direccionEntrega,
                );

              if (
                address.length <
                  5 ||
                address.length >
                  300
              ) {
                throw new Error(
                  "INVALID_ADDRESS",
                );
              }

              const telefono =
                cleanString(
                  input.telefonoEntrega ??
                    current.telefonoEntrega,
                );

              if (
                telefono &&
                !/^\+57\d{10}$/.test(
                  telefono,
                )
              ) {
                throw new Error(
                  "INVALID_PHONE",
                );
              }

              direccionEntrega =
                address;

              telefonoEntrega =
                telefono ||
                null;
            } else {
              const pickupId =
                cleanString(
                  input.IdPuntoRecogida ??
                    current.IdPuntoRecogida,
                );

              if (
                !pickupId
              ) {
                throw new Error(
                  "PICKUP_POINT_REQUIRED",
                );
              }

              const pickupRef =
                adminDb
                  .collection(
                    "puntosRecogida",
                  )
                  .doc(
                    pickupId,
                  );

              const pickupSnapshot =
                await transaction.get(
                  pickupRef,
                );

              if (
                !pickupSnapshot.exists
              ) {
                throw new Error(
                  "PICKUP_POINT_NOT_FOUND",
                );
              }

              const pickupData =
                pickupSnapshot.data() ??
                {};

              if (
                pickupData.activo ===
                false
              ) {
                throw new Error(
                  "PICKUP_POINT_INACTIVE",
                );
              }

              const pickupMunicipality =
                cleanString(
                  pickupData.IdMunicipalidad,
                );

              if (
                pickupMunicipality !==
                municipality
              ) {
                throw new Error(
                  "PICKUP_POINT_MUNICIPALITY_MISMATCH",
                );
              }

              const pickupName =
                cleanString(
                  pickupData.nombre,
                );

              const pickupAddress =
                cleanString(
                  pickupData.direccion,
                );

              if (
                !pickupName ||
                !pickupAddress
              ) {
                throw new Error(
                  "PICKUP_POINT_INVALID",
                );
              }

              idPuntoRecogida =
                pickupId;

              puntoRecogida = {
                nombre:
                  pickupName,
                direccion:
                  pickupAddress,
                municipio:
                  municipalityName,
              };
            }

            const subtotal =
              nuevosProductos.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  item.subtotal,
                0,
              );

            const descuento =
              finiteNumber(
                input.descuento ??
                  current.descuento ??
                  0,
              );

            if (
              descuento ===
                null ||
              descuento < 0 ||
              descuento > subtotal
            ) {
              throw new Error(
                "INVALID_DISCOUNT",
              );
            }

            const total =
              subtotal -
              descuento;

            let repartidorId =
              current.repartidorId ??
              null;

            if (
              "repartidorId" in
              input
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

                let delivererRole =
                  roleFromClaims(
                    deliverer.customClaims ??
                      {},
                  );

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

                repartidorId =
                  deliverer.uid;
              } else {
                repartidorId =
                  null;
              }
            }

            const updates: Record<
              string,
              unknown
            > = {
              productos:
                nuevosProductos,
              subtotal,
              descuento,
              total,
              tipoEntrega,
              IdMunicipalidad:
                municipality,
              direccionEntrega,
              telefonoEntrega,
              IdPuntoRecogida:
                idPuntoRecogida,
              puntoRecogida,
              repartidorId,
              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            };

            if (
              "estado" in
              input
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

              updates.estado =
                estado;

              if (
                estado ===
                "cancelado"
              ) {
                if (
                  currentStatus !==
                  "cancelado"
                ) {
                  updates.fechaCancelacion =
                    FieldValue.serverTimestamp();
                }
              } else {
                updates.fechaCancelacion =
                  null;
              }
            }

            const usuarioSnap =
              await transaction.get(
                adminDb
                  .collection(
                    "usuarios",
                  )
                  .doc(
                    user.uid,
                  ),
              );

            const usuarioData =
              usuarioSnap.exists
                ? (usuarioSnap.data() as Record<
                    string,
                    unknown
                  >)
                : undefined;

            const usuarioNombre =
              getUserDisplayName(
                usuarioData,
              ) ||
              cleanString(
                user.displayName,
              ) ||
              cleanString(
                user.email,
              ) ||
              user.uid;

            const historialAnterior =
              Array.isArray(
                current.historialModificaciones,
              )
                ? current.historialModificaciones
                : [];

            const cambios = {
              productosAnterior:
                current.productos ??
                [],
              productosNuevo:
                nuevosProductos,
              subtotalAnterior:
                Number(
                  current.subtotal ??
                    0,
                ),
              subtotalNuevo:
                subtotal,
              descuentoAnterior:
                Number(
                  current.descuento ??
                    0,
                ),
              descuentoNuevo:
                descuento,
              totalAnterior:
                Number(
                  current.total ??
                    0,
                ),
              totalNuevo:
                total,
              tipoEntregaAnterior:
                current.tipoEntrega ??
                null,
              tipoEntregaNuevo:
                tipoEntrega,
              IdMunicipalidadAnterior:
                current.IdMunicipalidad ??
                null,
              IdMunicipalidadNuevo:
                municipality,
              direccionEntregaAnterior:
                current.direccionEntrega ??
                null,
              direccionEntregaNueva:
                direccionEntrega,
              IdPuntoRecogidaAnterior:
                current.IdPuntoRecogida ??
                null,
              IdPuntoRecogidaNuevo:
                idPuntoRecogida,
              repartidorAnterior:
                current.repartidorId ??
                null,
              repartidorNuevo:
                repartidorId,
              estadoAnterior:
                current.estado ??
                null,
              estadoNuevo:
                updates.estado ??
                current.estado,
            };

            const historialItem = {
              usuarioId:
                user.uid,
              usuarioNombre,
              fecha:
                new Date(),
              descripcionCambio:
                descripcionCambio ||
                null,
              pedidoEntregado:
                currentStatus ===
                "entregado",
              cambios,
            };

            updates.historialModificaciones =
              [
                ...historialAnterior,
                historialItem,
              ];

            updates.ultimaModificacion =
              {
                usuarioId:
                  user.uid,
                usuarioNombre,
                fecha:
                  FieldValue.serverTimestamp(),
                descripcionCambio:
                  descripcionCambio ||
                  null,
              };

            transaction.update(
              pedidoRef,
              updates,
            );

            return {
              id: pedidoId,
              ...updates,
            };
          }

          const updates: Record<
            string,
            unknown
          > = {
            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          };

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

            if (
              !puedeTransicionar(
                currentStatus,
                estado,
              )
            ) {
              throw new Error(
                "INVALID_TRANSITION",
              );
            }

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

              let delivererRole =
                roleFromClaims(
                  deliverer.customClaims ??
                    {},
                );

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

        case "DELIVERED_CONFIRMATION_REQUIRED":
          return errorResponse(
            "Debes confirmar explícitamente la modificación de un pedido entregado.",
            409,
          );

        case "DESCRIPTION_TOO_LONG":
          return errorResponse(
            "La descripción del cambio no puede superar 1000 caracteres.",
            400,
          );

        case "INVALID_PRODUCTS":
          return errorResponse(
            "La lista de productos no es válida.",
            400,
          );

        case "DUPLICATE_PRODUCTS":
          return errorResponse(
            "No puede haber productos repetidos en el pedido.",
            400,
          );

        case "PRODUCT_NOT_FOUND":
          return errorResponse(
            "Uno de los productos ya no existe.",
            409,
          );

        case "PRODUCT_INVALID":
          return errorResponse(
            "No fue posible validar uno de los productos.",
            409,
          );

        case "INVALID_STOCK":
          return errorResponse(
            "El stock de uno de los productos no es válido.",
            409,
          );

        case "INVALID_PRICE":
          return errorResponse(
            "Uno de los precios indicados no es válido.",
            400,
          );

        case "INVALID_DISCOUNT":
          return errorResponse(
            "El descuento no es válido.",
            400,
          );

        case "INVALID_DELIVERY_TYPE":
          return errorResponse(
            "El tipo de entrega no es válido.",
            400,
          );

        case "INVALID_MUNICIPALITY":
          return errorResponse(
            "La municipalidad no es válida.",
            400,
          );

        case "MUNICIPALITY_NOT_FOUND":
          return errorResponse(
            "La municipalidad seleccionada no existe.",
            409,
          );

        case "MUNICIPALITY_INACTIVE":
          return errorResponse(
            "La municipalidad seleccionada está inactiva.",
            409,
          );

        case "MUNICIPALITY_INVALID":
          return errorResponse(
            "La municipalidad seleccionada no es válida.",
            409,
          );

        case "INVALID_ADDRESS":
          return errorResponse(
            "La dirección de entrega no es válida.",
            400,
          );

        case "INVALID_PHONE":
          return errorResponse(
            "El número de teléfono no es válido.",
            400,
          );

        case "PICKUP_POINT_REQUIRED":
          return errorResponse(
            "Debes seleccionar un punto de recogida.",
            400,
          );

        case "PICKUP_POINT_NOT_FOUND":
          return errorResponse(
            "El punto de recogida seleccionado no existe.",
            409,
          );

        case "PICKUP_POINT_INACTIVE":
          return errorResponse(
            "El punto de recogida seleccionado no está disponible.",
            409,
          );

        case "PICKUP_POINT_MUNICIPALITY_MISMATCH":
          return errorResponse(
            "El punto de recogida no pertenece a la municipalidad seleccionada.",
            409,
          );

        case "PICKUP_POINT_INVALID":
          return errorResponse(
            "El punto de recogida seleccionado no tiene información válida.",
            409,
          );
      }

      if (
        error.message.startsWith(
          "No hay stock suficiente",
        ) ||
        error.message.startsWith(
          "El producto",
        )
      ) {
        return errorResponse(
          error.message,
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