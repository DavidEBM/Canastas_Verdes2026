import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const PRODUCTS_COLLECTION = "productos";
const PRODUCERS_COLLECTION = "productores";
const MUNICIPALITIES_COLLECTION = "municipalidades";

const MAX_ROWS = 500;
const MAX_COMPONENT_ROWS = 1500;

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 150;
const MAX_TEXT_LENGTH = 500;

const CANASTA_CATEGORY = "Canasta";

type ExcelRow = Record<string, unknown>;

type NormalizedRow = {
  code: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;
  precioSugerido: number;
  precioVenta: number;
  stock: number;
  categoria: string;
  unidad: string;
  nombreProductor: string;
  nombreMunicipio: string;
  activo: boolean;
};

type ComponentRow = {
  codigoCanasta: string;
  producto: string;
  cantidad: number;
  rowNumber: number;
};

type ComponentReference = {
  productoId: string;
  cantidad: number;
};

type ProductDocument = {
  id: string;
  data: FirebaseFirestore.DocumentData;
};

type ResolvedProduct = {
  row: NormalizedRow;
  rowNumber: number;
  productorId: string;
  municipioId: string;
};

type ImportOperation = {
  type: "CREATE" | "UPDATE" | "DEACTIVATE";
  id: string;
  row: ResolvedProduct;
};

