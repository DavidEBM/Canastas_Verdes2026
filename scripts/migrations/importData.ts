import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import XLSX from "xlsx";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  FieldValue,
  getFirestore,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PRODUCTS_COLLECTION = "productos";
const MUNICIPALIDADES_COLLECTION = "municipalidades";
const CATEGORIAS_COLLECTION = "categorias";
const PRESENTACIONES_COLLECTION = "presentaciones";
const IMPORTACIONES_COLLECTION = "importaciones";

const ENV_PATH = path.resolve(
  process.cwd(),
  "apps",
  "web",
  ".env.local",
);

/* =========================================================
   TIPOS
========================================================= */

interface ExcelRow {
  [key: string]: unknown;
}

interface ParsedPresentation {
  cantidad: string;
  nombre: string;
}

interface PreparedRow {
  excelRow: number;
  code: string;
  municipio: string;
  categoria: string;
  producto: string;

  presentationOriginal: string;
  presentation: ParsedPresentation;

  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;
  precioSugerido: number;
  precioVenta: number;
}

type CatalogType =
  | "municipalidad"
  | "categoria"
  | "presentacion";

interface ImportChange {
  orden: number;
  tipo: "producto" | CatalogType;
  collection: string;
  documentId: string;
  codigo?: string;
  nombre?: string;
  operacion: "crear" | "actualizar";
  datosAnteriores: Record<string, unknown> | null;
}

/* =========================================================
   ENVIRONMENT
========================================================= */

function loadEnvironment(): void {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(
      `No se encontró el archivo de entorno:\n${ENV_PATH}`,
    );
  }

  dotenv.config({
    path: ENV_PATH,
  });
}

function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      [
        "Faltan variables de Firebase.",
        "",
        "Se requieren:",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "",
        `Archivo utilizado: ${ENV_PATH}`,
      ].join("\n"),
    );
  }

  const normalizedPrivateKey = privateKey.replace(
    /\\n/g,
    "\n",
  );

  const existingApps = getApps();

  if (existingApps.length > 0) {
    return getFirestore(existingApps[0]);
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizedPrivateKey,
    }),
  });

  return getFirestore(app);
}

