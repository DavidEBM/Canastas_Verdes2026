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

export interface Municipalidad {
  id: string;
  nombre: string;
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  fechaClausura: Timestamp | null;
}

/**
 * Convierte un documento de Firestore
 * en nuestro modelo Municipalidad.
 */
function mapMunicipalidad(
  document: QueryDocumentSnapshot<DocumentData>,
): Municipalidad {
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
 * Obtiene todas las municipalidades registradas.
 *
 * Incluye municipalidades clausuradas para
 * conservar información histórica.
 */
export async function obtenerMunicipalidades(): Promise<
  Municipalidad[]
> {
  const municipalidadesRef = collection(
    db,
    "municipalidades",
  );

  const municipalidadesQuery = query(
    municipalidadesRef,
    orderBy("nombre", "asc"),
  );

  const snapshot = await getDocs(
    municipalidadesQuery,
  );

  return snapshot.docs.map(mapMunicipalidad);
}

/**
 * Obtiene únicamente las municipalidades activas.
 *
 * Una municipalidad se considera activa cuando
 * fechaClausura es null.
 */
export async function obtenerMunicipalidadesActivas(): Promise<
  Municipalidad[]
> {
  const municipalidades =
    await obtenerMunicipalidades();

  return municipalidades.filter(
    (municipalidad) =>
      municipalidad.fechaClausura === null,
  );
}