function text(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeCode(value: unknown): string {
  return text(value, MAX_CODE_LENGTH).toUpperCase();
}

function normalizeName(value: unknown): string {
  return text(value, MAX_NAME_LENGTH)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : defaultValue;
  }

  let normalized = String(value)
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/COP/gi, "");

  if (!normalized) {
    return defaultValue;
  }

  if (
    normalized.includes(".") &&
    normalized.includes(",")
  ) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  } else if (normalized.includes(".")) {
    const parts = normalized.split(".");

    if (
      parts.length > 1 &&
      parts.slice(1).every(
        (part) => /^\d{3}$/.test(part),
      )
    ) {
      normalized = normalized.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
}

function percentageValue(
  value: unknown,
  fieldName: string,
  rowNumber: number,
): number {
  const parsed = numberValue(value, 0);

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

function booleanValue(
  value: unknown,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    [
      "no",
      "false",
      "0",
      "inactivo",
      "inactiva",
    ].includes(normalized)
  ) {
    return false;
  }

  return true;
}

/**
 * Excel:
 * Cantidad = 200
 * Unidad = gr
 *
 * Firestore:
 * unidad = "200 x gr"
 */
function buildUnidad(
  row: ExcelRow,
): string {
  const unidad = text(
    row.Unidad ??
      row.unidad,
    100,
  );

  const cantidadRaw =
    row.Cantidad ??
    row.cantidad;

  const cantidad =
    cantidadRaw === null ||
    cantidadRaw === undefined ||
    String(cantidadRaw).trim() === ""
      ? ""
      : text(cantidadRaw, 50);

  if (cantidad && unidad) {
    return `${cantidad} x ${unidad}`;
  }

  if (unidad) {
    return unidad;
  }

  return cantidad;
}

function normalizeProductRow(
  row: ExcelRow,
  rowNumber: number,
  expectedCategory?: string,
): NormalizedRow {
  const code = normalizeCode(
    row.Codigo ??
      row.codigo ??
      row.code,
  );

  const nombre = text(
    row.Nombre ??
      row.nombre,
    MAX_NAME_LENGTH,
  );

  if (!code) {
    throw new Error(
      `Fila ${rowNumber}: el campo Codigo es obligatorio.`,
    );
  }

  if (!nombre) {
    throw new Error(
      `Fila ${rowNumber}: el campo Nombre es obligatorio.`,
    );
  }

  const precio = numberValue(
    row.Precio ??
      row.precio,
  );

  const costoPcc = numberValue(
    row.CostoPcc ??
      row.costoPcc,
  );

  const porcentajeLogistica =
    percentageValue(
      row.PorcentajeLogistica ??
        row.porcentajeLogistica,
      "el porcentaje de logística",
      rowNumber,
    );

  const porcentajeTransporte =
    percentageValue(
      row.PorcentajeTransporte ??
        row.porcentajeTransporte,
      "el porcentaje de transporte",
      rowNumber,
    );

  const precioSugerido =
    numberValue(
      row.PrecioSugerido ??
        row.precioSugerido,
    );

  const precioVenta =
    numberValue(
      row.PrecioVenta ??
        row.precioVenta,
    );

  const stock = numberValue(
    row.Stock ??
      row.stock,
  );

  if (
    !Number.isFinite(precio) ||
    precio < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: Precio no es válido.`,
    );
  }

  if (
    !Number.isFinite(costoPcc) ||
    costoPcc < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: CostoPcc no es válido.`,
    );
  }

  if (
    !Number.isFinite(precioSugerido) ||
    precioSugerido < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: PrecioSugerido no es válido.`,
    );
  }

  if (
    !Number.isFinite(precioVenta) ||
    precioVenta < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: PrecioVenta no es válido.`,
    );
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: Stock debe ser un número entero mayor o igual a 0.`,
    );
  }

  let categoria = text(
    row.Categoria ??
      row.categoria,
    200,
  );

  // En la hoja Canastas la categoría es implícita.
  if (expectedCategory) {
    categoria = expectedCategory;
  }

  if (!categoria) {
    throw new Error(
      `Fila ${rowNumber}: Categoria es obligatoria.`,
    );
  }

  const nombreProductor = text(
    row.NombreProductor ??
      row.nombreProductor,
    MAX_NAME_LENGTH,
  );

  const nombreMunicipio = text(
    row.NombreMunicipio ??
      row.nombreMunicipio,
    MAX_NAME_LENGTH,
  );

  if (!nombreProductor) {
    throw new Error(
      `Fila ${rowNumber}: NombreProductor es obligatorio.`,
    );
  }

  if (!nombreMunicipio) {
    throw new Error(
      `Fila ${rowNumber}: NombreMunicipio es obligatorio.`,
    );
  }

  return {
    code,
    nombre,
    descripcion: text(
      row.Descripcion ??
        row.descripcion,
    ),
    precio,
    costoPcc,
    porcentajeLogistica,
    porcentajeTransporte,
    precioSugerido,
    precioVenta,
    stock,
    categoria,
    unidad: buildUnidad(row),
    nombreProductor,
    nombreMunicipio,
    activo: booleanValue(
      row.Activo ??
        row.activo,
    ),
  };
}

function normalizeComponentRow(
  row: ExcelRow,
  rowNumber: number,
): ComponentRow {
  const codigoCanasta =
    normalizeCode(
      row.CodigoCanasta ??
        row.codigoCanasta ??
        row.Canasta,
    );

  const producto = text(
    row.Producto ??
      row.producto,
    MAX_NAME_LENGTH,
  );

  const cantidad = numberValue(
    row.Cantidad ??
      row.cantidad,
  );

  if (!codigoCanasta) {
    throw new Error(
      `Fila ${rowNumber}: CodigoCanasta es obligatorio en ComponentesCanastas.`,
    );
  }

  if (!producto) {
    throw new Error(
      `Fila ${rowNumber}: Producto es obligatorio en ComponentesCanastas.`,
    );
  }

  if (
    !Number.isInteger(cantidad) ||
    cantidad <= 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: Cantidad debe ser un entero mayor que 0.`,
    );
  }

  return {
    codigoCanasta,
    producto,
    cantidad,
    rowNumber,
  };
}

function sameNumber(
  a: number,
  b: number,
): boolean {
  return Math.abs(a - b) < 0.000001;
}

