import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* =========================================================
   Tipos
========================================================= */

export interface Product {
  id: string;

  /* Identificación */
  code: string;
  nombre: string;
  descripcion: string;

  /* Precios */
  precio: number;
  precioVenta: number;
  precioSugerido: number;

  /* Costos */
  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;

  /* Presentación */
  presentacionCantidad: string;
  presentacionNombre: string;

  /* Inventario */
  stock: number;

  /* Clasificación */
  categoria: string;
  unidad: string;

  /* Relaciones */
  IdProductor: string;
  IdMunicipalidad: string;

  /* Imágenes */
  imgPath: string;
  imageName: string;

  /* Estado */
  activo: boolean;

  /* Fechas */
  fechaCreacion: Timestamp | null;
  ultimaActualizacion: Timestamp | null;
  fechaCierre: Timestamp | null;
}

/* =========================================================
   Colección
========================================================= */

const PRODUCTS_COLLECTION = "productos";

/* =========================================================
   Helpers
========================================================= */

function numberValue(
  value: unknown,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace("%", "")
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    const parsed = Number(normalized);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function stringValue(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
    : "";
}

/* =========================================================
   Conversión Firestore → Product
========================================================= */

function mapProduct(
  id: string,
  data: Record<string, unknown>,
): Product {
  const precioVenta =
    numberValue(data.precioVenta);

  /*
   * Compatibilidad:
   * si el documento antiguo no tiene precioVenta,
   * usamos precio.
   */
  const precio =
    data.precioVenta !== undefined
      ? precioVenta
      : numberValue(data.precio);

  const presentacionNombre =
    stringValue(
      data.presentacionNombre,
    ) || stringValue(data.unidad);

  return {
    id,

    code: stringValue(data.code),

    nombre: stringValue(data.nombre),

    descripcion:
      stringValue(data.descripcion),

    /* Precios */
    precio,

    precioVenta,

    precioSugerido:
      numberValue(
        data.precioSugerido,
      ),

    /* Costos */
    costoPcc:
      numberValue(data.costoPcc),

    porcentajeLogistica:
      numberValue(
        data.porcentajeLogistica,
      ),

    porcentajeTransporte:
      numberValue(
        data.porcentajeTransporte,
      ),

    /* Presentación */
    presentacionCantidad:
      stringValue(
        data.presentacionCantidad,
      ),

    presentacionNombre,

    /* Inventario */
    stock:
      numberValue(data.stock),

    /* Clasificación */
    categoria:
      stringValue(data.categoria),

    unidad:
      presentacionNombre,

    /* Relaciones */
    IdProductor:
      stringValue(data.IdProductor),

    IdMunicipalidad:
      stringValue(
        data.IdMunicipalidad,
      ),

    /* Imágenes */
    imgPath:
      stringValue(data.imgPath),

    imageName:
      stringValue(data.imageName),

    /* Estado */
    activo:
      data.activo === true,

    /* Fechas */
    fechaCreacion:
      data.fechaCreacion instanceof Timestamp
        ? data.fechaCreacion
        : null,

    ultimaActualizacion:
      data.ultimaActualizacion instanceof Timestamp
        ? data.ultimaActualizacion
        : null,

    fechaCierre:
      data.fechaCierre instanceof Timestamp
        ? data.fechaCierre
        : null,
  };
}

/* =========================================================
   Obtener todos los productos activos
========================================================= */

export async function getActiveProducts(): Promise<Product[]> {
  const productsRef = collection(
    db,
    PRODUCTS_COLLECTION,
  );

  const productsQuery = query(
    productsRef,
    where("activo", "==", true),
    orderBy("nombre", "asc"),
  );

  const snapshot =
    await getDocs(productsQuery);

  return snapshot.docs
    .map((document) =>
      mapProduct(
        document.id,
        document.data(),
      ),
    )
    .filter(
      (product) =>
        product.stock > 0,
    );
}

/* =========================================================
   Obtener todos los productos activos,
   incluyendo stock 0
========================================================= */

export async function getStoreProducts(): Promise<Product[]> {
  const productsRef = collection(
    db,
    PRODUCTS_COLLECTION,
  );

  const productsQuery = query(
    productsRef,
    where("activo", "==", true),
    orderBy("nombre", "asc"),
  );

  const snapshot =
    await getDocs(productsQuery);

  return snapshot.docs.map(
    (document) =>
      mapProduct(
        document.id,
        document.data(),
      ),
  );
}

/* =========================================================
   Obtener producto por ID
========================================================= */

export async function getProductById(
  productId: string,
): Promise<Product | null> {
  const productRef = doc(
    db,
    PRODUCTS_COLLECTION,
    productId,
  );

  const snapshot =
    await getDoc(productRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapProduct(
    snapshot.id,
    snapshot.data(),
  );
}

/* =========================================================
   Obtener producto por CODE
========================================================= */

export async function getProductByCode(
  code: string,
): Promise<Product | null> {
  const productsRef = collection(
    db,
    PRODUCTS_COLLECTION,
  );

  const productsQuery = query(
    productsRef,
    where("code", "==", code),
  );

  const snapshot =
    await getDocs(productsQuery);

  if (snapshot.empty) {
    return null;
  }

  const document =
    snapshot.docs[0];

  return mapProduct(
    document.id,
    document.data(),
  );
}