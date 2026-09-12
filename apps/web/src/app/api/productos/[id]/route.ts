import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COLLECTION = "productos";
const PRODUCTORES_COLLECTION = "productores";

type ProductInput = {
  code?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  stock?: unknown;

  costoPcc?: unknown;
  porcentajeLogistica?: unknown;
  porcentajeTransporte?: unknown;
  precioSugerido?: unknown;
  precioVenta?: unknown;

  categoria?: unknown;
  unidad?: unknown;
  imgPath?: unknown;
  imageName?: unknown;
  activo?: unknown;

  IdProductor?: unknown;
  IdMunicipalidad?: unknown;

  componentes?: unknown;
};

type CanastaComponent = {
  productoId: string;
  cantidad: number;
};

class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/*
 * ============================================================
 * AUTORIZACIÓN
 * ============================================================
 */
async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new AuthError("No autorizado", 401);
  }

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new AuthError("No autorizado", 401);
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw new AuthError("Token no proporcionado", 401);
  }

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "Error verificando Firebase ID token:",
      error,
    );

    throw new AuthError(
      "Token inválido o expirado",
      401,
    );
  }

  /*
   * Custom Claim.
   */
  if (decoded.role === "admin") {
    return decoded;
  }

  /*
   * Firestore.
   */
  const userDoc = await adminDb
    .collection("usuarios")
    .doc(decoded.uid)
    .get();

  if (!userDoc.exists) {
    throw new AuthError(
      "Perfil de usuario no encontrado",
      403,
    );
  }

  const userData = userDoc.data();

  const firestoreRole =
    userData?.Rol ??
    userData?.role;

  if (
    typeof firestoreRole !== "string" ||
    firestoreRole.trim().toLowerCase() !== "admin"
  ) {
    throw new AuthError(
      "Acceso denegado",
      403,
    );
  }

  return decoded;
}

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */
function text(
  value: unknown,
  maxLength = 500,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function numberValue(
  value: unknown,
  defaultValue = 0,
): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  /*
   * Permite valores como:
   * "200"
   * "200 COP"
   * "2"
   * "2%"
   *
   * Para porcentajes se utiliza específicamente
   * mixedCostValue().
   */
  if (typeof value === "string") {
    const cleaned = value
      .trim()
      .replace(/COP/gi, "")
      .replace(/%/g, "")
      .replace(/\$/g, "")
      .replace(/\s/g, "")
      .replace(/,/g, "");

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : defaultValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
}

/*
 * ============================================================
 * COSTOS MIXTOS
 * ============================================================
 *
 * Firebase puede contener actualmente valores como:
 *
 *   2      -> 2%
 *   "2"    -> 2%
 *   "2%"   -> 2%
 *
 * y también:
 *
 *   200    -> $200 COP fijo
 *   "200"  -> $200 COP fijo
 *
 * No podemos determinar matemáticamente si un número como
 * 50 significa 50% o $50 COP, por lo que NO hacemos ninguna
 * conversión automática.
 *
 * Lo importante es que:
 *   - el valor se conserva;
 *   - no se rechaza por ser > 100;
 *   - una edición de otro campo no falla por ese valor.
 */
function mixedCostValue(
  value: unknown,
  fieldName: string,
): number {
  const parsed = numberValue(value, 0);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${fieldName} debe ser un valor numérico mayor o igual a 0.`,
    );
  }

  return parsed;
}

/*
 * ============================================================
 * COMPONENTES DE CANASTA
 * ============================================================
 */
function normalizeComponents(
  value: unknown,
): CanastaComponent[] {
  if (
    value === undefined ||
    value === null
  ) {
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
        component as Record<
          string,
          unknown
        >;

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

/*
 * ============================================================
 * VALIDAR COMPONENTES
 * ============================================================
 */
async function validateComponents(
  componentes: CanastaComponent[],
  productId?: string,
) {
  for (const component of componentes) {
    if (
      productId &&
      component.productoId === productId
    ) {
      throw new Error(
        "Una canasta no puede contenerse a sí misma.",
      );
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .doc(component.productoId)
      .get();

    if (!snapshot.exists) {
      throw new Error(
        `El producto "${component.productoId}" utilizado como componente no existe.`,
      );
    }
  }
}

/*
 * ============================================================
 * NORMALIZAR PRODUCTO COMPLETO
 * ============================================================
 */
function normalizeProduct(
  data: ProductInput,
) {
  const code = text(
    data.code,
    50,
  ).toUpperCase();

  const nombre = text(
    data.nombre,
    150,
  );

  const descripcion = text(
    data.descripcion,
    500,
  );

  const precio = numberValue(
    data.precio,
  );

  const stock = numberValue(
    data.stock,
  );

  const costoPcc = numberValue(
    data.costoPcc,
  );

  /*
   * IMPORTANTE:
   * Ya no se exige <= 100 porque Firebase puede contener
   * costos fijos expresados en COP.
   */
  const porcentajeLogistica =
    mixedCostValue(
      data.porcentajeLogistica,
      "El costo de logística",
    );

  const porcentajeTransporte =
    mixedCostValue(
      data.porcentajeTransporte,
      "El costo de transporte",
    );

  const precioSugerido =
    numberValue(
      data.precioSugerido,
    );

  const precioVenta =
    numberValue(
      data.precioVenta,
    );

  const categoria = text(
    data.categoria,
    200,
  );

  const unidad = text(
    data.unidad,
    100,
  );

  const imgPath = text(
    data.imgPath,
    500,
  );

  const imageName = text(
    data.imageName,
    255,
  );

  const IdProductor = text(
    data.IdProductor,
    200,
  );

  const IdMunicipalidad =
    text(
      data.IdMunicipalidad,
      200,
    );

  const activo =
    typeof data.activo === "boolean"
      ? data.activo
      : data.activo === "false" ||
          data.activo === "FALSE" ||
          data.activo === 0 ||
          data.activo === "0"
        ? false
        : true;

  const componentes =
    normalizeComponents(
      data.componentes,
    );

  return {
    code,
    nombre,
    descripcion,
    precio,
    stock,

    costoPcc,
    porcentajeLogistica,
    porcentajeTransporte,
    precioSugerido,
    precioVenta,

    categoria,
    unidad,
    imgPath,
    imageName,
    activo,

    IdProductor,
    IdMunicipalidad,

    componentes,
  };
}

/*
 * ============================================================
 * VALIDAR PRODUCTOR
 * ============================================================
 */
async function validateProductor(
  IdProductor: string,
) {
  if (!IdProductor) {
    throw new Error(
      "El productor es obligatorio",
    );
  }

  const productorRef = adminDb
    .collection(
      PRODUCTORES_COLLECTION,
    )
    .doc(IdProductor);

  const productorSnap =
    await productorRef.get();

  if (!productorSnap.exists) {
    throw new Error(
      "El productor seleccionado no existe",
    );
  }

  const productor =
    productorSnap.data();

  if (productor?.activo === false) {
    throw new Error(
      "El productor seleccionado está inactivo",
    );
  }
}

/*
 * ============================================================
 * VALIDAR PRODUCTO COMPLETO
 * ============================================================
 */
async function validateProduct(
  data: ProductInput,
  productId?: string,
) {
  const product =
    normalizeProduct(data);

  if (!product.code) {
    throw new Error(
      "El código del producto es obligatorio",
    );
  }

  if (!product.nombre) {
    throw new Error(
      "El nombre del producto es obligatorio",
    );
  }

  if (
    !Number.isFinite(product.precio) ||
    product.precio < 0
  ) {
    throw new Error(
      "El precio no es válido",
    );
  }

  if (
    !Number.isFinite(product.stock) ||
    !Number.isInteger(product.stock) ||
    product.stock < 0
  ) {
    throw new Error(
      "El stock no es válido",
    );
  }

  if (product.costoPcc < 0) {
    throw new Error(
      "El costo PCC no es válido",
    );
  }

  if (product.precioSugerido < 0) {
    throw new Error(
      "El precio sugerido no es válido",
    );
  }

  if (product.precioVenta < 0) {
    throw new Error(
      "El precio de venta no es válido",
    );
  }

  await validateProductor(
    product.IdProductor,
  );

  /*
   * Solo exigimos componentes cuando realmente
   * el producto es una canasta.
   */
  if (
    product.categoria
      .trim()
      .toLowerCase() ===
    "canasta"
  ) {
    if (
      product.componentes.length === 0
    ) {
      throw new Error(
        "Una canasta debe tener al menos un producto componente.",
      );
    }

    await validateComponents(
      product.componentes,
      productId,
    );
  }

  const productsSnapshot =
    await adminDb
      .collection(COLLECTION)
      .where(
        "code",
        "==",
        product.code,
      )
      .get();

  const duplicate =
    productsSnapshot.docs.find(
      (doc) =>
        doc.id !== productId,
    );

  if (duplicate) {
    throw new Error(
      `Ya existe un producto con el código ${product.code}`,
    );
  }

  return product;
}

/*
 * ============================================================
 * NORMALIZAR PATCH
 * ============================================================
 *
 * Esta función SOLO procesa los campos realmente enviados.
 *
 * Esto evita que un producto antiguo con:
 *
 *   porcentajeLogistica: 200
 *
 * falle cuando solamente se modifica:
 *
 *   stock: 50
 */
function normalizePartialPatch(
  data: ProductInput,
): Record<string, unknown> {
  const patch: Record<
    string,
    unknown
  > = {};

  if ("code" in data) {
    const code = text(
      data.code,
      50,
    ).toUpperCase();

    if (!code) {
      throw new Error(
        "El código del producto no puede estar vacío.",
      );
    }

    patch.code = code;
  }

  if ("nombre" in data) {
    const nombre = text(
      data.nombre,
      150,
    );

    if (!nombre) {
      throw new Error(
        "El nombre del producto no puede estar vacío.",
      );
    }

    patch.nombre = nombre;
  }

  if ("descripcion" in data) {
    patch.descripcion = text(
      data.descripcion,
      500,
    );
  }

  if ("precio" in data) {
    const precio =
      numberValue(data.precio);

    if (precio < 0) {
      throw new Error(
        "El precio no es válido.",
      );
    }

    patch.precio = precio;
  }

  if ("stock" in data) {
    const stock =
      numberValue(data.stock);

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      throw new Error(
        "El stock no es válido.",
      );
    }

    patch.stock = stock;
  }

  if ("costoPcc" in data) {
    const costoPcc =
      numberValue(
        data.costoPcc,
      );

    if (costoPcc < 0) {
      throw new Error(
        "El costo PCC no es válido.",
      );
    }

    patch.costoPcc = costoPcc;
  }

  if (
    "porcentajeLogistica" in
    data
  ) {
    patch.porcentajeLogistica =
      mixedCostValue(
        data.porcentajeLogistica,
        "El costo de logística",
      );
  }

  if (
    "porcentajeTransporte" in
    data
  ) {
    patch.porcentajeTransporte =
      mixedCostValue(
        data.porcentajeTransporte,
        "El costo de transporte",
      );
  }

  if ("precioSugerido" in data) {
    const precioSugerido =
      numberValue(
        data.precioSugerido,
      );

    if (precioSugerido < 0) {
      throw new Error(
        "El precio sugerido no es válido.",
      );
    }

    patch.precioSugerido =
      precioSugerido;
  }

  if ("precioVenta" in data) {
    const precioVenta =
      numberValue(
        data.precioVenta,
      );

    if (precioVenta < 0) {
      throw new Error(
        "El precio de venta no es válido.",
      );
    }

    patch.precioVenta =
      precioVenta;
  }

  if ("categoria" in data) {
    const categoria =
      text(
        data.categoria,
        200,
      );

    if (!categoria) {
      throw new Error(
        "La categoría no puede estar vacía.",
      );
    }

    patch.categoria =
      categoria;
  }

  if ("unidad" in data) {
    patch.unidad = text(
      data.unidad,
      100,
    );
  }

  if ("imgPath" in data) {
    patch.imgPath = text(
      data.imgPath,
      500,
    );
  }

  if ("imageName" in data) {
    patch.imageName = text(
      data.imageName,
      255,
    );
  }

  if ("activo" in data) {
    if (
      typeof data.activo ===
      "boolean"
    ) {
      patch.activo =
        data.activo;
    } else {
      patch.activo =
        !(
          data.activo ===
            "false" ||
          data.activo ===
            "FALSE" ||
          data.activo ===
            0 ||
          data.activo ===
            "0"
        );
    }
  }

  if ("IdProductor" in data) {
    const IdProductor =
      text(
        data.IdProductor,
        200,
      );

    if (!IdProductor) {
      throw new Error(
        "El productor es obligatorio.",
      );
    }

    patch.IdProductor =
      IdProductor;
  }

  if (
    "IdMunicipalidad" in
    data
  ) {
    const IdMunicipalidad =
      text(
        data.IdMunicipalidad,
        200,
      );

    if (!IdMunicipalidad) {
      throw new Error(
        "La municipalidad es obligatoria.",
      );
    }

    patch.IdMunicipalidad =
      IdMunicipalidad;
  }

  if ("componentes" in data) {
    patch.componentes =
      normalizeComponents(
        data.componentes,
      );
  }

  return patch;
}

/*
 * ============================================================
 * VALIDAR ACTUALIZACIÓN PARCIAL
 * ============================================================
 */
async function validatePartialProduct(
  data: ProductInput,
  existingData: FirebaseFirestore.DocumentData,
  productId: string,
) {
  /*
   * IMPORTANTE:
   *
   * No hacemos:
   *
   *   {...existingData, ...data}
   *
   * seguido de validateProduct().
   *
   * Eso hacía que un campo antiguo inválido
   * bloqueara modificaciones completamente
   * independientes.
   */
  const patch =
    normalizePartialPatch(
      data,
    );

  /*
   * Productor solamente si fue modificado.
   */
  if (
    "IdProductor" in patch
  ) {
    await validateProductor(
      String(
        patch.IdProductor,
      ),
    );
  }

  /*
   * Código solamente si fue modificado.
   */
  if ("code" in patch) {
    const productsSnapshot =
      await adminDb
        .collection(COLLECTION)
        .where(
          "code",
          "==",
          patch.code,
        )
        .get();

    const duplicate =
      productsSnapshot.docs.find(
        (doc) =>
          doc.id !== productId,
      );

    if (duplicate) {
      throw new Error(
        `Ya existe un producto con el código ${patch.code}`,
      );
    }
  }

  /*
   * ========================================================
   * VALIDACIÓN DE CANASTAS
   * ========================================================
   *
   * Para saber si una actualización parcial necesita
   * componentes, solamente combinamos los campos
   * relacionados con la canasta.
   */
  const currentCategory =
    text(
      existingData.categoria,
      200,
    );

  const newCategory =
    "categoria" in patch
      ? text(
          patch.categoria,
          200,
        )
      : currentCategory;

  const currentComponents =
    "componentes" in existingData
      ? normalizeComponents(
          existingData.componentes,
        )
      : [];

  const newComponents =
    "componentes" in patch
      ? (patch.componentes as CanastaComponent[])
      : currentComponents;

  const isCanasta =
    newCategory
      .trim()
      .toLowerCase() ===
    "canasta";

  if (isCanasta) {
    if (
      newComponents.length === 0
    ) {
      throw new Error(
        "Una canasta debe tener al menos un producto componente.",
      );
    }

    /*
     * Validamos componentes si:
     *
     * - se modificaron;
     * - o se cambió la categoría a Canasta.
     */
    if (
      "componentes" in patch ||
      (
        "categoria" in patch &&
        currentCategory
          .trim()
          .toLowerCase() !==
          "canasta"
      )
    ) {
      await validateComponents(
        newComponents,
        productId,
      );
    }
  }

  return patch;
}

/*
 * ============================================================
 * GET
 * ============================================================
 */
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
    const { id } =
      await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "ID del producto requerido",
        },
        {
          status: 400,
        },
      );
    }

    const productSnap =
      await adminDb
        .collection(COLLECTION)
        .doc(id)
        .get();

    if (!productSnap.exists) {
      return NextResponse.json(
        {
          error:
            "Producto no encontrado",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      id: productSnap.id,
      ...productSnap.data(),
    });
  } catch (error) {
    console.error(
      "GET /api/productos/[id]:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ============================================================
 * PUT
 * ============================================================
 *
 * Soporta:
 *
 * 1. Edición completa.
 * 2. Edición parcial.
 *
 * La edición parcial NO valida campos que no fueron enviados.
 */
export async function PUT(
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
    await requireAdmin(request);

    const { id } =
      await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "ID del producto requerido",
        },
        {
          status: 400,
        },
      );
    }

    const productRef =
      adminDb
        .collection(COLLECTION)
        .doc(id);

    const existingSnap =
      await productRef.get();

    if (!existingSnap.exists) {
      return NextResponse.json(
        {
          error:
            "Producto no encontrado",
        },
        {
          status: 404,
        },
      );
    }

    const existingData =
      existingSnap.data() ?? {};

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error:
            "Los datos enviados no son válidos",
        },
        {
          status: 400,
        },
      );
    }

    const bodyData =
      body as ProductInput;

    /*
     * Determinar si se trata de una edición
     * completa.
     */
    const hasAllRequiredFields =
      bodyData.code !==
        undefined &&
      bodyData.nombre !==
        undefined &&
      bodyData.precio !==
        undefined &&
      bodyData.stock !==
        undefined &&
      bodyData.categoria !==
        undefined &&
      bodyData.unidad !==
        undefined &&
      bodyData.IdProductor !==
        undefined &&
      bodyData.IdMunicipalidad !==
        undefined;

    let updateData:
      | Record<string, unknown>
      | ReturnType<
          typeof normalizeProduct
        >;

    if (hasAllRequiredFields) {
      /*
       * Edición completa.
       *
       * Aquí sí normalizamos todo lo recibido.
       * Los costos mixtos se aceptan sin exigir <=100.
       */
      updateData =
        await validateProduct(
          bodyData,
          id,
        );
    } else {
      /*
       * Edición parcial.
       *
       * Solamente se validan los campos enviados.
       */
      updateData =
        await validatePartialProduct(
          bodyData,
          existingData,
          id,
        );
    }

    /*
     * ========================================================
     * CONTROL DE FECHA DE CLAUSURA
     * ========================================================
     */
    const previousActivo =
      existingData.activo !== false;

    const newActivo =
      "activo" in updateData
        ? Boolean(
            updateData.activo,
          )
        : previousActivo;

    let fechaCierre:
      | FirebaseFirestore.FieldValue
      | null
      | undefined;

    if (
      previousActivo === true &&
      newActivo === false
    ) {
      fechaCierre =
        FieldValue.serverTimestamp();
    } else if (
      previousActivo === false &&
      newActivo === true
    ) {
      fechaCierre = null;
    }

    /*
     * ========================================================
     * ACTUALIZACIÓN
     * ========================================================
     *
     * Para una edición parcial usamos updateData
     * directamente.
     *
     * Esto evita reescribir campos antiguos que no fueron
     * modificados.
     */
    await productRef.update({
      ...updateData,

      ...(fechaCierre !==
      undefined
        ? {
            FechaCierre:
              fechaCierre,
          }
        : {}),

      ultimaActualizacion:
        FieldValue.serverTimestamp(),
    });

    const updatedSnap =
      await productRef.get();

    return NextResponse.json({
      ok: true,

      product: {
        id: updatedSnap.id,
        ...updatedSnap.data(),
      },
    });
  } catch (error) {
    console.error(
      "PUT /api/productos/[id]:",
      error,
    );

    if (
      error instanceof AuthError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno",
      },
      {
        status: 400,
      },
    );
  }
}

/*
 * ============================================================
 * DELETE
 * ============================================================
 *
 * Eliminación REAL del documento.
 */
export async function DELETE(
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
    await requireAdmin(
      request,
    );

    const { id } =
      await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "ID del producto requerido",
        },
        {
          status: 400,
        },
      );
    }

    const productRef =
      adminDb
        .collection(COLLECTION)
        .doc(id);

    const productSnap =
      await productRef.get();

    if (!productSnap.exists) {
      return NextResponse.json(
        {
          error:
            "Producto no encontrado",
        },
        {
          status: 404,
        },
      );
    }

    await productRef.delete();

    return NextResponse.json({
      ok: true,

      message:
        "Producto eliminado correctamente",

      id,
    });
  } catch (error) {
    console.error(
      "DELETE /api/productos/[id]:",
      error,
    );

    if (
      error instanceof AuthError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno al eliminar el producto",
      },
      {
        status: 500,
      },
    );
  }
}