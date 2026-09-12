import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "productos";
const PRODUCTORES_COLLECTION = "productores";

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;
const MAX_TEXT_LENGTH = 500;

type CanastaComponent = {
  productoId: string;
  cantidad: number;
};

function text(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeCode(value: unknown): string {
  return text(value, MAX_CODE_LENGTH).toUpperCase();
}

function numberValue(
  value: unknown,
  defaultValue = 0,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
}

function percentageValue(
  value: unknown,
  fieldName: string,
): number {
  const parsed = numberValue(value, 0);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    throw new Error(
      `${fieldName} debe ser un porcentaje entre 0 y 100.`,
    );
  }

  return parsed;
}

function normalizeComponents(
  value: unknown,
): CanastaComponent[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(
      "Los componentes de la canasta no son válidos.",
    );
  }

  return value.map(
    (component, index) => {
      if (
        !component ||
        typeof component !== "object" ||
        Array.isArray(component)
      ) {
        throw new Error(
          `El componente ${index + 1} de la canasta no es válido.`,
        );
      }

      const item =
        component as Record<string, unknown>;

      const productoId = text(
        item.productoId,
        200,
      );

      const cantidad = numberValue(
        item.cantidad,
        0,
      );

      if (!productoId) {
        throw new Error(
          `El componente ${index + 1} requiere un producto.`,
        );
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        throw new Error(
          `La cantidad del componente ${index + 1} debe ser un entero mayor que 0.`,
        );
      }

      return {
        productoId,
        cantidad,
      };
    },
  );
}

function normalizeCanasta(
  input: Record<string, unknown>,
): {
  componentes: CanastaComponent[];
} {
  const categoria = text(
    input.categoria,
    200,
  );

  const componentes =
    normalizeComponents(
      input.componentes,
    );

  if (categoria.toLowerCase() !== "canasta") {
    return {
      componentes: [],
    };
  }

  if (componentes.length === 0) {
    throw new Error(
      "Una canasta debe contener al menos un producto.",
    );
  }

  const presentation =
    text(
      input.presentacionCanasta ??
        input.presentacion,
      50,
    ).toLowerCase();

  const allowedPresentations = [
    "grande",
    "mediana",
    "pequeña",
    "pequena",
  ];

  if (
    !allowedPresentations.includes(
      presentation,
    )
  ) {
    throw new Error(
      "La presentación de una canasta debe ser Grande, Mediana o Pequeña.",
    );
  }

  return {
    componentes,
  };
}

function product(
  input: Record<string, unknown>,
) {
  const code =
    normalizeCode(input.code);

  const nombre =
    text(
      input.nombre,
      MAX_NAME_LENGTH,
    );

  const precio =
    numberValue(input.precio);

  const stock =
    numberValue(input.stock);

  const costoPcc =
    numberValue(
      input.costoPcc,
    );

  const porcentajeLogistica =
    percentageValue(
      input.porcentajeLogistica,
      "El porcentaje de logística",
    );

  const porcentajeTransporte =
    percentageValue(
      input.porcentajeTransporte,
      "El porcentaje de transporte",
    );

  const precioSugerido =
    numberValue(
      input.precioSugerido,
    );

  const precioVenta =
    numberValue(
      input.precioVenta,
    );

  if (
    !code ||
    !nombre ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error(
      "Cada producto requiere código, nombre, precio y stock válidos.",
    );
  }

  if (
    !Number.isFinite(costoPcc) ||
    costoPcc < 0
  ) {
    throw new Error(
      "El costo PCC no es válido.",
    );
  }

  if (
    !Number.isFinite(precioSugerido) ||
    precioSugerido < 0
  ) {
    throw new Error(
      "El precio sugerido no es válido.",
    );
  }

  if (
    !Number.isFinite(precioVenta) ||
    precioVenta < 0
  ) {
    throw new Error(
      "El precio de venta no es válido.",
    );
  }

  const IdProductor =
    text(
      input.IdProductor,
      200,
    );

  const IdMunicipalidad =
    text(
      input.IdMunicipalidad,
      200,
    );

  const activo =
    input.activo !== false &&
    input.activo !== "false" &&
    input.activo !== "FALSE" &&
    input.activo !== 0 &&
    input.activo !== "0";

  const categoria =
    text(
      input.categoria,
      200,
    );

  const unidad =
    text(
      input.unidad,
      100,
    );

  const canasta =
    normalizeCanasta(input);

  return {
    code,
    nombre,

    descripcion:
      text(
        input.descripcion,
      ),

    precio,
    stock,

    costoPcc,
    porcentajeLogistica,
    porcentajeTransporte,
    precioSugerido,
    precioVenta,

    categoria,

    unidad,

    imgPath:
      text(
        input.imgPath,
        500,
      ),

    imageName:
      text(
        input.imageName,
        255,
      ),

    activo,

    IdProductor,

    IdMunicipalidad,

    componentes:
      canasta.componentes,
  };
}

function authorizationError(
  error: unknown,
): Response | null {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "AUTH_REQUIRED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes iniciar sesión.",
        },
        { status: 401 },
      );

    case "USER_NOT_FOUND":
      return NextResponse.json(
        {
          success: false,
          message:
            "Tu cuenta no está registrada en el sistema.",
        },
        { status: 403 },
      );

    case "USER_INVALID":
      return NextResponse.json(
        {
          success: false,
          message:
            "La información de tu cuenta no es válida.",
        },
        { status: 403 },
      );

    case "ADMIN_REQUIRED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Solo un administrador puede gestionar productos.",
        },
        { status: 403 },
      );

    default:
      return null;
  }
}