function getComparableProduct(
  data: FirebaseFirestore.DocumentData,
) {
  return {
    code: normalizeCode(data.code),
    nombre: text(
      data.nombre,
      MAX_NAME_LENGTH,
    ),
    descripcion: text(
      data.descripcion,
    ),
    precio: numberValue(
      data.precio,
    ),
    costoPcc: numberValue(
      data.costoPcc,
    ),
    porcentajeLogistica:
      numberValue(
        data.porcentajeLogistica,
      ),
    porcentajeTransporte:
      numberValue(
        data.porcentajeTransporte,
      ),
    precioSugerido:
      numberValue(
        data.precioSugerido,
      ),
    precioVenta:
      numberValue(
        data.precioVenta,
      ),
    stock: numberValue(
      data.stock,
    ),
    categoria: text(
      data.categoria,
      200,
    ),
    unidad: text(
      data.unidad,
      100,
    ),
    activo:
      data.activo !== false,
    IdProductor: text(
      data.IdProductor,
      200,
    ),
    IdMunicipalidad: text(
      data.IdMunicipalidad,
      200,
    ),
  };
}

function getExistingComponents(
  data: FirebaseFirestore.DocumentData,
): ComponentReference[] {
  if (
    !Array.isArray(
      data.componentes,
    )
  ) {
    return [];
  }

  return data.componentes
    .filter(
      (
        item: unknown,
      ): item is {
        productoId: string;
        cantidad: number;
      } =>
        !!item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (
          item as Record<
            string,
            unknown
          >
        ).productoId === "string",
    )
    .map((item) => ({
      productoId: text(
        item.productoId,
        200,
      ),
      cantidad: numberValue(
        item.cantidad,
      ),
    }));
}

function sameComponents(
  current: ComponentReference[],
  incoming: ComponentReference[],
): boolean {
  if (
    current.length !==
    incoming.length
  ) {
    return false;
  }

  const currentMap =
    new Map<string, number>();

  for (const item of current) {
    currentMap.set(
      item.productoId,
      item.cantidad,
    );
  }

  for (const item of incoming) {
    const currentQuantity =
      currentMap.get(
        item.productoId,
      );

    if (
      currentQuantity === undefined ||
      !sameNumber(
        currentQuantity,
        item.cantidad,
      )
    ) {
      return false;
    }
  }

  return true;
}

function sameProductData(
  current: FirebaseFirestore.DocumentData,
  incoming: NormalizedRow,
  productorId: string,
  municipioId: string,
  incomingComponents?: ComponentReference[],
): boolean {
  const existing =
    getComparableProduct(
      current,
    );

  const basicSame =
    existing.code ===
      incoming.code &&
    existing.nombre ===
      incoming.nombre &&
    existing.descripcion ===
      incoming.descripcion &&
    sameNumber(
      existing.precio,
      incoming.precio,
    ) &&
    sameNumber(
      existing.costoPcc,
      incoming.costoPcc,
    ) &&
    sameNumber(
      existing.porcentajeLogistica,
      incoming.porcentajeLogistica,
    ) &&
    sameNumber(
      existing.porcentajeTransporte,
      incoming.porcentajeTransporte,
    ) &&
    sameNumber(
      existing.precioSugerido,
      incoming.precioSugerido,
    ) &&
    sameNumber(
      existing.precioVenta,
      incoming.precioVenta,
    ) &&
    existing.stock ===
      incoming.stock &&
    normalizeName(
      existing.categoria,
    ) ===
      normalizeName(
        incoming.categoria,
      ) &&
    existing.unidad ===
      incoming.unidad &&
    existing.activo ===
      incoming.activo &&
    existing.IdProductor ===
      productorId &&
    existing.IdMunicipalidad ===
      municipioId;

  if (!basicSame) {
    return false;
  }

  if (
    normalizeName(
      incoming.categoria,
    ) !==
    normalizeName(
      CANASTA_CATEGORY,
    )
  ) {
    return true;
  }

  if (
    incomingComponents ===
    undefined
  ) {
    return true;
  }

  return sameComponents(
    getExistingComponents(
      current,
    ),
    incomingComponents,
  );
}

