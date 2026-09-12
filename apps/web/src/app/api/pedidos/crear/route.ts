import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

function parseItems(value: unknown): CheckoutItem[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const quantities = new Map<string, number>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const candidate = item as Partial<CheckoutItem>;

    const productId =
      typeof candidate.productId === "string"
        ? candidate.productId.trim()
        : "";

    const quantity = candidate.quantity;

    if (
      !productId ||
      productId.length > 150 ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 999
    ) {
      return null;
    }

    const current = quantities.get(productId) ?? 0;
    const next = current + quantity;

    if (next > 999) {
      return null;
    }

    quantities.set(productId, next);
  }

  return [...quantities.entries()].map(
    ([productId, quantity]) => ({
      productId,
      quantity,
    }),
  );
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

export async function POST(request: Request) {
  try {
    /*
     * ================================================
     * Autenticación
     * ================================================
     */

    const token = tokenFrom(request);

    if (!token) {
      return errorResponse(
        "Debes iniciar sesión para confirmar el pedido.",
        401,
      );
    }

    const user = await adminAuth.verifyIdToken(token);

    /*
     * ================================================
     * Validación de solicitud
     * ================================================
     */

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return errorResponse(
        "Solicitud inválida.",
        400,
      );
    }

    const input = body as {
      items?: unknown;
      IdMunicipalidad?: unknown;
      direccionEntrega?: unknown;
    };

    const items = parseItems(input.items);

    const municipality =
      typeof input.IdMunicipalidad === "string"
        ? input.IdMunicipalidad.trim()
        : "";

    const address =
      typeof input.direccionEntrega === "string"
        ? input.direccionEntrega.trim()
        : "";

    if (
      !items ||
      !municipality ||
      municipality.length > 150 ||
      address.length < 5 ||
      address.length > 300
    ) {
      return errorResponse(
        "Revisa los productos y los datos de entrega.",
        400,
      );
    }

    /*
     * ================================================
     * Referencias
     * ================================================
     */

    const pedidoRef = adminDb
      .collection("pedidos")
      .doc();

    const reservationRef = adminDb
      .collection("reservas")
      .doc();

    /*
     * ================================================
     * Transacción
     * ================================================
     */

    const result = await adminDb.runTransaction(
      async (transaction) => {
        const productRefs = items.map(
          (item) =>
            adminDb
              .collection("productos")
              .doc(item.productId),
        );

        /*
         * Leer primero todos los productos.
         */

        const productSnapshots = [];

        for (const ref of productRefs) {
          productSnapshots.push(
            await transaction.get(ref),
          );
        }

        const productos: Array<
          Record<string, unknown>
        > = [];

        let subtotal = 0;

        /*
         * ==========================================
         * Validar productos y stock
         * ==========================================
         */

        for (
          let index = 0;
          index < items.length;
          index += 1
        ) {
          const snapshot =
            productSnapshots[index];

          const item = items[index];

          if (!snapshot.exists) {
            throw new Error(
              "PRODUCT_NOT_FOUND",
            );
          }

          const product = snapshot.data();

          if (!product) {
            throw new Error(
              "PRODUCT_INVALID",
            );
          }

          const stock = Number(
            product.stock ?? 0,
          );

          const precio = Number(
            product.precio ?? 0,
          );

          if (
            !Number.isInteger(stock) ||
            stock < 0
          ) {
            throw new Error(
              "INVALID_STOCK",
            );
          }

          if (product.activo !== true) {
            throw new Error(
              `El producto "${String(
                product.nombre ??
                  item.productId,
              )}" no está disponible.`,
            );
          }

          if (stock < item.quantity) {
            throw new Error(
              `No hay stock suficiente para ${String(
                product.nombre ??
                  item.productId,
              )}.`,
            );
          }

          if (
            !Number.isFinite(precio) ||
            precio < 0
          ) {
            throw new Error(
              "INVALID_PRICE",
            );
          }

          const lineSubtotal =
            precio * item.quantity;

          subtotal += lineSubtotal;

          productos.push({
            productoId:
              item.productId,

            code: String(
              product.code ?? "",
            ),

            nombre: String(
              product.nombre ?? "",
            ),

            cantidad:
              item.quantity,

            precioUnitario:
              precio,

            subtotal:
              lineSubtotal,

            unidad: String(
              product.unidad ?? "",
            ),

            IdProductor: String(
              product.IdProductor ?? "",
            ),

            IdMunicipalidad:
              String(
                product.IdMunicipalidad ??
                  "",
              ),
          });
        }

        /*
         * ==========================================
         * Actualizar stock
         * ==========================================
         */

        for (
          let index = 0;
          index < items.length;
          index += 1
        ) {
          const snapshot =
            productSnapshots[index];

          const item = items[index];

          const product =
            snapshot.data();

          const stock = Number(
            product?.stock ?? 0,
          );

          transaction.update(
            productRefs[index],
            {
              stock:
                stock - item.quantity,

              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            },
          );
        }

        /*
         * ==========================================
         * Crear reserva
         * ==========================================
         */

        transaction.set(
          reservationRef,
          {
            userId: user.uid,

            items,

            status: "confirmed",

            pedidoId:
              pedidoRef.id,

            createdAt:
              FieldValue.serverTimestamp(),

            confirmedAt:
              FieldValue.serverTimestamp(),
          },
        );

        /*
         * ==========================================
         * Crear pedido
         * ==========================================
         */

        transaction.set(
          pedidoRef,
          {
            usuarioId:
              user.uid,

            productos,

            subtotal,

            total: subtotal,

            estado:
              "pendiente",

            reservaId:
              reservationRef.id,

            IdMunicipalidad:
              municipality,

            direccionEntrega:
              address,

            repartidorId:
              null,

            fechaCreacion:
              FieldValue.serverTimestamp(),

            ultimaActualizacion:
              FieldValue.serverTimestamp(),

            fechaCancelacion:
              null,
          },
        );

        return {
          pedidoId:
            pedidoRef.id,

          total:
            subtotal,
        };
      },
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Error creando pedido:",
      error,
    );

    if (error instanceof Error) {
      switch (error.message) {
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
            "Uno de los productos tiene un precio inválido.",
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
      "No fue posible confirmar el pedido.",
      500,
    );
  }
}