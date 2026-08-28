import {
  collection,
  getDocs,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface Categoria {
  id: string;
  nombre: string;
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  fechaClausura: Timestamp | null;
}

/**
 * Convierte un documento de Firestore
 * en nuestro modelo Categoria.
 */
function mapCategoria(
  document: QueryDocumentSnapshot<DocumentData>,
): Categoria {
  const data = document.data();

  return {
    id: data.id ?? document.id,
    nombre: data.nombre ?? "",
    fechaCreacion: data.fechaCreacion ?? null,
    fechaActualizacion: data.fechaActualizacion ?? null,
    fechaClausura: data.fechaClausura ?? null,
  };
}

/**
 * Obtiene todas las categorías registradas.
 *
 * Incluye categorías clausuradas porque pueden
 * ser necesarias para consultar información histórica.
 */
export async function obtenerCategorias(): Promise<Categoria[]> {
  const categoriasRef = collection(db, "categorias");

  const categoriasQuery = query(
    categoriasRef,
    orderBy("nombre", "asc"),
  );

  const snapshot = await getDocs(categoriasQuery);

  return snapshot.docs.map(mapCategoria);
}

/**
 * Obtiene únicamente las categorías activas.
 *
 * Una categoría se considera activa cuando
 * fechaClausura es null.
 */
export async function obtenerCategoriasActivas(): Promise<Categoria[]> {
  const categorias = await obtenerCategorias();

  return categorias.filter(
    (categoria) => categoria.fechaClausura === null,
  );
}