async function loadMunicipalityMap() {
  const snapshot =
    await adminDb
      .collection(
        MUNICIPALITIES_COLLECTION,
      )
      .get();

  const map = new Map<
    string,
    {
      id: string;
      nombre: string;
      activo: boolean;
    }[]
  >();

  for (
    const document of
      snapshot.docs
  ) {
    const data =
      document.data();

    const nombre = text(
      data.nombre ??
        data.Nombre ??
        data.nombreMunicipio ??
        data.NombreMunicipio,
      MAX_NAME_LENGTH,
    );

    if (!nombre) {
      continue;
    }

    const key =
      normalizeName(nombre);

    const list =
      map.get(key) ?? [];

    list.push({
      id: document.id,
      nombre,
      activo:
        data.activo !== false,
    });

    map.set(
      key,
      list,
    );
  }

  return map;
}

async function loadProducerMap() {
  const snapshot =
    await adminDb
      .collection(
        PRODUCERS_COLLECTION,
      )
      .get();

  const map = new Map<
    string,
    {
      id: string;
      nombre: string;
      activo: boolean;
    }[]
  >();

  for (
    const document of
      snapshot.docs
  ) {
    const data =
      document.data();

    const nombre = text(
      data.nombre ??
        data.Nombre ??
        data.nombreProductor ??
        data.NombreProductor,
      MAX_NAME_LENGTH,
    );

    if (!nombre) {
      continue;
    }

    const key =
      normalizeName(nombre);

    const list =
      map.get(key) ?? [];

    list.push({
      id: document.id,
      nombre,
      activo:
        data.activo !== false,
    });

    map.set(
      key,
      list,
    );
  }

  return map;
}

