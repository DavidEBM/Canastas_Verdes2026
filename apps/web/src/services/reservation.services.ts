import {
  collection,
  doc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* =========================================================
   Configuración
========================================================= */

const PRODUCTS_COLLECTION = "productos";
const RESERVATIONS_COLLECTION = "reservas";

/**
 * Tiempo durante el cual una reserva permanece activa.
 *
 * Actualmente:
 * 10 minutos.
 */
export const RESERVATION_DURATION_MS =
  10 * 60 * 1000;

/* =========================================================
   Tipos
========================================================= */

export interface ReservationItem {
  productId: string;
  quantity: number;
}

export interface Reservation {
  id: string;

  userId: string;

  items: ReservationItem[];

  status:
    | "active"
    | "confirmed"
    | "cancelled"
    | "expired";

  createdAt: Timestamp;

  expiresAt: Timestamp;
}

/* =========================================================
   Crear reserva
========================================================= */

/**
 * Crea una reserva temporal de productos.
 *
 * La operación utiliza una transacción de Firestore para
 * evitar que dos clientes puedan reservar simultáneamente
 * unidades que ya no están disponibles.
 *
 * IMPORTANTE:
 * Este servicio debe ejecutarse desde servidor.
 */
export async function createReservation(
  userId: string,
  items: ReservationItem[],
): Promise<{
  reservationId: string;
  expiresAt: Timestamp;
}> {
  /* =======================================================
     Validar usuario
  ======================================================= */

  if (!userId) {
    throw new Error(
      "El usuario debe estar autenticado.",
    );
  }

  /* =======================================================
     Validar cesta
  ======================================================= */

  if (!Array.isArray(items)) {
    throw new Error(
      "Los productos de la reserva no son válidos.",
    );
  }

  if (items.length === 0) {
    throw new Error(
      "La reserva no contiene productos.",
    );
  }

  /* =======================================================
     Consolidar productos repetidos
  =======================================================

     Si llegan:

     tomate x1
     tomate x2

     se convierten en:

     tomate x3
  ======================================================= */

  const normalizedItems =
    new Map<string, number>();

  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      item.productId.trim() === ""
    ) {
      throw new Error(
        "Existe un producto con un ID inválido.",
      );
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        `La cantidad del producto ${item.productId} no es válida.`,
      );
    }

    const productId =
      item.productId.trim();

    const currentQuantity =
      normalizedItems.get(
        productId,
      ) ?? 0;

    normalizedItems.set(
      productId,
      currentQuantity +
        item.quantity,
    );
  }

  const finalItems: ReservationItem[] =
    Array.from(
      normalizedItems.entries(),
    ).map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );

  /* =======================================================
     Referencia de la reserva
  ======================================================= */

  const reservationRef = doc(
    collection(
      db,
      RESERVATIONS_COLLECTION,
    ),
  );

  /* =======================================================
     Fechas
  ======================================================= */

  const createdAt =
    Timestamp.now();

  const expiresAt =
    Timestamp.fromMillis(
      Date.now() +
        RESERVATION_DURATION_MS,
    );

  /* =======================================================
     TRANSACCIÓN
  ======================================================= */

  await runTransaction(
    db,
    async (transaction) => {
      /* ===================================================
         1. Crear referencias de productos
      =================================================== */

      const productRefs =
        finalItems.map((item) =>
          doc(
            db,
            PRODUCTS_COLLECTION,
            item.productId,
          ),
        );

      /* ===================================================
         2. Leer productos
      =================================================== */

      const productSnapshots =
        await Promise.all(
          productRefs.map((ref) =>
            transaction.get(ref),
          ),
        );

      /* ===================================================
         3. Validar productos
      =================================================== */

      for (
        let index = 0;
        index < finalItems.length;
        index++
      ) {
        const item =
          finalItems[index];

        const snapshot =
          productSnapshots[index];

        /* -----------------------------------------------
           Producto inexistente
        ------------------------------------------------ */

        if (!snapshot.exists()) {
          throw new Error(
            `El producto ${item.productId} ya no existe.`,
          );
        }

        /* -----------------------------------------------
           Obtener datos
        ------------------------------------------------ */

        const data =
          snapshot.data();

        /*
         * Firestore puede devolver undefined
         * según el tipado del SDK.
         */
        if (!data) {
          throw new Error(
            `No fue posible obtener los datos del producto ${item.productId}.`,
          );
        }

        /* -----------------------------------------------
           Estado del producto
        ------------------------------------------------ */

        const activo =
          data.activo === true;

        if (!activo) {
          throw new Error(
            `El producto "${data.nombre ?? item.productId}" ya no está disponible.`,
          );
        }

        /* -----------------------------------------------
           Stock
        ------------------------------------------------ */

        const stock =
          typeof data.stock === "number"
            ? data.stock
            : Number(
                data.stock ?? 0,
              );

        if (
          !Number.isFinite(stock) ||
          stock < 0
        ) {
          throw new Error(
            `El stock del producto "${data.nombre ?? item.productId}" no es válido.`,
          );
        }

        /* -----------------------------------------------
           Comprobar disponibilidad
        ------------------------------------------------ */

        if (
          stock < item.quantity
        ) {
          throw new Error(
            `No hay suficiente stock de "${data.nombre ?? item.productId}". Disponible: ${stock}. Solicitado: ${item.quantity}.`,
          );
        }
      }

      /* ===================================================
         4. Crear reserva
      =================================================== */

      transaction.set(
        reservationRef,
        {
          userId,

          items: finalItems,

          status: "active",

          createdAt,

          expiresAt,
        },
      );

      /* ===================================================
         5. Reservar stock
      ===================================================

         En esta etapa el stock se descuenta temporalmente.

         Ejemplo:

         Stock real:
         10 tomates

         Cliente reserva:
         3 tomates

         Firebase:
         stock = 7

         Si la reserva se confirma:
         esos 3 pasan a formar parte del pedido.

         Si la reserva expira/cancela:
         esos 3 se devuelven.
      =================================================== */

      for (
        let index = 0;
        index < finalItems.length;
        index++
      ) {
        const item =
          finalItems[index];

        const snapshot =
          productSnapshots[index];

        /* -----------------------------------------------
           Verificación adicional
        ------------------------------------------------ */

        if (!snapshot.exists()) {
          throw new Error(
            `El producto ${item.productId} ya no existe.`,
          );
        }

        const data =
          snapshot.data();

        if (!data) {
          throw new Error(
            `No fue posible obtener los datos del producto ${item.productId}.`,
          );
        }

        /* -----------------------------------------------
           Stock actual
        ------------------------------------------------ */

        const currentStock =
          typeof data.stock === "number"
            ? data.stock
            : Number(
                data.stock ?? 0,
              );

        /* -----------------------------------------------
           Nuevo stock
        ------------------------------------------------ */

        const newStock =
          currentStock -
          item.quantity;

        if (newStock < 0) {
          throw new Error(
            `El stock del producto "${data.nombre ?? item.productId}" no puede ser negativo.`,
          );
        }

        /* -----------------------------------------------
           Actualizar producto
        ------------------------------------------------ */

        transaction.update(
          productRefs[index],
          {
            stock: newStock,

            ultimaActualizacion:
              Timestamp.now(),
          },
        );
      }
    },
  );

  /* =======================================================
     Resultado
  ======================================================= */

  return {
    reservationId:
      reservationRef.id,

    expiresAt,
  };
}