/**
 * GET
 *
 * Público.
 *
 * Devuelve todos los productos manteniendo
 * compatibilidad con documentos antiguos
 * que todavía no tengan los nuevos campos.
 */
export async function GET() {
  try {
    const snapshot =
      await adminDb
        .collection(COLLECTION)
        .get();

    const data =
      snapshot.docs.map(
        (document) => {
          const productData =
            document.data();

          return {
            id: document.id,
            ...productData,

            precio:
              numberValue(
                productData.precio,
              ),

            stock:
              numberValue(
                productData.stock,
              ),

            costoPcc:
              numberValue(
                productData.costoPcc,
              ),

            porcentajeLogistica:
              numberValue(
                productData.porcentajeLogistica,
              ),

            porcentajeTransporte:
              numberValue(
                productData.porcentajeTransporte,
              ),

            precioSugerido:
              numberValue(
                productData.precioSugerido,
              ),

            precioVenta:
              numberValue(
                productData.precioVenta,
              ),

            componentes:
              Array.isArray(
                productData.componentes,
              )
                ? productData.componentes
                : [],

            IdProductor:
              text(
                productData.IdProductor,
                200,
              ),

            IdMunicipalidad:
              text(
                productData.IdMunicipalidad,
                200,
              ),
          };
        },
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error obteniendo productos:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible obtener los productos.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Solo administrador.
 *
 * Crea un producto nuevo.
 */
export async function POST(
  request: Request,
) {
  try {
    await requireAdmin(request);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Los datos del producto no son válidos.",
        },
        { status: 400 },
      );
    }

    const data =
      product(
        body as Record<
          string,
          unknown
        >,
      );

    /*
     * ========================================================
     * PRODUCTOR
     * ========================================================
     *
     * Se mantiene la relación con productores
     * para no romper la estructura actual.
     */
    if (!data.IdProductor) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes seleccionar un productor para el producto.",
        },
        { status: 400 },
      );
    }

    const productorRef =
      adminDb
        .collection(
          PRODUCTORES_COLLECTION,
        )
        .doc(
          data.IdProductor,
        );

    const productorSnapshot =
      await productorRef.get();

    if (
      !productorSnapshot.exists
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El productor seleccionado no existe.",
        },
        { status: 400 },
      );
    }

    const productorData =
      productorSnapshot.data();

    if (
      productorData?.activo === false
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El productor seleccionado está inactivo.",
        },
        { status: 400 },
      );
    }

    /*
     * ========================================================
     * CÓDIGO DUPLICADO
     * ========================================================
     */

    const duplicateSnapshot =
      await adminDb
        .collection(COLLECTION)
        .where(
          "code",
          "==",
          data.code,
        )
        .limit(1)
        .get();

    if (
      !duplicateSnapshot.empty
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Ya existe un producto con el código ${data.code}.`,
        },
        { status: 409 },
      );
    }

    /*
     * Segunda validación para códigos
     * con diferencias únicamente de
     * mayúsculas/minúsculas.
     */
    const allProductsSnapshot =
      await adminDb
        .collection(COLLECTION)
        .get();

    const normalizedCode =
      data.code.toLowerCase();

    const hasCaseInsensitiveDuplicate =
      allProductsSnapshot.docs.some(
        (document) => {
          const existingCode =
            text(
              document.data().code,
              MAX_CODE_LENGTH,
            ).toLowerCase();

          return (
            existingCode ===
            normalizedCode
          );
        },
      );

    if (
      hasCaseInsensitiveDuplicate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Ya existe un producto con el código ${data.code}.`,
        },
        { status: 409 },
      );
    }

    /*
     * ========================================================
     * VALIDAR COMPONENTES DE CANASTA
     * ========================================================
     */

    if (
      data.componentes.length > 0
    ) {
      for (
        const component of
          data.componentes
      ) {
        const componentSnapshot =
          await adminDb
            .collection(COLLECTION)
            .doc(
              component.productoId,
            )
            .get();

        if (
          !componentSnapshot.exists
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `El producto ${component.productoId} utilizado en la canasta no existe.`,
            },
            { status: 400 },
          );
        }
      }
    }

    /*
     * ========================================================
     * CREAR DOCUMENTO
     * ========================================================
     */

    const ref =
      adminDb
        .collection(COLLECTION)
        .doc();

    const firestoreData: Record<
      string,
      unknown
    > = {
      code:
        data.code,

      nombre:
        data.nombre,

      descripcion:
        data.descripcion,

      precio:
        data.precio,

      stock:
        data.stock,

      costoPcc:
        data.costoPcc,

      porcentajeLogistica:
        data.porcentajeLogistica,

      porcentajeTransporte:
        data.porcentajeTransporte,

      precioSugerido:
        data.precioSugerido,

      precioVenta:
        data.precioVenta,

      categoria:
        data.categoria,

      unidad:
        data.unidad,

      imgPath:
        data.imgPath,

      imageName:
        data.imageName,

      activo:
        data.activo,

      IdProductor:
        data.IdProductor,

      IdMunicipalidad:
        data.IdMunicipalidad,

      /*
       * Para productos normales queda
       * como arreglo vacío.
       */
      componentes:
        data.componentes,

      fechaCreacion:
        FieldValue.serverTimestamp(),

      ultimaActualizacion:
        FieldValue.serverTimestamp(),

      fechaCierre:
        null,
    };

    await ref.set(
      firestoreData,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ref.id,
          ...firestoreData,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const authResponse =
      authorizationError(error);

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "Error creando producto:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible crear el producto.",
      },
      { status: 500 },
    );
  }
}