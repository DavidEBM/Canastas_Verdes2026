import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

/**
 * Producto registrado en Firebase.
 */
export interface Producto {
  /**
   * ID interno del documento de Firestore.
   */
  id: string;

  /**
   * Código de registro del producto.
   * Ejemplo: AS0001
   */
  code: string;

  nombre: string;

  descripcion: string;

  precio: number;

  stock: number;

  categoria: string;

  unidad: string;

  /**
   * Ruta de la imagen dentro de Firebase Storage.
   * Ejemplo: products/tomate.jpg
   */
  imgPath: string;

  /**
   * Nombre original del archivo de imagen.
   * Ejemplo: tomate.jpg
   */
  imageName: string;

  /**
   * Indica si el producto está disponible
   * actualmente en la tienda.
   */
  activo: boolean;

  /**
   * Fecha en la que se creó el registro.
   */
  fechaCreacion: Timestamp | null;

  /**
   * Identificador de la granja productora.
   */
  IdGranja: string;

  /**
   * Identificador de la municipalidad donde
   * está ubicada la granja.
   */
  IdMunicipalidad: string;

  /**
   * Última modificación del producto,
   * incluyendo cambios de stock.
   */
  ultimaActualizacion: Timestamp | null;

  /**
   * Fecha en la que el producto fue retirado
   * de la tienda.
   *
   * null = todavía disponible.
   */
  fechaCierre: Timestamp | null;

  /**
   * URL temporal/pública obtenida desde
   * Firebase Storage.
   */
  imagenUrl: string;
}

/**
 * Convierte un documento de Firestore
 * en nuestro modelo Producto.
 */
function mapProducto(
  document: QueryDocumentSnapshot<DocumentData>,
): Omit<Producto, "imagenUrl"> {
  const data = document.data();

  return {
    id: document.id,

    code: data.code ?? "",

    nombre: data.nombre ?? "",

    descripcion: data.descripcion ?? "",

    precio: Number(data.precio ?? 0),

    stock: Number(data.stock ?? 0),

    categoria: data.categoria ?? "",

    unidad: data.unidad ?? "unidad",

    imgPath: data.imgPath ?? "",

    imageName: data.imageName ?? "",

    activo: data.activo ?? true,

    fechaCreacion: data.fechaCreacion ?? null,

    IdGranja: data.IdGranja ?? "",

    IdMunicipalidad: data.IdMunicipalidad ?? "",

    ultimaActualizacion:
      data.ultimaActualizacion ?? null,

    fechaCierre: data.fechaCierre ?? null,
  };
}

/**
 * Obtiene la URL de una imagen almacenada
 * en Firebase Storage.
 */
async function obtenerImagenUrl(
  imgPath: string,
): Promise<string> {
  if (!imgPath) {
    return "";
  }

  try {
    const imagenRef = ref(storage, imgPath);

    return await getDownloadURL(imagenRef);
  } catch (error) {
    console.error(
      `No se pudo cargar la imagen: ${imgPath}`,
      error,
    );

    return "";
  }
}

/**
 * Obtiene todos los productos activos
 * disponibles en la tienda.
 */
export async function obtenerProductos(): Promise<Producto[]> {
  const productosRef = collection(db, "productos");

  const productosQuery = query(
    productosRef,
    where("activo", "==", true),
    orderBy("nombre", "asc"),
  );

  const snapshot = await getDocs(productosQuery);

  const productos = await Promise.all(
    snapshot.docs.map(async (document) => {
      const producto = mapProducto(document);

      const imagenUrl = await obtenerImagenUrl(
        producto.imgPath,
      );

      return {
        ...producto,
        imagenUrl,
      };
    }),
  );

  return productos;
}

/**
 * Obtiene productos de una categoría determinada.
 */
export async function obtenerProductosPorCategoria(
  categoria: string,
): Promise<Producto[]> {
  const productosRef = collection(db, "productos");

  const productosQuery = query(
    productosRef,
    where("activo", "==", true),
    where("categoria", "==", categoria),
    orderBy("nombre", "asc"),
  );

  const snapshot = await getDocs(productosQuery);

  const productos = await Promise.all(
    snapshot.docs.map(async (document) => {
      const producto = mapProducto(document);

      const imagenUrl = await obtenerImagenUrl(
        producto.imgPath,
      );

      return {
        ...producto,
        imagenUrl,
      };
    }),
  );

  return productos;
}

/**
 * Obtiene todas las categorías disponibles
 * entre los productos activos.
 */
export async function obtenerCategorias(): Promise<string[]> {
  const productos = await obtenerProductos();

  const categorias = new Set(
    productos
      .map((producto) => producto.categoria.trim())
      .filter(Boolean),
  );

  return Array.from(categorias).sort((a, b) =>
    a.localeCompare(b),
  );
}