function resolveCatalogItem(
  map: Map<
    string,
    {
      id: string;
      nombre: string;
      activo: boolean;
    }[]
  >,
  nombre: string,
  tipo: string,
  rowNumber: number,
) {
  const key =
    normalizeName(nombre);

  const matches =
    map.get(key) ?? [];

  if (
    matches.length === 0
  ) {
    throw new Error(
      `Fila ${rowNumber}: no existe ${tipo} "${nombre}".`,
    );
  }

  if (
    matches.length > 1
  ) {
    throw new Error(
      `Fila ${rowNumber}: existen varios registros llamados "${nombre}". Debe corregirse el catálogo antes de importar.`,
    );
  }

  const item =
    matches[0];

  if (!item.activo) {
    throw new Error(
      `Fila ${rowNumber}: el ${tipo} "${item.nombre}" está inactivo.`,
    );
  }

  return item;
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
    [
      "USER_NOT_FOUND",
      "USER_INVALID",
      "ADMIN_REQUIRED",
    ].includes(
      error.message,
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
            "El formato de importación no es válido.",
        },
        { status: 400 },
      );
    }

    const payload =
      body as Record<
        string,
        unknown
      >;

    const productRows =
      Array.isArray(
        payload.productos,
      )
        ? payload.productos
        : Array.isArray(
              payload.rows,
            )
          ? payload.rows
          : [];

    const canastaRows =
      Array.isArray(
        payload.canastas,
      )
        ? payload.canastas
        : [];

    const componentRows =
      Array.isArray(
        payload.componentesCanastas,
      )
        ? payload.componentesCanastas
        : [];

    if (
      productRows.length === 0 &&
      canastaRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El archivo no contiene productos ni canastas.",
        },
        { status: 400 },
      );
    }

    if (
      productRows.length >
      MAX_ROWS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `El máximo de productos por importación es ${MAX_ROWS}.`,
        },
        { status: 400 },
      );
    }

    if (
      canastaRows.length >
      MAX_ROWS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `El máximo de canastas por importación es ${MAX_ROWS}.`,
        },
        { status: 400 },
      );
    }

    if (
      componentRows.length >
      MAX_COMPONENT_ROWS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `El máximo de componentes por importación es ${MAX_COMPONENT_ROWS}.`,
        },
        { status: 400 },
      );
    }

    const [
      productsSnapshot,
      producersMap,
      municipalitiesMap,
    ] = await Promise.all([
      adminDb
        .collection(
          PRODUCTS_COLLECTION,
        )
        .get(),
      loadProducerMap(),
      loadMunicipalityMap(),
    ]);

    const existingProducts =
      new Map<
        string,
        ProductDocument
      >();

    const existingByCode =
      new Map<
        string,
        ProductDocument
      >();

    const productsByName =
      new Map<
        string,
        ProductDocument[]
      >();

    for (
      const document of
        productsSnapshot.docs
    ) {
      const item = {
        id: document.id,
        data: document.data(),
      };

      existingProducts.set(
        document.id,
        item,
      );

      const code =
        normalizeCode(
          item.data.code,
        );

      if (code) {
        existingByCode.set(
          code,
          item,
        );
      }

      const name =
        normalizeName(
          item.data.nombre,
        );

      if (name) {
        const list =
          productsByName.get(
            name,
          ) ?? [];

        list.push(item);

        productsByName.set(
          name,
          list,
        );
      }
    }

    const normalizedProducts: Array<{
      row: NormalizedRow;
      rowNumber: number;
    }> = [];

    const normalizedCanastas: Array<{
      row: NormalizedRow;
      rowNumber: number;
    }> = [];

    const importedCodes =
      new Map<string, number>();

    /*
     * ---------------------------------------------------------
     * PRODUCTOS
     * ---------------------------------------------------------
     */

    for (
      let index = 0;
      index < productRows.length;
      index += 1
    ) {
      const raw =
        productRows[index];

      const rowNumber =
        index + 2;

      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {
        throw new Error(
          `Productos - fila ${rowNumber}: formato inválido.`,
        );
      }

      const row =
        normalizeProductRow(
          raw as ExcelRow,
          rowNumber,
        );

      if (
        normalizeName(
          row.categoria,
        ) ===
        normalizeName(
          CANASTA_CATEGORY,
        )
      ) {
        throw new Error(
          `Productos - fila ${rowNumber}: las canastas deben gestionarse desde la hoja Canastas.`,
        );
      }

      const previous =
        importedCodes.get(
          row.code,
        );

      if (
        previous !== undefined
      ) {
        throw new Error(
          `El código ${row.code} está repetido en las filas ${previous} y ${rowNumber}.`,
        );
      }

      importedCodes.set(
        row.code,
        rowNumber,
      );

      normalizedProducts.push({
        row,
        rowNumber,
      });
    }

    /*
     * ---------------------------------------------------------
     * CANASTAS
     * ---------------------------------------------------------
     */

    for (
      let index = 0;
      index < canastaRows.length;
      index += 1
    ) {
      const raw =
        canastaRows[index];

      const rowNumber =
        index + 2;

      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {
        throw new Error(
          `Canastas - fila ${rowNumber}: formato inválido.`,
        );
      }

      const row =
        normalizeProductRow(
          raw as ExcelRow,
          rowNumber,
          CANASTA_CATEGORY,
        );

      const previous =
        importedCodes.get(
          row.code,
        );

      if (
        previous !== undefined
      ) {
        throw new Error(
          `El código ${row.code} está repetido entre las hojas Productos y Canastas o dentro de ellas.`,
        );
      }

      importedCodes.set(
        row.code,
        rowNumber,
      );

      normalizedCanastas.push({
        row,
        rowNumber,
      });
    }

    /*
     * ---------------------------------------------------------
     * COMPONENTES
     * ---------------------------------------------------------
     */

    const normalizedComponents =
      componentRows.map(
        (
          raw,
          index,
        ) => {
          if (
            !raw ||
            typeof raw !== "object" ||
            Array.isArray(raw)
          ) {
            throw new Error(
              `ComponentesCanastas - fila ${index + 2}: formato inválido.`,
            );
          }

          return normalizeComponentRow(
            raw as ExcelRow,
            index + 2,
          );
        },
      );

    /*
     * ---------------------------------------------------------
     * PRODUCTORES Y MUNICIPIOS
     * ---------------------------------------------------------
     */

    const resolvedProducts =
      new Map<
        string,
        ResolvedProduct
      >();

    const allRows = [
      ...normalizedProducts,
      ...normalizedCanastas,
    ];

    for (
      const item of allRows
    ) {
      const productor =
        resolveCatalogItem(
          producersMap,
          item.row.nombreProductor,
          "productor",
          item.rowNumber,
        );

      const municipio =
        resolveCatalogItem(
          municipalitiesMap,
          item.row.nombreMunicipio,
          "municipio",
          item.rowNumber,
        );

      resolvedProducts.set(
        item.row.code,
        {
          row: item.row,
          rowNumber:
            item.rowNumber,
          productorId:
            productor.id,
          municipioId:
            municipio.id,
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * IDs PLANIFICADOS
     *
     * Permite que una canasta nueva pueda utilizar un producto
     * nuevo que también está dentro del mismo Excel.
     * ---------------------------------------------------------
     */

    const plannedIds =
      new Map<string, string>();

    for (
      const item of allRows
    ) {
      const existing =
        existingByCode.get(
          item.row.code,
        );

      if (existing) {
        plannedIds.set(
          item.row.code,
          existing.id,
        );
      } else {
        const ref =
          adminDb
            .collection(
              PRODUCTS_COLLECTION,
            )
            .doc();

        plannedIds.set(
          item.row.code,
          ref.id,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * COMPONENTES POR CANASTA
     * ---------------------------------------------------------
     */

    const componentsByCanasta =
      new Map<
        string,
        ComponentReference[]
      >();

    for (
      const component of
        normalizedComponents
    ) {
      const canasta =
        normalizedCanastas.find(
          (item) =>
            item.row.code ===
            component.codigoCanasta,
        );

      const existingCanasta =
        existingByCode.get(
          component.codigoCanasta,
        );

      if (
        !canasta &&
        !existingCanasta
      ) {
        throw new Error(
          `ComponentesCanastas - fila ${component.rowNumber}: la canasta "${component.codigoCanasta}" no existe en el archivo ni en Firebase.`,
        );
      }

      if (
        existingCanasta &&
        normalizeName(
          existingCanasta.data.categoria,
        ) !==
          normalizeName(
            CANASTA_CATEGORY,
          )
      ) {
        throw new Error(
          `ComponentesCanastas - fila ${component.rowNumber}: "${component.codigoCanasta}" no corresponde a una canasta.`,
        );
      }

      const productoCode =
        normalizeCode(
          component.producto,
        );

      if (
        productoCode ===
        component.codigoCanasta
      ) {
        throw new Error(
          `ComponentesCanastas - fila ${component.rowNumber}: una canasta no puede contenerse a sí misma.`,
        );
      }

      let productId =
        plannedIds.get(
          productoCode,
        );

      /*
       * Compatibilidad:
       * si no se encontró por código, se intenta por nombre.
       */
      if (!productId) {
        const matches =
          productsByName.get(
            normalizeName(
              component.producto,
            ),
          ) ?? [];

        if (
          matches.length === 0
        ) {
          throw new Error(
            `ComponentesCanastas - fila ${component.rowNumber}: no existe el producto "${component.producto}".`,
          );
        }

        if (
          matches.length > 1
        ) {
          throw new Error(
            `ComponentesCanastas - fila ${component.rowNumber}: existen varios productos llamados "${component.producto}". Use el Código del producto.`,
          );
        }

        productId =
          matches[0].id;
      }

      const canastaId =
        plannedIds.get(
          component.codigoCanasta,
        ) ??
        existingCanasta?.id;

      if (
        productId &&
        canastaId &&
        productId === canastaId
      ) {
        throw new Error(
          `ComponentesCanastas - fila ${component.rowNumber}: una canasta no puede ser componente de sí misma.`,
        );
      }

      const list =
        componentsByCanasta.get(
          component.codigoCanasta,
        ) ?? [];

      const duplicate =
        list.some(
          (item) =>
            item.productoId ===
            productId,
        );

      if (duplicate) {
        throw new Error(
          `ComponentesCanastas - fila ${component.rowNumber}: el producto "${component.producto}" está repetido dentro de la canasta ${component.codigoCanasta}.`,
        );
      }

      list.push({
        productoId:
          productId,
        cantidad:
          component.cantidad,
      });

      componentsByCanasta.set(
        component.codigoCanasta,
        list,
      );
    }

    /*
     * Si una canasta existente no tiene filas de componentes
     * en el Excel, conserva sus componentes actuales.
     */
    for (
      const canasta of
        normalizedCanastas
    ) {
      if (
        componentsByCanasta.has(
          canasta.row.code,
        )
      ) {
        continue;
      }

      const existing =
        existingByCode.get(
          canasta.row.code,
        );

      if (existing) {
        componentsByCanasta.set(
          canasta.row.code,
          getExistingComponents(
            existing.data,
          ),
        );
      } else {
        throw new Error(
          `Canasta ${canasta.row.code}: una canasta nueva debe tener al menos un componente en ComponentesCanastas.`,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * OPERACIONES
     * ---------------------------------------------------------
     */

    const operations:
      ImportOperation[] = [];

    let created = 0;
    let updated = 0;
    let deactivated = 0;
    let unchanged = 0;

    for (
      const item of allRows
    ) {
      const existing =
        existingByCode.get(
          item.row.code,
        );

      if (
        existing &&
        normalizeName(
          existing.data.categoria,
        ) !==
          normalizeName(
            item.row.categoria,
          )
      ) {
        throw new Error(
          `Fila ${item.rowNumber}: el código ${item.row.code} no puede cambiar entre producto y canasta.`,
        );
      }

      const resolved =
        resolvedProducts.get(
          item.row.code,
        );

      if (!resolved) {
        throw new Error(
          `No fue posible resolver el producto ${item.row.code}.`,
        );
      }

      const isCanasta =
        normalizeName(
          resolved.row.categoria,
        ) ===
        normalizeName(
          CANASTA_CATEGORY,
        );

      const components =
        isCanasta
          ? componentsByCanasta.get(
              resolved.row.code,
            ) ?? []
          : undefined;

      if (!existing) {
        operations.push({
          type: "CREATE",
          id:
            plannedIds.get(
              resolved.row.code,
            )!,
          row: resolved,
        });

        created += 1;
        continue;
      }

      const isSame =
        sameProductData(
          existing.data,
          resolved.row,
          resolved.productorId,
          resolved.municipioId,
          components,
        );

      if (isSame) {
        unchanged += 1;
        continue;
      }

      if (resolved.row.activo) {
        operations.push({
          type: "UPDATE",
          id: existing.id,
          row: resolved,
        });

        updated += 1;
      } else {
        operations.push({
          type: "DEACTIVATE",
          id: existing.id,
          row: resolved,
        });

        deactivated += 1;
      }
    }

    /*
     * ---------------------------------------------------------
     * VALIDAR COMPONENTES DE CANASTAS
     * ---------------------------------------------------------
     */

    for (
      const canasta of
        normalizedCanastas
    ) {
      const components =
        componentsByCanasta.get(
          canasta.row.code,
        ) ?? [];

      if (
        components.length === 0
      ) {
        throw new Error(
          `La canasta ${canasta.row.code} debe tener al menos un componente.`,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * ESCRITURA FIRESTORE
     * ---------------------------------------------------------
     */

    const batches:
      FirebaseFirestore.WriteBatch[] =
      [];

    let currentBatch =
      adminDb.batch();

    let currentBatchCount = 0;

    const addOperation = (
      callback: (
        batch: FirebaseFirestore.WriteBatch,
      ) => void,
    ) => {
      if (
        currentBatchCount >= 450
      ) {
        batches.push(
          currentBatch,
        );

        currentBatch =
          adminDb.batch();

        currentBatchCount = 0;
      }

      callback(
        currentBatch,
      );

      currentBatchCount += 1;
    };

    for (
      const operation of operations
    ) {
      /*
       * IMPORTANTE:
       * operation.row es ResolvedProduct.
       * Los datos reales están en operation.row.row.
       */
      const resolved =
        operation.row;

      const data =
        resolved.row;

      const isCanasta =
        normalizeName(
          data.categoria,
        ) ===
        normalizeName(
          CANASTA_CATEGORY,
        );

      const componentes =
        isCanasta
          ? componentsByCanasta.get(
              data.code,
            ) ?? []
          : [];

      const firestoreData:
        Record<string, unknown> = {
        code: data.code,
        nombre: data.nombre,
        descripcion:
          data.descripcion,

        precio:
          data.precio,

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

        stock:
          data.stock,

        categoria:
          data.categoria,

        unidad:
          data.unidad,

        activo:
          data.activo,

        IdProductor:
          resolved.productorId,

        IdMunicipalidad:
          resolved.municipioId,

        componentes,

        ultimaActualizacion:
          FieldValue.serverTimestamp(),
      };

      const ref =
        adminDb
          .collection(
            PRODUCTS_COLLECTION,
          )
          .doc(
            operation.id,
          );

      /*
       * CREATE
       */
      if (
        operation.type ===
        "CREATE"
      ) {
        addOperation(
          (writeBatch) => {
            writeBatch.set(
              ref,
              {
                ...firestoreData,
                imgPath: "",
                imageName: "",
                fechaCreacion:
                  FieldValue.serverTimestamp(),
                fechaCierre:
                  data.activo
                    ? null
                    : FieldValue.serverTimestamp(),
              },
            );
          },
        );

        continue;
      }

      /*
       * DEACTIVATE
       */
      if (
        operation.type ===
        "DEACTIVATE"
      ) {
        addOperation(
          (writeBatch) => {
            writeBatch.update(
              ref,
              {
                ...firestoreData,
                activo: false,
                fechaCierre:
                  FieldValue.serverTimestamp(),
              },
            );
          },
        );

        continue;
      }

      /*
       * UPDATE
       */
      const existing =
        existingProducts.get(
          operation.id,
        );

      const wasInactive =
        existing?.data?.activo ===
        false;

      addOperation(
        (writeBatch) => {
          const updateData:
            Record<
              string,
              unknown
            > = {
            ...firestoreData,
          };

          /*
           * Si estaba inactivo y vuelve a estar activo,
           * se limpia la fecha de cierre.
           */
          if (
            wasInactive &&
            data.activo
          ) {
            updateData.fechaCierre =
              null;
          }

          writeBatch.update(
            ref,
            updateData,
          );
        },
      );
    }

    if (
      currentBatchCount > 0
    ) {
      batches.push(
        currentBatch,
      );
    }

    for (
      const batch of batches
    ) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message:
        "Importación validada y aplicada correctamente.",
      data: {
        created,
        updated,
        deactivated,
        unchanged,
        totalProcessed:
          created +
          updated +
          deactivated +
          unchanged,
        componentsProcessed:
          normalizedComponents.length,
      },
    });
  } catch (error) {
    console.error(
      "Error importando productos:",
      error,
    );

    return errorResponse(
      error,
    );
  }
}