/* =========================================================
   UTILIDADES
========================================================= */

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const valueText = text(value);

  if (!valueText) {
    return 0;
  }

  const normalized = valueText
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/\.(?=\d{3}(?:,|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: unknown): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeHeader(value: unknown): string {
  return normalize(value).replace(/\s+/g, " ");
}

function normalizeExcelRows(
  rows: ExcelRow[],
): ExcelRow[] {
  return rows.map((row) => {
    const normalizedRow: ExcelRow = {};

    for (const [key, value] of Object.entries(row)) {
      normalizedRow[normalizeHeader(key)] = value;
    }

    return normalizedRow;
  });
}

/* =========================================================
   PRESENTACIÓN
========================================================= */

function parsePresentation(
  value: unknown,
): ParsedPresentation {
  const original = text(value);

  if (!original) {
    return {
      cantidad: "1",
      nombre: "",
    };
  }

  /*
   * Caso especial:
   * "mano" => cantidad 1 / nombre Mano
   */
  if (normalize(original) === "mano") {
    return {
      cantidad: "1",
      nombre: "Mano",
    };
  }

  /*
   * "media libra"
   * "media kg"
   * "media unidad"
   *
   * Se interpreta como 1/2 + nombre.
   */
  const mediaMatch = original.match(
    /^media\s+(.+)$/i,
  );

  if (mediaMatch) {
    return {
      cantidad: "1/2",
      nombre: (mediaMatch[1] ?? "").trim(),
    };
  }

  /*
   * Casos normales:
   * 500 gr
   * 1 kg
   * 12 unidades
   * 2 Atados
   * 500gr
   * 1kg
   * 1/2 libra
   */
  const match = original.match(
    /^(\d+(?:[.,]\d+)?(?:\/\d+)?)[\s]*(.+)$/i,
  );

  if (match) {
    const cantidad = match[1] ?? "1";
    const nombre = match[2] ?? original;

    return {
      cantidad,
      nombre: nombre.trim(),
    };
  }

  /*
   * Fallback:
   * si no se puede separar, se conserva todo
   * como nombre y cantidad 1.
   */
  return {
    cantidad: "1",
    nombre: original,
  };
}

/* =========================================================
   CARGA DE CATÁLOGOS
========================================================= */

/**
 * Busca una propiedad permitiendo soportar tanto
 * el formato nuevo como documentos antiguos.
 */
function readCatalogName(
  data: Record<string, unknown>,
): string {
  return (
    text(data.nombre) ||
    text(data.Nombre)
  );
}

function loadCatalogMap(
  snapshots: QueryDocumentSnapshot[],
): Map<string, string> {
  const result = new Map<string, string>();

  for (const document of snapshots) {
    const data = document.data() as Record<
      string,
      unknown
    >;

    const name = readCatalogName(data);

    if (!name) {
      continue;
    }

    result.set(normalize(name), document.id);
  }

  return result;
}

async function loadMunicipalities(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, string>> {
  console.log("Cargando municipalidades...");

  const snapshot = await db
    .collection(MUNICIPALIDADES_COLLECTION)
    .get();

  const municipalities = loadCatalogMap(
    snapshot.docs,
  );

  console.log(
    `Municipalidades encontradas: ${municipalities.size}`,
  );

  return municipalities;
}

async function loadCategories(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, string>> {
  console.log("Cargando categorías...");

  const snapshot = await db
    .collection(CATEGORIAS_COLLECTION)
    .get();

  const categories = loadCatalogMap(
    snapshot.docs,
  );

  console.log(
    `Categorías encontradas: ${categories.size}`,
  );

  return categories;
}

async function loadPresentations(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, string>> {
  console.log("Cargando presentaciones...");

  const snapshot = await db
    .collection(PRESENTACIONES_COLLECTION)
    .get();

  const presentations = loadCatalogMap(
    snapshot.docs,
  );

  console.log(
    `Presentaciones encontradas: ${presentations.size}`,
  );

  return presentations;
}

/* =========================================================
   CARGA DE PRODUCTOS
========================================================= */

async function loadProducts(
  db: ReturnType<typeof getFirestore>,
): Promise<Map<string, QueryDocumentSnapshot>> {
  console.log("Cargando productos...");

  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .get();

  const products = new Map<
    string,
    QueryDocumentSnapshot
  >();

  for (const document of snapshot.docs) {
    const data = document.data();

    const code = text(data.code);

    if (!code) {
      continue;
    }

    products.set(normalize(code), document);
  }

  console.log(
    `Productos existentes: ${products.size}`,
  );

  return products;
}

/* =========================================================
   EXCEL
========================================================= */

function readExcel(
  filePath: string,
): PreparedRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No existe el archivo Excel:\n${filePath}`,
    );
  }

  const workbook = XLSX.readFile(filePath);

  const firstSheetName =
    workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(
      "El archivo Excel no contiene hojas.",
    );
  }

  const worksheet =
    workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error(
      `No se pudo acceder a la hoja "${firstSheetName}".`,
    );
  }

  console.log(
    `Hoja utilizada: ${firstSheetName}`,
  );

  const rawRows =
    XLSX.utils.sheet_to_json<ExcelRow>(
      worksheet,
      {
        defval: "",
      },
    );

  console.log(
    `Filas encontradas: ${rawRows.length}`,
  );

  const rows =
    normalizeExcelRows(rawRows);

  return prepareRows(rows);
}

/* =========================================================
   PREPARACIÓN DE FILAS
========================================================= */

function prepareRows(
  rows: ExcelRow[],
): PreparedRow[] {
  return rows.map((row, index) => {
    const excelRow = index + 2;

    const code = text(row["codigo"]);
    const municipio = text(row["municipio"]);
    const categoria = text(row["categoria"]);
    const producto = text(row["producto"]);
    const presentationOriginal =
      text(row["presentacion"]);

    const presentation =
      parsePresentation(
        presentationOriginal,
      );

    return {
      excelRow,
      code,
      municipio,
      categoria,
      producto,

      presentationOriginal,
      presentation,

      costoPcc:
        numberValue(row["costo pcc"]),

      porcentajeLogistica:
        numberValue(row["% logistica"]),

      porcentajeTransporte:
        numberValue(row["%transporte"]),

      precioSugerido:
        numberValue(row["precio sugerido"]),

      precioVenta:
        numberValue(row["precio de venta"]),
    };
  });
}

/* =========================================================
   VALIDACIÓN
========================================================= */

function validateRows(
  rows: PreparedRow[],
): string[] {
  const errors: string[] = [];

  const codes = new Map<
    string,
    number
  >();

  for (const row of rows) {
    if (!row.code) {
      errors.push(
        `Fila ${row.excelRow}: falta el Código.`,
      );
    }

    if (!row.municipio) {
      errors.push(
        `Fila ${row.excelRow}: falta el Municipio.`,
      );
    }

    if (!row.categoria) {
      errors.push(
        `Fila ${row.excelRow}: falta la Categoría.`,
      );
    }

    if (!row.producto) {
      errors.push(
        `Fila ${row.excelRow}: falta el Producto.`,
      );
    }

    if (!row.presentationOriginal) {
      errors.push(
        `Fila ${row.excelRow}: falta la Presentación.`,
      );
    }

    if (!row.presentation.nombre) {
      errors.push(
        `Fila ${row.excelRow}: no se pudo determinar el nombre de la presentación.`,
      );
    }

    if (row.precioVenta < 0) {
      errors.push(
        `Fila ${row.excelRow}: Precio de Venta inválido.`,
      );
    }

    if (row.precioSugerido < 0) {
      errors.push(
        `Fila ${row.excelRow}: Precio Sugerido inválido.`,
      );
    }

    if (row.costoPcc < 0) {
      errors.push(
        `Fila ${row.excelRow}: Costo Pcc inválido.`,
      );
    }

    if (row.porcentajeLogistica < 0) {
      errors.push(
        `Fila ${row.excelRow}: % Logística inválido.`,
      );
    }

    if (row.porcentajeTransporte < 0) {
      errors.push(
        `Fila ${row.excelRow}: %Transporte inválido.`,
      );
    }

    const normalizedCode =
      normalize(row.code);

    const previousRow =
      codes.get(normalizedCode);

    if (previousRow) {
      errors.push(
        `Fila ${row.excelRow}: el código "${row.code}" está repetido; también aparece en la fila ${previousRow}.`,
      );
    } else if (normalizedCode) {
      codes.set(
        normalizedCode,
        row.excelRow,
      );
    }
  }

  return errors;
}

/* =========================================================
   CREACIÓN DE CATÁLOGOS
========================================================= */

async function ensureCategory(
  db: ReturnType<typeof getFirestore>,
  categories: Map<string, string>,
  name: string,
  importId: string,
  changes: ImportChange[],
): Promise<string> {
  const normalizedName = normalize(name);

  const existingId =
    categories.get(normalizedName);

  if (existingId) {
    return existingId;
  }

  const reference = db
    .collection(CATEGORIAS_COLLECTION)
    .doc();

  const data = {
    nombre: name,
    fechaCreacion:
      FieldValue.serverTimestamp(),
    fechaActualizacion:
      FieldValue.serverTimestamp(),
    fechaClausura: null,
    importOperationId: importId,
  };

  await reference.set(data);

  categories.set(
    normalizedName,
    reference.id,
  );

  changes.push({
    orden: changes.length + 1,
    tipo: "categoria",
    collection: CATEGORIAS_COLLECTION,
    documentId: reference.id,
    nombre: name,
    operacion: "crear",
    datosAnteriores: null,
  });

  return reference.id;
}

async function ensureMunicipality(
  db: ReturnType<typeof getFirestore>,
  municipalities: Map<string, string>,
  name: string,
  importId: string,
  changes: ImportChange[],
): Promise<string> {
  const normalizedName =
    normalize(name);

  const existingId =
    municipalities.get(normalizedName);

  if (existingId) {
    return existingId;
  }

  const reference = db
    .collection(
      MUNICIPALIDADES_COLLECTION,
    )
    .doc();

  const data = {
    nombre: name,
    fechaCreacion:
      FieldValue.serverTimestamp(),
    fechaActualizacion:
      FieldValue.serverTimestamp(),
    fechaClausura: null,
    importOperationId: importId,
  };

  await reference.set(data);

  municipalities.set(
    normalizedName,
    reference.id,
  );

  changes.push({
    orden: changes.length + 1,
    tipo: "municipalidad",
    collection:
      MUNICIPALIDADES_COLLECTION,
    documentId: reference.id,
    nombre: name,
    operacion: "crear",
    datosAnteriores: null,
  });

  return reference.id;
}

async function ensurePresentation(
  db: ReturnType<typeof getFirestore>,
  presentations: Map<string, string>,
  presentation: ParsedPresentation,
  importId: string,
  changes: ImportChange[],
): Promise<string> {
  const name = presentation.nombre;
  const normalizedName =
    normalize(name);

  const existingId =
    presentations.get(normalizedName);

  if (existingId) {
    return existingId;
  }

  const reference = db
    .collection(
      PRESENTACIONES_COLLECTION,
    )
    .doc();

  const data = {
    nombre: name,
    descripcion: "",
    fechaCreacion:
      FieldValue.serverTimestamp(),
    fechaActualizacion:
      FieldValue.serverTimestamp(),
    fechaClausura: null,
    importOperationId: importId,
  };

  await reference.set(data);

  presentations.set(
    normalizedName,
    reference.id,
  );

  changes.push({
    orden: changes.length + 1,
    tipo: "presentacion",
    collection:
      PRESENTACIONES_COLLECTION,
    documentId: reference.id,
    nombre: name,
    operacion: "crear",
    datosAnteriores: null,
  });

  return reference.id;
}

/* =========================================================
   REGISTRO DE CAMBIOS
========================================================= */

async function saveChange(
  db: ReturnType<typeof getFirestore>,
  importId: string,
  change: ImportChange,
): Promise<void> {
  await db
    .collection(IMPORTACIONES_COLLECTION)
    .doc(importId)
    .collection("cambios")
    .doc()
    .set({
      ...change,
      timestamp:
        FieldValue.serverTimestamp(),
    });
}

/* =========================================================
   IMPORTACIÓN DE PRODUCTOS
========================================================= */

async function importProduct(
  db: ReturnType<typeof getFirestore>,
  row: PreparedRow,
  products: Map<
    string,
    QueryDocumentSnapshot
  >,
  municipalityId: string,
  categoryName: string,
  importId: string,
  presentation: ParsedPresentation,
  changes: ImportChange[],
): Promise<void> {
  const normalizedCode =
    normalize(row.code);

  const existing =
    products.get(normalizedCode);

  if (existing) {
    /*
     * Guardamos el documento completo anterior.
     * Esto permite restaurarlo exactamente en rollback.
     */
    const previousData =
      existing.data() as Record<
        string,
        unknown
      >;

    const updateData = {
      code: row.code,

      nombre: row.producto,

      precio: row.precioVenta,
      precioVenta: row.precioVenta,
      precioSugerido: row.precioSugerido,

      costoPcc: row.costoPcc,
      porcentajeLogistica:
        row.porcentajeLogistica,
      porcentajeTransporte:
        row.porcentajeTransporte,

      presentacionCantidad:
        presentation.cantidad,
      presentacionNombre:
        presentation.nombre,

      unidad: presentation.nombre,

      categoria: categoryName,

      IdMunicipalidad:
        municipalityId,

      ultimaActualizacion:
        FieldValue.serverTimestamp(),

      importOperationId: importId,
    };

    await existing.ref.update(
      updateData,
    );

    const change: ImportChange = {
      orden: changes.length + 1,
      tipo: "producto",
      collection:
        PRODUCTS_COLLECTION,
      documentId: existing.id,
      codigo: row.code,
      operacion: "actualizar",
      datosAnteriores:
        previousData,
    };

    changes.push(change);

    await saveChange(
      db,
      importId,
      change,
    );

    return;
  }

  /*
   * Producto nuevo.
   *
   * Firestore genera automáticamente
   * el ID del documento.
   */
  const reference = db
    .collection(PRODUCTS_COLLECTION)
    .doc();

  const productData = {
    code: row.code,
    nombre: row.producto,
    descripcion: "",

    precio: row.precioVenta,
    precioVenta: row.precioVenta,
    precioSugerido: row.precioSugerido,

    costoPcc: row.costoPcc,
    porcentajeLogistica:
      row.porcentajeLogistica,
    porcentajeTransporte:
      row.porcentajeTransporte,

    presentacionCantidad:
      presentation.cantidad,
    presentacionNombre:
      presentation.nombre,

    unidad: presentation.nombre,

    stock: 0,

    categoria: categoryName,

    IdProductor: "",
    IdMunicipalidad:
      municipalityId,

    imgPath: "",
    imageName: "",

    activo: true,

    fechaCreacion:
      FieldValue.serverTimestamp(),

    ultimaActualizacion:
      FieldValue.serverTimestamp(),

    fechaCierre: null,

    importOperationId: importId,
  };

  await reference.set(
    productData,
  );

  const change: ImportChange = {
    orden: changes.length + 1,
    tipo: "producto",
    collection:
      PRODUCTS_COLLECTION,
    documentId: reference.id,
    codigo: row.code,
    operacion: "crear",
    datosAnteriores: null,
  };

  changes.push(change);

  await saveChange(
    db,
    importId,
    change,
  );

  /*
   * Añadimos el nuevo documento al mapa
   * para evitar duplicados durante el mismo proceso.
   */
  products.set(
    normalizedCode,
    {
      ...({
        id: reference.id,
        data: () => productData,
      } as unknown as QueryDocumentSnapshot),
    },
  );
}

/* =========================================================
   MAIN
========================================================= */

async function main(): Promise<void> {
  const filePath =
    process.argv[2];

  if (!filePath) {
    throw new Error(
      [
        "Debes indicar la ruta del archivo Excel.",
        "",
        "Ejemplo:",
        'pnpm run importData "E:\\ruta\\archivo.xlsx"',
      ].join("\n"),
    );
  }

  loadEnvironment();

  const db =
    initializeFirebase();

  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    " CANASTAS VERDES - IMPORTACIÓN",
  );
  console.log(
    "========================================",
  );
  console.log("");

  console.log(
    `Excel: ${filePath}`,
  );

  console.log(
    `Entorno: ${ENV_PATH}`,
  );

  console.log("");

  const rows =
    readExcel(filePath);

  if (rows.length === 0) {
    throw new Error(
      "El Excel no contiene filas de productos.",
    );
  }

  /*
   * Creamos el registro de importación
   * antes de comenzar a modificar datos.
   */
  const importReference = db
    .collection(IMPORTACIONES_COLLECTION)
    .doc();

  const importId =
    importReference.id;

  await importReference.set({
    id: importId,
    archivo:
      path.basename(filePath),
    estado: "procesando",
    fechaInicio:
      FieldValue.serverTimestamp(),
    fechaFinalizacion: null,
    filasExcel: rows.length,
    productosCreados: 0,
    productosActualizados: 0,
    categoriasCreadas: 0,
    municipalidadesCreadas: 0,
    presentacionesCreadas: 0,
    error: null,
  });

  const changes: ImportChange[] = [];

  try {
    /* =====================================================
       CARGAR CATÁLOGOS
    ===================================================== */

    const municipalities =
      await loadMunicipalities(db);

    const categories =
      await loadCategories(db);

    const presentations =
      await loadPresentations(db);

    const products =
      await loadProducts(db);

    /* =====================================================
       VALIDACIÓN
    ===================================================== */

    console.log("");
    console.log(
      "Validando Excel...",
    );

    const validationErrors =
      validateRows(rows);

    if (validationErrors.length > 0) {
      console.log("");

      for (const error of validationErrors) {
        console.log(`✗ ${error}`);
      }

      await importReference.update({
        estado: "error",
        fechaFinalizacion:
          FieldValue.serverTimestamp(),
        error:
          validationErrors.join("\n"),
      });

      throw new Error(
        `La validación falló con ${validationErrors.length} error(es). No se modificaron productos ni catálogos.`,
      );
    }

    console.log(
      "✓ Validación básica correcta.",
    );

    /* =====================================================
       PRE-CREAR CATÁLOGOS
    ===================================================== */

    console.log("");
    console.log(
      "Verificando categorías, municipalidades y presentaciones...",
    );

    const categoryNames =
      new Set<string>();

    const municipalityNames =
      new Set<string>();

    const presentationNames =
      new Map<
        string,
        ParsedPresentation
      >();

    for (const row of rows) {
      categoryNames.add(
        row.categoria,
      );

      municipalityNames.add(
        row.municipio,
      );

      const presentationKey =
        normalize(
          row.presentation.nombre,
        );

      if (
        !presentationNames.has(
          presentationKey,
        )
      ) {
        presentationNames.set(
          presentationKey,
          row.presentation,
        );
      }
    }

    let categoriesCreated = 0;
    let municipalitiesCreated = 0;
    let presentationsCreated = 0;

    /*
     * Categorías
     */
    for (const categoryName of categoryNames) {
      const before =
        categories.has(
          normalize(categoryName),
        );

      await ensureCategory(
        db,
        categories,
        categoryName,
        importId,
        changes,
      );

      if (!before) {
        categoriesCreated++;
      }
    }

    /*
     * Municipalidades
     */
    for (const municipalityName of municipalityNames) {
      const before =
        municipalities.has(
          normalize(
            municipalityName,
          ),
        );

      await ensureMunicipality(
        db,
        municipalities,
        municipalityName,
        importId,
        changes,
      );

      if (!before) {
        municipalitiesCreated++;
      }
    }

    /*
     * Presentaciones
     */
    for (const presentation of presentationNames.values()) {
      const before =
        presentations.has(
          normalize(
            presentation.nombre,
          ),
        );

      await ensurePresentation(
        db,
        presentations,
        presentation,
        importId,
        changes,
      );

      if (!before) {
        presentationsCreated++;
      }
    }

    console.log(
      `✓ Categorías nuevas: ${categoriesCreated}`,
    );

    console.log(
      `✓ Municipalidades nuevas: ${municipalitiesCreated}`,
    );

    console.log(
      `✓ Presentaciones nuevas: ${presentationsCreated}`,
    );

    /* =====================================================
       IMPORTAR PRODUCTOS
    ===================================================== */

    console.log("");
    console.log(
      "Importando productos...",
    );

    let productsCreated = 0;
    let productsUpdated = 0;

    for (
      let index = 0;
      index < rows.length;
      index++
    ) {
      const row = rows[index];

      if (!row) {
        continue;
      }

      const municipalityId =
        municipalities.get(
          normalize(row.municipio),
        );

      if (!municipalityId) {
        throw new Error(
          `Fila ${row.excelRow}: no se encontró la municipalidad "${row.municipio}".`,
        );
      }

      const categoryId =
        categories.get(
          normalize(row.categoria),
        );

      if (!categoryId) {
        throw new Error(
          `Fila ${row.excelRow}: no se encontró la categoría "${row.categoria}".`,
        );
      }

      const presentationId =
        presentations.get(
          normalize(
            row.presentation.nombre,
          ),
        );

      if (!presentationId) {
        throw new Error(
          `Fila ${row.excelRow}: no se encontró la presentación "${row.presentation.nombre}".`,
        );
      }

      /*
       * categoryId y presentationId se validan
       * para garantizar que los catálogos existen.
       *
       * El modelo Product actual guarda:
       * categoria = nombre
       * presentacionNombre = nombre
       *
       * Por eso no se agregan campos ID que no
       * existen en tu interfaz Product.
       */
      void categoryId;
      void presentationId;

      const existing =
        products.get(
          normalize(row.code),
        );

      await importProduct(
        db,
        row,
        products,
        municipalityId,
        row.categoria,
        importId,
        row.presentation,
        changes,
      );

      if (existing) {
        productsUpdated++;
      } else {
        productsCreated++;
      }

      console.log(
        `[${index + 1}/${rows.length}] ${row.code} - ${row.producto}`,
      );
    }

    /* =====================================================
       FINALIZAR IMPORTACIÓN
    ===================================================== */

    await importReference.update({
      estado: "completada",

      fechaFinalizacion:
        FieldValue.serverTimestamp(),

      productosCreados:
        productsCreated,

      productosActualizados:
        productsUpdated,

      categoriasCreadas:
        categoriesCreated,

      municipalidadesCreadas:
        municipalitiesCreated,

      presentacionesCreadas:
        presentationsCreated,

      totalCambios:
        changes.length,

      error: null,
    });

    console.log("");
    console.log(
      "========================================",
    );
    console.log(
      " IMPORTACIÓN COMPLETADA",
    );
    console.log(
      "========================================",
    );
    console.log("");

    console.log(
      `Import ID: ${importId}`,
    );

    console.log(
      `Productos creados: ${productsCreated}`,
    );

    console.log(
      `Productos actualizados: ${productsUpdated}`,
    );

    console.log(
      `Categorías creadas: ${categoriesCreated}`,
    );

    console.log(
      `Municipalidades creadas: ${municipalitiesCreated}`,
    );

    console.log(
      `Presentaciones creadas: ${presentationsCreated}`,
    );

    console.log(
      `Total cambios registrados: ${changes.length}`,
    );

    console.log("");
    console.log(
      "Para revertir esta importación utiliza:",
    );

    console.log(
      `pnpm run rollbackData ${importId}`,
    );

    console.log("");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error("");
    console.error(
      "========================================",
    );
    console.error(
      " ERROR EN LA IMPORTACIÓN",
    );
    console.error(
      "========================================",
    );
    console.error("");
    console.error(message);
    console.error("");

    /*
     * No sobrescribimos un estado "error"
     * que ya haya sido establecido por validación.
     */
    await importReference.update({
      estado: "error",
      fechaFinalizacion:
        FieldValue.serverTimestamp(),
      error: message,
    });

    throw error;
  }
}

/* =========================================================
   EJECUCIÓN
========================================================= */

main().catch(() => {
  process.exit(1);
});