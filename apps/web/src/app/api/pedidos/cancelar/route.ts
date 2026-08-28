import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

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
        "Debes iniciar sesión para cancelar el pedido.",
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

    if (
      !body ||
      typeof body !== "object" ||
      !("pedidoId" in body) ||
      typeof body.pedidoId !== "string"
    ) {
      return errorResponse(
        "El identificador del pedido es obligatorio.",
        400,
      );
    }

    const pedidoId = body.pedidoId.trim();

    if (!pedidoId || pedidoId.length > 150) {
      return errorResponse(
        "El identificador del pedido no es válido.",
        400,
      );
    }

    /*
     * ================================================
     * Transacción
     * ================================================
     */

    const result = await adminDb.runTransaction(
      async (transaction) => {
        const pedidoRef = adminDb
          .collection("pedidos")
          .doc(pedidoId);

        const pedidoSnapshot =
          await transaction.get(pedidoRef);

        /*
         * El pedido debe existir.
         */

        if (!pedidoSnapshot.exists) {
          throw new Error("PEDIDO_NOT_FOUND");
        }

        const pedido = pedidoSnapshot.data();

        if (!pedido) {
          throw new Error("PEDIDO_INVALID");
        }

        /*
         * ============================================
         * Seguridad
         * ============================================
         *
         * Un usuario solamente puede cancelar
         * sus propios pedidos.
         */

        if (pedido.usuarioId !== user.uid) {
          throw new Error("FORBIDDEN");
        }

        /*
         * Solamente los pedidos pendientes
         * pueden cancelarse.
         */

        if (pedido.estado !== "pendiente") {
          throw new Error("INVALID_STATUS");
        }

        /*
         * ============================================
         * Validación de productos
         * ============================================
         */

        if (
          !Array.isArray(pedido.productos) ||
          pedido.productos.length === 0
        ) {
          throw new Error("INVALID_PRODUCTS");
        }

        const items: Array<{
          productoId: string;
          cantidad: number;
        }> = [];

        for (const item of pedido.productos) {
          if (
            !item ||
            typeof item !== "object"
          ) {
            throw new Error("INVALID_PRODUCTS");
          }

          const productoId =
            "productoId" in item &&
            typeof item.productoId === "string"
              ? item.productoId.trim()
              : "";

          const cantidad =
            "cantidad" in item &&
            typeof item.cantidad === "number"
              ? item.cantidad
              : NaN;

          if (
            !productoId ||
            !Number.isInteger(cantidad) ||
            cantidad <= 0
          ) {
            throw new Error("INVALID_PRODUCTS");
          }

          items.push({
            productoId,
            cantidad,
          });
        }

        /*
         * ============================================
         * Obtener productos
         * ============================================
         */

        const productRefs = items.map((item) =>
          adminDb
            .collection("productos")
            .doc(item.productoId),
        );

        const productSnapshots = [];

        for (const ref of productRefs) {
          productSnapshots.push(
            await transaction.get(ref),
          );
        }

        /*
         * ============================================
         * Devolver stock
         * ============================================
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

          const currentStock = Number(
            product.stock ?? 0,
          );

          if (
            !Number.isInteger(currentStock) ||
            currentStock < 0
          ) {
            throw new Error(
              "PRODUCT_STOCK_INVALID",
            );
          }

          /*
           * El stock que se descontó al crear
           * el pedido vuelve al inventario.
           */

          transaction.update(
            productRefs[index],
            {
              stock:
                currentStock +
                item.cantidad,

              ultimaActualizacion:
                FieldValue.serverTimestamp(),
            },
          );
        }

        /*
         * ============================================
         * Cancelar pedido
         * ============================================
         */

        transaction.update(
          pedidoRef,
          {
            estado: "cancelado",

            fechaCancelacion:
              FieldValue.serverTimestamp(),

            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          },
        );

        /*
         * ============================================
         * Cancelar reserva relacionada
         * ============================================
         */

        if (
          typeof pedido.reservaId === "string" &&
          pedido.reservaId.trim()
        ) {
          const reservaRef = adminDb
            .collection("reservas")
            .doc(pedido.reservaId.trim());

          transaction.update(
            reservaRef,
            {
              status: "cancelled",
              cancelledAt:
                FieldValue.serverTimestamp(),
            },
          );
        }

        return {
          pedidoId,
          estado: "cancelado",
        };
      },
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Error cancelando pedido:",
      error,
    );

    if (
      error instanceof Error
    ) {
      switch (error.message) {
        case "PEDIDO_NOT_FOUND":
          return errorResponse(
            "El pedido no existe.",
            404,
          );

        case "FORBIDDEN":
          return errorResponse(
            "No tienes permiso para cancelar este pedido.",
            403,
          );

        case "INVALID_STATUS":
          return errorResponse(
            "Solo se pueden cancelar pedidos pendientes.",
            409,
          );

        case "INVALID_PRODUCTS":
          return errorResponse(
            "El pedido contiene productos inválidos.",
            409,
          );

        case "PRODUCT_NOT_FOUND":
          return errorResponse(
            "No se puede devolver el stock porque uno de los productos ya no existe.",
            409,
          );

        case "PRODUCT_INVALID":
          return errorResponse(
            "No fue posible validar uno de los productos.",
            409,
          );

        case "PRODUCT_STOCK_INVALID":
          return errorResponse(
            "El stock actual de uno de los productos no es válido.",
            409,
          );

        case "PEDIDO_INVALID":
          return errorResponse(
            "El pedido contiene información inválida.",
            409,
          );
      }
    }

    return errorResponse(
      "No fue posible cancelar el pedido.",
      500,
    );
  }
}