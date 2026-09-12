import { NextResponse } from "next/server";
import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

type Rol =
  | "consumidor"
  | "repartidor"
  | "admin";

type RecibidoBody = {
  metodo: "manuscrita" | "texto";
  valor: string;
  recibidoPor?: string;
};

type ProductoDocumento = {
  code?: unknown;
  nombre?: unknown;
  categoria?: unknown;
  unidad?: unknown;
  precio?: unknown;
  precioVenta?: unknown;
  costoPcc?: unknown;
  porcentajeLogistica?: unknown;
  porcentajeTransporte?: unknown;
  IdProductor?: unknown;
  IdMunicipalidad?: unknown;
};

type PedidoProducto = {
  productoId?: unknown;
  code?: unknown;
  nombre?: unknown;
  cantidad?: unknown;
  precioUnitario?: unknown;
  subtotal?: unknown;
  unidad?: unknown;
  IdProductor?: unknown;
  IdMunicipalidad?: unknown;
};

type PedidoDocumento = {
  estado?: unknown;
  repartidorId?: unknown;
  productos?: unknown;
};

type CatalogoDocumento = {
  nombre?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberValue(value: unknown): number {
  const valueNumber = Number(value ?? 0);

  return Number.isFinite(valueNumber)
    ? valueNumber
    : 0;
}

function porcentaje(value: unknown): number {
  const number = numberValue(value);

  if (number <= 0) {
    return 0;
  }

  return number > 1
    ? number / 100
    : number;
}

function normalizeRole(
  value: unknown,
): Rol | null {
  const role =
    stringValue(value).toLowerCase();

  if (
    role === "admin" ||
    role === "repartidor" ||
    role === "consumidor"
  ) {
    return role;
  }

  return null;
}

function tokenFrom(
  request: Request,
): string | null {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const token =
    authorization.slice(7).trim();

  return token || null;
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

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    /*
     * ============================================
     * Autenticación
     * ============================================
     */

    const token = tokenFrom(request);

    if (!token) {
      return errorResponse(
        "No autorizado.",
        401,
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(
        token,
      );

    const userSnapshot =
      await adminDb
        .collection("usuarios")
        .doc(decoded.uid)
        .get();

    const userData =
      userSnapshot.exists
        ? userSnapshot.data()
        : null;

    const role =
      normalizeRole(
        decoded.role ??
          decoded.rol ??
          userData?.Rol,
      );

    if (
      role !== "admin" &&
      role !== "repartidor"
    ) {
      return errorResponse(
        "No tienes permisos para registrar la entrega.",
        403,
      );
    }

    /*
     * ============================================
     * Pedido
     * ============================================
     */

    const { id } =
      await context.params;

    if (!id) {
      return errorResponse(
        "El ID del pedido es obligatorio.",
        400,
      );
    }

    const body =
      (await request.json()) as RecibidoBody;

    const metodo = body.metodo;
    const valor =
      stringValue(body.valor);

    if (
      metodo !== "manuscrita" &&
      metodo !== "texto"
    ) {
      return errorResponse(
        "El método de recibido no es válido.",
        400,
      );
    }

    if (!valor) {
      return errorResponse(
        "El recibido es obligatorio.",
        400,
      );
    }

    if (
      metodo === "texto" &&
      valor.length < 2
    ) {
      return errorResponse(
        "El nombre de quien recibe no es válido.",
        400,
      );
    }

    if (
      metodo === "manuscrita" &&
      !/^data:image\/(png|jpeg|jpg);base64,/i.test(
        valor,
      )
    ) {
      return errorResponse(
        "La firma manuscrita no es válida.",
        400,
      );
    }

    const pedidoRef =
      adminDb
        .collection("pedidos")
        .doc(id);

    /*
     * ============================================
     * Transacción
     * ============================================
     */

    const resultado =
      await adminDb.runTransaction(
        async (transaction) => {
          const pedidoSnapshot =
            await transaction.get(
              pedidoRef,
            );

          if (!pedidoSnapshot.exists) {
            throw new Error(
              "PEDIDO_NO_EXISTE",
            );
          }

          const pedido =
            pedidoSnapshot.data() as PedidoDocumento;

          if (
            stringValue(
              pedido.estado,
            ) !== "en_camino"
          ) {
            throw new Error(
              "PEDIDO_NO_EN_CAMINO",
            );
          }

          if (
            role === "repartidor" &&
            stringValue(
              pedido.repartidorId,
            ) !== decoded.uid
          ) {
            throw new Error(
              "REPARTIDOR_NO_ASIGNADO",
            );
          }

          const items =
            Array.isArray(
              pedido.productos,
            )
              ? (pedido.productos as PedidoProducto[])
              : [];

          if (items.length === 0) {
            throw new Error(
              "PEDIDO_SIN_PRODUCTOS",
            );
          }

          /*
           * ========================================
           * Leer productos y catálogos actuales.
           *
           * Estos datos solamente sirven para crear
           * la fotografía histórica.
           * ========================================
           */

          const productoSnapshots =
            await Promise.all(
              items.map((item) =>
                transaction.get(
                  adminDb
                    .collection(
                      "productos",
                    )
                    .doc(
                      stringValue(
                        item.productoId,
                      ),
                    ),
                ),
              ),
            );

          const productorIds =
            new Set<string>();

          const municipalidadIds =
            new Set<string>();

          const categoriaIds =
            new Set<string>();

          for (const item of items) {
            const productoId =
              stringValue(
                item.productoId,
              );

            const index =
              items.indexOf(item);

            const producto =
              productoSnapshots[index]
                .data() as
                | ProductoDocumento
                | undefined;

            const productorId =
              stringValue(
                item.IdProductor,
              ) ||
              stringValue(
                producto?.IdProductor,
              );

            const municipalidadId =
              stringValue(
                item.IdMunicipalidad,
              ) ||
              stringValue(
                producto?.IdMunicipalidad,
              );

            const categoriaId =
              stringValue(
                producto?.categoria,
              );

            if (productorId) {
              productorIds.add(
                productorId,
              );
            }

            if (municipalidadId) {
              municipalidadIds.add(
                municipalidadId,
              );
            }

            if (categoriaId) {
              categoriaIds.add(
                categoriaId,
              );
            }

            void productoId;
          }

          const productoresMap =
            new Map<
              string,
              string
            >();

          const municipalidadesMap =
            new Map<
              string,
              string
            >();

          const categoriasMap =
            new Map<
              string,
              string
            >();

          for (const productorId of productorIds) {
            const snapshot =
              await transaction.get(
                adminDb
                  .collection(
                    "productores",
                  )
                  .doc(productorId),
              );

            if (snapshot.exists) {
              const data =
                snapshot.data() as CatalogoDocumento;

              productoresMap.set(
                productorId,
                stringValue(
                  data.nombre,
                ) || productorId,
              );
            }
          }

          for (const municipalidadId of municipalidadIds) {
            const snapshot =
              await transaction.get(
                adminDb
                  .collection(
                    "municipalidades",
                  )
                  .doc(
                    municipalidadId,
                  ),
              );

            if (snapshot.exists) {
              const data =
                snapshot.data() as CatalogoDocumento;

              municipalidadesMap.set(
                municipalidadId,
                stringValue(
                  data.nombre,
                ) || municipalidadId,
              );
            }
          }

          for (const categoriaId of categoriaIds) {
            const snapshot =
              await transaction.get(
                adminDb
                  .collection(
                    "categorias",
                  )
                  .doc(categoriaId),
              );

            if (snapshot.exists) {
              const data =
                snapshot.data() as CatalogoDocumento;

              categoriasMap.set(
                categoriaId,
                stringValue(
                  data.nombre,
                ) || categoriaId,
              );
            }
          }

          /*
           * ========================================
           * Crear snapshot financiero e histórico
           * ========================================
           */

          const productosActualizados =
            items.map(
              (item, index) => {
                const producto =
                  productoSnapshots[index]
                    .data() as
                    | ProductoDocumento
                    | undefined;

                const productoId =
                  stringValue(
                    item.productoId,
                  );

                const cantidad =
                  Math.max(
                    0,
                    numberValue(
                      item.cantidad,
                    ),
                  );

                const code =
                  stringValue(
                    item.code,
                  ) ||
                  stringValue(
                    producto?.code,
                  );

                const nombre =
                  stringValue(
                    item.nombre,
                  ) ||
                  stringValue(
                    producto?.nombre,
                  ) ||
                  productoId;

                const unidad =
                  stringValue(
                    item.unidad,
                  ) ||
                  stringValue(
                    producto?.unidad,
                  );

                const categoriaId =
                  stringValue(
                    producto?.categoria,
                  );

                const categoria =
                  categoriasMap.get(
                    categoriaId,
                  ) ||
                  categoriaId;

                const productorId =
                  stringValue(
                    item.IdProductor,
                  ) ||
                  stringValue(
                    producto?.IdProductor,
                  );

                const productor =
                  productoresMap.get(
                    productorId,
                  ) ||
                  productorId;

                const municipalidadId =
                  stringValue(
                    item.IdMunicipalidad,
                  ) ||
                  stringValue(
                    producto?.IdMunicipalidad,
                  );

                const municipalidad =
                  municipalidadesMap.get(
                    municipalidadId,
                  ) ||
                  municipalidadId;

                const precioVenta =
                  numberValue(
                    producto?.precioVenta,
                  ) ||
                  numberValue(
                    producto?.precio,
                  );

                const precioFinal =
                  precioVenta *
                  cantidad;

                const costoPccUnitario =
                  Math.max(
                    0,
                    numberValue(
                      producto?.costoPcc,
                    ),
                  );

                const costoPcc =
                  costoPccUnitario *
                  cantidad;

                const porcentajeLogistica =
                  porcentaje(
                    producto
                      ?.porcentajeLogistica,
                  );

                const porcentajeTransporte =
                  porcentaje(
                    producto
                      ?.porcentajeTransporte,
                  );

                const costoLogistica =
                  costoPcc *
                  porcentajeLogistica;

                const costoTransporte =
                  costoPcc *
                  porcentajeTransporte;

                const otrosCostos = 0;

                const costoTotal =
                  costoPcc +
                  costoLogistica +
                  costoTransporte +
                  otrosCostos;

                const utilidad =
                  precioFinal -
                  costoTotal;

                const margen =
                  precioFinal > 0
                    ? (utilidad /
                        precioFinal) *
                      100
                    : 0;

                return {
                  productoId,
                  code,
                  nombre,
                  categoriaId,
                  categoria,
                  cantidad,
                  unidad,

                  IdProductor:
                    productorId,
                  productor,

                  IdMunicipalidad:
                    municipalidadId,
                  municipalidad,

                  precioUnitario:
                    precioVenta,

                  precioFinal,
                  subtotal:
                    precioFinal,

                  costoPccUnitario,
                  costoPcc,

                  porcentajeLogistica,
                  porcentajeTransporte,

                  costoLogistica,
                  costoTransporte,
                  otrosCostos,
                  costoTotal,

                  utilidad,
                  margen,
                };
              },
            );

          /*
           * ========================================
           * Totales congelados
           * ========================================
           */

          const precioFinalTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.precioFinal,
              0,
            );

          const costoPccTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.costoPcc,
              0,
            );

          const costoLogisticaTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.costoLogistica,
              0,
            );

          const costoTransporteTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.costoTransporte,
              0,
            );

          const otrosCostosTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.otrosCostos,
              0,
            );

          const costoTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.costoTotal,
              0,
            );

          const utilidadTotal =
            productosActualizados.reduce(
              (total, item) =>
                total +
                item.utilidad,
              0,
            );

          const margen =
            precioFinalTotal > 0
              ? (utilidadTotal /
                  precioFinalTotal) *
                100
              : 0;

          /*
           * ========================================
           * Actualizar pedido
           * ========================================
           */

          transaction.update(
            pedidoRef,
            {
              estado: "entregado",

              productos:
                productosActualizados,

              subtotal:
                precioFinalTotal,

              total:
                precioFinalTotal,

              precioFinal:
                precioFinalTotal,

              costoProductos:
                costoPccTotal,

              costoPcc:
                costoPccTotal,

              costoLogistica:
                costoLogisticaTotal,

              costoTransporte:
                costoTransporteTotal,

              otrosCostos:
                otrosCostosTotal,

              costoTotal,

              utilidad:
                utilidadTotal,

              margen,

              firma: {
                metodo,
                valor,
                recibidoPor:
                  stringValue(
                    body.recibidoPor,
                  ),
                fechaRecibido:
                  FieldValue.serverTimestamp(),
              },

              fechaRecibido:
                FieldValue.serverTimestamp(),

              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            },
          );

          return {
            precioFinal:
              precioFinalTotal,
            costoPcc:
              costoPccTotal,
            costoLogistica:
              costoLogisticaTotal,
            costoTransporte:
              costoTransporteTotal,
            otrosCostos:
              otrosCostosTotal,
            costoTotal,
            utilidad:
              utilidadTotal,
            margen,
          };
        },
      );

    return NextResponse.json({
      success: true,
      message:
        "Pedido marcado como entregado y datos históricos congelados correctamente.",
      ...resultado,
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "";

    if (code === "PEDIDO_NO_EXISTE") {
      return errorResponse(
        "El pedido no existe.",
        404,
      );
    }

    if (
      code ===
      "PEDIDO_NO_EN_CAMINO"
    ) {
      return errorResponse(
        "El pedido no está en estado en camino.",
        409,
      );
    }

    if (
      code ===
      "REPARTIDOR_NO_ASIGNADO"
    ) {
      return errorResponse(
        "El pedido no está asignado a este repartidor.",
        403,
      );
    }

    if (
      code ===
      "PEDIDO_SIN_PRODUCTOS"
    ) {
      return errorResponse(
        "El pedido no contiene productos.",
        400,
      );
    }

    console.error(
      "Error registrando entrega:",
      error,
    );

    return errorResponse(
      "No fue posible registrar la entrega.",
      500,
    );
  }
}