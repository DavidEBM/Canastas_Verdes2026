import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

type TipoEntrega = "domicilio" | "recogida";

interface PickupPointSnapshot {
  nombre: string;
  direccion: string;
  municipio: string;
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

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getNumber(
  value: unknown,
): number | null {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
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
      tipoEntrega?: unknown;
      IdMunicipalidad?: unknown;
      direccionEntrega?: unknown;
      telefono?: unknown;
      IdPuntoRecogida?: unknown;
    };

    const items = parseItems(input.items);

    const tipoEntrega = cleanString(
      input.tipoEntrega,
    ) as TipoEntrega;

    if (
      tipoEntrega !== "domicilio" &&
      tipoEntrega !== "recogida"
    ) {
      return errorResponse(
        "El tipo de entrega no es válido.",
        400,
      );
    }

    const municipality = cleanString(
      input.IdMunicipalidad,
    );

    if (
      !items ||
      !municipality ||
      municipality.length > 150
    ) {
      return errorResponse(
        "Revisa los productos y la municipalidad.",
        400,
      );
    }

    const address = cleanString(
      input.direccionEntrega,
    );

    const telefono = cleanString(
      input.telefono,
    );

    const pickupPointId = cleanString(
      input.IdPuntoRecogida,
    );

    /*
     * ================================================
     * Validación específica de entrega
     * ================================================
     */

    if (tipoEntrega === "domicilio") {
      if (
        address.length < 5 ||
        address.length > 300
      ) {
        return errorResponse(
          "La dirección de entrega no es válida.",
          400,
        );
      }

      if (
        telefono &&
        !/^\+57\d{10}$/.test(telefono)
      ) {
        return errorResponse(
          "El número de teléfono no es válido. Debe tener el formato +57 seguido de 10 dígitos.",
          400,
        );
      }

      if (pickupPointId) {
        return errorResponse(
          "No debes seleccionar un punto de recogida para una entrega a domicilio.",
          400,
        );
      }
    }

    if (tipoEntrega === "recogida") {
      if (!pickupPointId) {
        return errorResponse(
          "Debes seleccionar un punto de recogida.",
          400,
        );
      }

      if (address || telefono) {
        return errorResponse(
          "Los datos de domicilio no corresponden a una recogida.",
          400,
        );
      }
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
        /*
         * ==========================================
         * Validar municipalidad
         * ==========================================
         */

        const municipalityRef = adminDb
          .collection("municipalidades")
          .doc(municipality);

        const municipalitySnapshot =
          await transaction.get(
            municipalityRef,
          );

        if (!municipalitySnapshot.exists) {
          throw new Error(
            "MUNICIPALITY_NOT_FOUND",
          );
        }

        const municipalityData =
          municipalitySnapshot.data() ?? {};

        const municipalityActive =
          municipalityData.Activo !== false;

        if (!municipalityActive) {
          throw new Error(
            "MUNICIPALITY_INACTIVE",
          );
        }

        const municipalityName =
          typeof municipalityData.Nombre ===
          "string"
            ? municipalityData.Nombre.trim()
            : "";

        if (!municipalityName) {
          throw new Error(
            "MUNICIPALITY_INVALID",
          );
        }

        /*
         * ==========================================
         * Validar punto de recogida
         * ==========================================
         */

        let pickupPoint:
          | PickupPointSnapshot
          | null = null;

        if (tipoEntrega === "recogida") {
          const pickupRef = adminDb
            .collection("puntosRecogida")
            .doc(pickupPointId);

          const pickupSnapshot =
            await transaction.get(
              pickupRef,
            );

          if (!pickupSnapshot.exists) {
            throw new Error(
              "PICKUP_POINT_NOT_FOUND",
            );
          }

          const pickupData =
            pickupSnapshot.data() ?? {};

          if (pickupData.activo === false) {
            throw new Error(
              "PICKUP_POINT_INACTIVE",
            );
          }

          const pickupMunicipality =
            cleanString(
              pickupData.IdMunicipalidad,
            );

          if (
            !pickupMunicipality ||
            pickupMunicipality !== municipality
          ) {
            throw new Error(
              "PICKUP_POINT_MUNICIPALITY_MISMATCH",
            );
          }

          const pickupName = cleanString(
            pickupData.nombre,
          );

          const pickupAddress = cleanString(
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

          pickupPoint = {
            nombre: pickupName,
            direccion: pickupAddress,
            municipio: municipalityName,
          };
        }

        /*
         * ==========================================
         * Leer productos
         * ==========================================
         */

        const productRefs = items.map(
          (item) =>
            adminDb
              .collection("productos")
              .doc(item.productId),
        );

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

          const productName =
            cleanString(product.nombre) ||
            item.productId;

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
              `El producto "${productName}" no está disponible.`,
            );
          }

          if (stock < item.quantity) {
            throw new Error(
              `No hay stock suficiente para ${productName}.`,
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

          /*
           * ========================================
           * Presentación del producto
           * ========================================
           *
           * Se guarda una copia de la presentación
           * actual para que el pedido conserve la
           * información que tenía al momento de
           * comprar.
           */

          const presentacionCantidad =
            getNumber(
              product.presentacionCantidad,
            );

          const presentacionNombre =
            cleanString(
              product.presentacionNombre,
            );

          const unidad =
            cleanString(product.unidad);

          const productoPedido: Record<
            string,
            unknown
          > = {
            productoId: item.productId,

            code: cleanString(
              product.code,
            ),

            nombre: productName,

            cantidad: item.quantity,

            precioUnitario: precio,

            subtotal: lineSubtotal,

            unidad,

            IdProductor: cleanString(
              product.IdProductor,
            ),

            IdMunicipalidad: cleanString(
              product.IdMunicipalidad,
            ),
          };

          if (
            presentacionCantidad !== null &&
            presentacionCantidad > 0
          ) {
            productoPedido.presentacionCantidad =
              presentacionCantidad;
          }

          if (presentacionNombre) {
            productoPedido.presentacionNombre =
              presentacionNombre;
          }

          productos.push(
            productoPedido,
          );
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
            usuarioId: user.uid,

            productos,

            subtotal,

            total: subtotal,

            estado: "pendiente",

            reservaId:
              reservationRef.id,

            tipoEntrega,

            IdMunicipalidad:
              municipality,

            direccionEntrega:
              tipoEntrega === "domicilio"
                ? address
                : null,

            telefonoEntrega:
              tipoEntrega === "domicilio"
                ? telefono || null
                : null,

            IdPuntoRecogida:
              tipoEntrega === "recogida"
                ? pickupPointId
                : null,

            puntoRecogida:
              tipoEntrega === "recogida"
                ? pickupPoint
                : null,

            repartidorId: null,

            fechaCreacion:
              FieldValue.serverTimestamp(),

            ultimaActualizacion:
              FieldValue.serverTimestamp(),

            fechaCancelacion: null,
          },
        );

        return {
          pedidoId:
            pedidoRef.id,

          total: subtotal,
        };
      },
    );

    /*
     * ================================================
     * Respuesta exitosa
     * ================================================
     */

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error creando pedido:",
      error,
    );

    if (error instanceof Error) {
      switch (error.message) {
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