import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "productos";
const PRODUCTORES_COLLECTION = "productores";

const MAX_ROWS = 400;

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;
const MAX_TEXT_LENGTH = 500;

type Action =
  | "CREAR"
  | "ACTUALIZAR"
  | "ELIMINAR";

type ProductRow = Record<string, unknown>;

type CanastaComponent = {
  productoId: string;
  cantidad: number;
};

type NormalizedProduct = {
  code: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;

  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;
  precioSugerido: number;
  precioVenta: number;

  categoria: string;
  unidad: string;
  imgPath: string;
  imageName: string;
  activo: boolean;

  IdProductor?: string;
  IdMunicipalidad: string;

  componentes: CanastaComponent[];
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

function normalizeCode(
  value: unknown,
): string {
  return text(
    value,
    MAX_CODE_LENGTH,
  ).toUpperCase();
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

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
}

function percentageValue(
  value: unknown,
  fieldName: string,
  rowNumber: number,
): number {
  const parsed =
    numberValue(value, 0);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    throw new Error(
      `Fila ${rowNumber}: ${fieldName} debe ser un porcentaje entre 0 y 100.`,
    );
  }

  return parsed;
}

function getAction(
  value: unknown,
): Action {
  const normalized =
    text(value).toUpperCase();

  if (
    normalized === "CREAR" ||
    normalized === "ACTUALIZAR" ||
    normalized === "ELIMINAR"
  ) {
    return normalized;
  }

  throw new Error(
    `Acción inválida: "${
      text(value) || "vacía"
    }". Usa CREAR, ACTUALIZAR o ELIMINAR.`,
  );
}

