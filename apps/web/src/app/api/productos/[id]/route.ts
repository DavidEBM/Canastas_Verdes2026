import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "productos";

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;
const MAX_TEXT_LENGTH = 500;

type ProductInput = {
  code?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  stock?: unknown;
  categoria?: unknown;
  unidad?: unknown;
  imgPath?: unknown;
  imageName?: unknown;
  activo?: unknown;
  IdGranja?: unknown;
  IdMunicipalidad?: unknown;
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

function numeric(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return Number(value);
  }

  return NaN;
}

function normalizeProduct(
  input: ProductInput,
) {
  const code = text(
    input.code,
    MAX_CODE_LENGTH,
  );

  const nombre = text(
    input.nombre,
    MAX_NAME_LENGTH,
  );

  const precio = numeric(input.precio);
  const stock = numeric(input.stock);

  if (
    !code ||
    !nombre ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error("INVALID_PRODUCT");
  }

  return {
    code,
    nombre,
    descripcion: text(input.descripcion),
    precio,
    stock,
    categoria: text(input.categoria),
    unidad: text(input.unidad),
    imgPath: text(input.imgPath),
    imageName: text(input.imageName),
    activo:
      input.activo !== false &&
      input.activo !== "false",
    IdGranja: text(input.IdGranja),
    IdMunicipalidad: text(
      input.IdMunicipalidad,
    ),
  };
}

function errorResponse(error: unknown) {
  if (
    error instanceof Error &&
    error.message === "AUTH_REQUIRED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Debes iniciar sesión para realizar esta acción.",
      },
      { status: 401 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "USER_NOT_FOUND"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "No existe un registro de usuario para esta cuenta.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "USER_INVALID"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La información del usuario no es válida.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "ADMIN_REQUIRED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Solo un administrador puede gestionar productos.",
      },
      { status: 403 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "INVALID_PRODUCT"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Cada producto requiere código, nombre, precio y stock válidos.",
      },
      { status: 400 },
    );
  }

  if (
    error instanceof Error &&
    error.message === "INVALID_ID"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Identificador de producto inválido.",
      },
      { status: 400 },
    );
  }

  console.error(
    "Error administrando producto:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      message:
        "No fue posible procesar el producto.",
    },
    { status: 500 },
  );
}

function validateId(id: string) {
  if (
    !id ||
    id.length > 200 ||
    id.includes("/") ||
    id.includes("\\")
  ) {
    throw new Error("INVALID_ID");
  }
}

/* =========================================================
   PUT
   Editar producto
========================================================= */

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    /*
     * IMPORTANTE:
     *
     * requireAdmin verifica:
     *
     * Firebase Authentication
     * +
     * usuarios/{uid}.Rol === "admin"
     *
     * No utiliza decoded.role.
     */
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      throw new Error("INVALID_PRODUCT");
    }

    const data = normalizeProduct(
      body as ProductInput,
    );

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const current = await ref.get();

    if (!current.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Producto no encontrado.",
        },
        { status: 404 },
      );
    }

    /*
     * Evitar códigos duplicados.
     */
    const existing =
      await adminDb
        .collection(COLLECTION)
        .get();

    const normalizedCode =
      data.code.toLowerCase();

    const duplicate =
      existing.docs.some((document) => {
        if (document.id === id) {
          return false;
        }

        const existingCode =
          document.data().code;

        return (
          text(existingCode).toLowerCase() ===
          normalizedCode
        );
      });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe otro producto con ese código.",
        },
        { status: 409 },
      );
    }

    await ref.update({
      ...data,
      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...data,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/* =========================================================
   DELETE
   Desactivar producto
========================================================= */

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    validateId(id);

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const current = await ref.get();

    if (!current.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Producto no encontrado.",
        },
        { status: 404 },
      );
    }

    await ref.update({
      activo: false,
      fechaCierre:
        FieldValue.serverTimestamp(),
      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Producto desactivado correctamente.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}