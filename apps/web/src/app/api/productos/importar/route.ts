import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COLLECTION = "productos";
const MAX_ROWS = 400;

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;
const MAX_TEXT_LENGTH = 500;

type Action =
  | "CREAR"
  | "ACTUALIZAR"
  | "ELIMINAR";

type ProductRow = Record<string, unknown>;

function text(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function tokenFrom(
  request: Request,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

async function requireAdmin(
  request: Request,
) {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  const decoded =
    await adminAuth.verifyIdToken(token);

  if (decoded.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

function getAction(
  value: unknown,
): Action {
  const normalized = text(value).toUpperCase();

  if (
    normalized === "CREAR" ||
    normalized === "ACTUALIZAR" ||
    normalized === "ELIMINAR"
  ) {
    return normalized;
  }

  throw new Error(
    `Acción inválida: "${text(value) || "vacía"}". Usa CREAR, ACTUALIZAR o ELIMINAR.`,
  );
}

function normalizeProduct(
  row: ProductRow,
  rowNumber: number,
) {
  const code = text(
    row.code,
    MAX_CODE_LENGTH,
  );

  const nombre = text(
    row.nombre,
    MAX_NAME_LENGTH,
  );

  const precio =
    typeof row.precio === "number"
      ? row.precio
      : Number(row.precio);

  const stock =
    typeof row.stock === "number"
      ? row.stock
      : Number(row.stock);

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

  return {
    code,
    nombre,
    descripcion: text(row.descripcion),
    precio,
    stock,
    categoria: text(row.categoria),
    unidad: text(row.unidad),
    imgPath: text(row.imgPath),
    imageName: text(row.imageName),
    activo:
      row.activo !== false &&
      row.activo !== "false" &&
      row.activo !== "FALSE" &&
      row.activo !== 0 &&
      row.activo !== "0",
    IdGranja: text(row.IdGranja),
    IdMunicipalidad: text(
      row.IdMunicipalidad,
    ),
  };
}

function errorResponse(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message === "NO_AUTH"
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "FORBIDDEN"
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
        message: error.message,
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
      (body as { rows?: unknown }).rows;

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

    if (rows.length > MAX_ROWS) {
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
      adminDb.collection(COLLECTION);

    const snapshot =
      await collection.get();

    const existingById =
      new Map(
        snapshot.docs.map(
          (document) => [
            document.id,
            document,
          ],
        ),
      );

    const existingCodes =
      new Map<string, string>();

    for (const document of snapshot.docs) {
      const code = text(
        document.data().code,
        MAX_CODE_LENGTH,
      ).toLowerCase();

      if (code) {
        existingCodes.set(
          code,
          document.id,
        );
      }
    }

    /*
     * También controlamos códigos repetidos
     * dentro del mismo Excel antes de ejecutar
     * cualquier operación.
     */
    const importedCodes =
      new Map<string, number>();

    const operations: Array<{
      action: Action;
      id?: string;
      data?: ReturnType<
        typeof normalizeProduct
      >;
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
      const raw = rows[index];

      const rowNumber = index + 2;

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

      const operation =
        getAction(row.accion);

      const id = text(row.id);

      if (
        operation === "ELIMINAR"
      ) {
        if (
          !id ||
          !existingById.has(id)
        ) {
          throw new Error(
            `Fila ${rowNumber}: el ID indicado no corresponde a un producto existente.`,
          );
        }

        operations.push({
          action: operation,
          id,
          rowNumber,
        });

        deleted += 1;
        continue;
      }

      const data =
        normalizeProduct(
          row,
          rowNumber,
        );

      const normalizedCode =
        data.code.toLowerCase();

      const importedRow =
        importedCodes.get(
          normalizedCode,
        );

      if (
        importedRow !== undefined
      ) {
        throw new Error(
          `El código ${data.code} aparece repetido en las filas ${importedRow} y ${rowNumber}.`,
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

      if (
        operation === "CREAR"
      ) {
        if (existingId) {
          throw new Error(
            `Fila ${rowNumber}: ya existe el código ${data.code}.`,
          );
        }

        operations.push({
          action: operation,
          data,
          rowNumber,
        });

        created += 1;
        continue;
      }

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
        action: operation,
        id,
        data,
        rowNumber,
      });

      updated += 1;
    }

    /*
     * Firestore Batch permite hasta 500 operaciones.
     * MAX_ROWS está limitado a 400, por lo que
     * todas las operaciones pueden ejecutarse
     * de forma atómica en un único batch.
     */
    const batch =
      adminDb.batch();

    for (const operation of operations) {
      if (
        operation.action ===
        "ELIMINAR"
      ) {
        const ref =
          collection.doc(
            operation.id!,
          );

        batch.update(ref, {
          activo: false,
          fechaCierre:
            FieldValue.serverTimestamp(),
          ultimaActualizacion:
            FieldValue.serverTimestamp(),
        });

        continue;
      }

      if (
        operation.action === "CREAR"
      ) {
        const ref =
          collection.doc();

        batch.set(ref, {
          ...operation.data,
          fechaCreacion:
            FieldValue.serverTimestamp(),
          ultimaActualizacion:
            FieldValue.serverTimestamp(),
          fechaCierre: null,
        });

        continue;
      }

      const ref =
        collection.doc(
          operation.id!,
        );

      batch.update(ref, {
        ...operation.data,
        ultimaActualizacion:
          FieldValue.serverTimestamp(),
      });
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
    return errorResponse(error);
  }
}