function normalizeComponents(
  value: unknown,
  rowNumber: number,
): CanastaComponent[] {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  let parsed = value;

  /*
   * Permite importar componentes como JSON
   * desde Excel.
   *
   * Ejemplo:
   *
   * [
   *   {"productoId":"abc","cantidad":2},
   *   {"productoId":"def","cantidad":1}
   * ]
   */
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(
        `Fila ${rowNumber}: el campo componentes debe contener un JSON válido.`,
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Fila ${rowNumber}: los componentes de la canasta no son válidos.`,
    );
  }

  return parsed.map(
    (component, index) => {
      if (
        !component ||
        typeof component !== "object" ||
        Array.isArray(component)
      ) {
        throw new Error(
          `Fila ${rowNumber}: el componente ${
            index + 1
          } no es válido.`,
        );
      }

      const item =
        component as Record<
          string,
          unknown
        >;

      const productoId =
        text(
          item.productoId,
          200,
        );

      const cantidad =
        numberValue(
          item.cantidad,
          0,
        );

      if (!productoId) {
        throw new Error(
          `Fila ${rowNumber}: el componente ${
            index + 1
          } requiere productoId.`,
        );
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        throw new Error(
          `Fila ${rowNumber}: la cantidad del componente ${
            index + 1
          } debe ser un entero mayor que 0.`,
        );
      }

      return {
        productoId,
        cantidad,
      };
    },
  );
}

function normalizeProduct(
  row: ProductRow,
  rowNumber: number,
): NormalizedProduct {
  const code =
    normalizeCode(row.code);

  const nombre =
    text(
      row.nombre,
      MAX_NAME_LENGTH,
    );

  const precio =
    numberValue(row.precio);

  const stock =
    numberValue(row.stock);

  if (
    !code ||
    !nombre ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error(
      `Fila ${rowNumber} inválida: código, nombre, precio y stock son obligatorios.`,
    );
  }

  const costoPcc =
    numberValue(
      row.costoPcc,
    );

  if (
    !Number.isFinite(costoPcc) ||
    costoPcc < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: el costo PCC no es válido.`,
    );
  }

  const porcentajeLogistica =
    percentageValue(
      row.porcentajeLogistica,
      "el porcentaje de logística",
      rowNumber,
    );

  const porcentajeTransporte =
    percentageValue(
      row.porcentajeTransporte,
      "el porcentaje de transporte",
      rowNumber,
    );

  const precioSugerido =
    numberValue(
      row.precioSugerido,
    );

  if (
    !Number.isFinite(precioSugerido) ||
    precioSugerido < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: el precio sugerido no es válido.`,
    );
  }

  const precioVenta =
    numberValue(
      row.precioVenta,
    );

  if (
    !Number.isFinite(precioVenta) ||
    precioVenta < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: el precio de venta no es válido.`,
    );
  }

  const categoria =
    text(
      row.categoria,
      200,
    );

  const unidad =
    text(
      row.unidad,
      100,
    );

  const componentes =
    normalizeComponents(
      row.componentes,
      rowNumber,
    );

  /*
   * Una canasta debe tener componentes.
   */
  if (
    categoria.toLowerCase() ===
      "canasta" &&
    componentes.length === 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: una canasta debe contener al menos un producto.`,
    );
  }

  return {
    code,
    nombre,

    descripcion:
      text(row.descripcion),

    precio,
    stock,

    costoPcc,
    porcentajeLogistica,
    porcentajeTransporte,
    precioSugerido,
    precioVenta,

    categoria,

    unidad:
      categoria.toLowerCase() ===
      "canasta"
        ? unidad
        : unidad,

    imgPath:
      text(
        row.imgPath,
        500,
      ),

    imageName:
      text(
        row.imageName,
        255,
      ),

    activo:
      row.activo !== false &&
      row.activo !== "false" &&
      row.activo !== "FALSE" &&
      row.activo !== 0 &&
      row.activo !== "0",

    ...(text(
      row.IdProductor,
      200,
    )
      ? {
          IdProductor:
            text(
              row.IdProductor,
              200,
            ),
        }
      : {}),

    IdMunicipalidad:
      text(
        row.IdMunicipalidad,
        200,
      ),

    componentes,
  };
}

function errorResponse(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message ===
      "AUTH_REQUIRED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "No autenticado.",
      },
      { status: 401 },
    );
  }

  if (
    error instanceof Error &&
    (
      error.message ===
        "USER_NOT_FOUND" ||
      error.message ===
        "USER_INVALID" ||
      error.message ===
        "ADMIN_REQUIRED"
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Solo un administrador puede importar productos.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message,
      },
      { status: 400 },
    );
  }

  console.error(
    "Error importando productos:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible importar el archivo.",
    },
    { status: 500 },
  );
}

async function validateProductor(
  productorId: string,
  rowNumber: number,
) {
  if (!productorId) {
    throw new Error(
      `Fila ${rowNumber}: debes indicar un IdProductor.`,
    );
  }

  const productorRef =
    adminDb
      .collection(
        PRODUCTORES_COLLECTION,
      )
      .doc(productorId);

  const productorSnapshot =
    await productorRef.get();

  if (
    !productorSnapshot.exists
  ) {
    throw new Error(
      `Fila ${rowNumber}: el productor con ID "${productorId}" no existe.`,
    );
  }

  const productorData =
    productorSnapshot.data();

  if (
    productorData?.activo === false
  ) {
    throw new Error(
      `Fila ${rowNumber}: el productor indicado está inactivo.`,
    );
  }
}

async function validateComponents(
  componentes: CanastaComponent[],
  rowNumber: number,
) {
  if (
    componentes.length === 0
  ) {
    return;
  }

  const uniqueIds =
    Array.from(
      new Set(
        componentes.map(
          (item) =>
            item.productoId,
        ),
      ),
    );

  for (
    const productoId of uniqueIds
  ) {
    const snapshot =
      await adminDb
        .collection(COLLECTION)
        .doc(productoId)
        .get();

    if (!snapshot.exists) {
      throw new Error(
        `Fila ${rowNumber}: el producto "${productoId}" utilizado como componente no existe.`,
      );
    }
  }
}

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
      Array.isArray(body) ||
      !("rows" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La solicitud no contiene filas.",
        },
        { status: 400 },
      );
    }

    const rows =
      (
        body as {
          rows?: unknown;
        }
      ).rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El formato de importación no es válido.",
        },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El archivo no tiene filas de productos.",
        },
        { status: 400 },
      );
    }

    if (
      rows.length > MAX_ROWS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `El máximo por importación es de ${MAX_ROWS} productos.`,
        },
        { status: 400 },
      );
    }

    const collection =
      adminDb.collection(
        COLLECTION,
      );

    const snapshot =
      await collection.get();

    const existingById =
      new Map<
        string,
        FirebaseFirestore.QueryDocumentSnapshot
      >(
        snapshot.docs.map(
          (document) => [
            document.id,
            document,
          ],
        ),
      );

    const existingCodes =
      new Map<
        string,
        string
      >();

    for (
      const document of snapshot.docs
    ) {
      const code =
        normalizeCode(
          document.data().code,
        );

      if (code) {
        existingCodes.set(
          code,
          document.id,
        );
      }
    }

    const importedCodes =
      new Map<
        string,
        number
      >();

    const productorRows =
      new Map<
        string,
        number
      >();

    const operations: Array<{
      action: Action;
      id?: string;
      data?: NormalizedProduct;
      rowNumber: number;
    }> = [];

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const raw =
        rows[index];

      const rowNumber =
        index + 2;

      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {
        throw new Error(
          `La fila ${rowNumber} no tiene un formato válido.`,
        );
      }

      const row =
        raw as ProductRow;

      const action =
        getAction(
          row.accion,
        );

      const id =
        text(
          row.id,
          200,
        );

      /*
       * ======================================================
       * ELIMINAR
       * ======================================================
       */

      if (
        action ===
        "ELIMINAR"
      ) {
        if (!id) {
          throw new Error(
            `Fila ${rowNumber}: ELIMINAR requiere un ID.`,
          );
        }

        if (
          !existingById.has(id)
        ) {
          throw new Error(
            `Fila ${rowNumber}: el ID indicado no corresponde a un producto existente.`,
          );
        }

        operations.push({
          action,
          id,
          rowNumber,
        });

        deleted += 1;

        continue;
      }

      /*
       * ======================================================
       * CREAR / ACTUALIZAR
       * ======================================================
       */

      const data =
        normalizeProduct(
          row,
          rowNumber,
        );

      if (
        data.IdProductor
      ) {
        productorRows.set(
          data.IdProductor,
          rowNumber,
        );
      }

      /*
       * Validar componentes antes
       * de ejecutar el Batch.
       */
      await validateComponents(
        data.componentes,
        rowNumber,
      );

      const normalizedCode =
        normalizeCode(
          data.code,
        );

      const previousRow =
        importedCodes.get(
          normalizedCode,
        );

      if (
        previousRow !==
        undefined
      ) {
        throw new Error(
          `El código ${data.code} aparece repetido en las filas ${previousRow} y ${rowNumber}.`,
        );
      }

      importedCodes.set(
        normalizedCode,
        rowNumber,
      );

      const existingId =
        existingCodes.get(
          normalizedCode,
        );

      /*
       * ======================================================
       * CREAR
       * ======================================================
       */

      if (
        action ===
        "CREAR"
      ) {
        if (
          !data.IdProductor
        ) {
          throw new Error(
            `Fila ${rowNumber}: CREAR requiere IdProductor.`,
          );
        }

        if (existingId) {
          throw new Error(
            `Fila ${rowNumber}: ya existe el código ${data.code}.`,
          );
        }

        operations.push({
          action,
          data,
          rowNumber,
        });

        created += 1;

        continue;
      }

      /*
       * ======================================================
       * ACTUALIZAR
       * ======================================================
       */

      if (!id) {
        throw new Error(
          `Fila ${rowNumber}: ACTUALIZAR requiere un ID.`,
        );
      }

      if (
        !existingById.has(id)
      ) {
        throw new Error(
          `Fila ${rowNumber}: no existe el producto con ID ${id}.`,
        );
      }

      if (
        existingId &&
        existingId !== id
      ) {
        throw new Error(
          `Fila ${rowNumber}: ya existe otro producto con el código ${data.code}.`,
        );
      }

      operations.push({
        action,
        id,
        data,
        rowNumber,
      });

      updated += 1;
    }

    /*
     * ========================================================
     * VALIDAR PRODUCTORES
     * ========================================================
     */

    for (
      const [
        productorId,
        rowNumber,
      ] of productorRows
    ) {
      await validateProductor(
        productorId,
        rowNumber,
      );
    }

    /*
     * ========================================================
     * FIRESTORE BATCH
     * ========================================================
     */

    const batch =
      adminDb.batch();

    for (
      const operation of operations
    ) {
      /*
       * ======================================================
       * ELIMINAR
       * ======================================================
       *
       * Se mantiene como eliminación lógica.
       */

      if (
        operation.action ===
        "ELIMINAR"
      ) {
        const ref =
          collection.doc(
            operation.id!,
          );

        batch.update(
          ref,
          {
            activo: false,

            /*
             * Se mantiene el nombre
             * existente utilizado por
             * esta API.
             */
            fechaCierre:
              FieldValue.serverTimestamp(),

            ultimaActualizacion:
              FieldValue.serverTimestamp(),
          },
        );

        continue;
      }

      /*
       * ======================================================
       * CREAR
       * ======================================================
       */

      if (
        operation.action ===
        "CREAR"
      ) {
        const ref =
          collection.doc();

        const data =
          operation.data!;

        const createData:
          Record<
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

          componentes:
            data.componentes,

          fechaCreacion:
            FieldValue.serverTimestamp(),

          ultimaActualizacion:
            FieldValue.serverTimestamp(),

          fechaCierre:
            null,
        };

        batch.set(
          ref,
          createData,
        );

        continue;
      }

      /*
       * ======================================================
       * ACTUALIZAR
       * ======================================================
       */

      const ref =
        collection.doc(
          operation.id!,
        );

      const data =
        operation.data!;

      const updateData:
        Record<
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

        IdMunicipalidad:
          data.IdMunicipalidad,

        componentes:
          data.componentes,

        ultimaActualizacion:
          FieldValue.serverTimestamp(),
      };

      /*
       * Si el Excel trae productor,
       * se actualiza.
       *
       * Si no lo trae, se conserva
       * el productor existente.
       */
      if (
        data.IdProductor
      ) {
        updateData.IdProductor =
          data.IdProductor;
      } else {
        const currentProduct =
          existingById.get(
            operation.id!,
          );

        const currentData =
          currentProduct?.data() ??
          {};

        if (
          currentData.IdProductor
        ) {
          updateData.IdProductor =
            currentData.IdProductor;
        }
      }

      /*
       * Control de FechaCierre.
       *
       * Se conserva la misma lógica
       * utilizada por el endpoint individual.
       */
      const currentProduct =
        existingById.get(
          operation.id!,
        );

      const currentData =
        currentProduct?.data() ??
        {};

      const previousActivo =
        currentData.activo !== false;

      if (
        previousActivo === true &&
        data.activo === false
      ) {
        updateData.FechaCierre =
          FieldValue.serverTimestamp();
      } else if (
        previousActivo === false &&
        data.activo === true
      ) {
        updateData.FechaCierre =
          null;
      }

      batch.update(
        ref,
        updateData,
      );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,

      data: {
        created,
        updated,
        deleted,
      },
    });
  } catch (error) {
    return errorResponse(
      error,
    );
  }
}