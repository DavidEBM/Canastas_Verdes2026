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

  code: string;
  nombre: string;
  descripcion: string;

  precio: number;
  stock: number;

  categoria: string;
  unidad: string;

  imgPath: string;
  imageName: string;

  activo: boolean;

  IdGranja: string;
  IdMunicipalidad: string;

  fechaCreacion: Timestamp | null;
  ultimaActualizacion: Timestamp | null;
  fechaCierre: Timestamp | null;
}

/* =========================================================
   Colección
========================================================= */

const PRODUCTS_COLLECTION = "productos";

/* =========================================================
   Conversión Firestore → Product
========================================================= */

function mapProduct(
  id: string,
  data: Record<string, unknown>,
): Product {
  return {
    id,

    code:
      typeof data.code === "string"
        ? data.code
        : "",

    nombre:
      typeof data.nombre === "string"
        ? data.nombre
        : "",

    descripcion:
      typeof data.descripcion === "string"
        ? data.descripcion
        : "",

    precio:
      typeof data.precio === "number"
        ? data.precio
        : Number(data.precio ?? 0),

    stock:
      typeof data.stock === "number"
        ? data.stock
        : Number(data.stock ?? 0),

    categoria:
      typeof data.categoria === "string"
        ? data.categoria
        : "",

    unidad:
      typeof data.unidad === "string"
        ? data.unidad
        : "",

    imgPath:
      typeof data.imgPath === "string"
        ? data.imgPath
        : "",

    imageName:
      typeof data.imageName === "string"
        ? data.imageName
        : "",

    activo:
      data.activo === true,

    IdGranja:
      typeof data.IdGranja === "string"
        ? data.IdGranja
        : "",

    IdMunicipalidad:
      typeof data.IdMunicipalidad === "string"
        ? data.IdMunicipalidad
        : "",

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

export async function getActiveProducts(): Promise<
  Product[]
> {
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
   incluyendo los que actualmente tienen stock 0.
   
   Esto será útil para mostrar "No Stock".
========================================================= */

export async function getStoreProducts(): Promise<
  Product[]
> {
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

  const document = snapshot.docs[0];

  return mapProduct(
    document.id,
    document.data(),
  );
}