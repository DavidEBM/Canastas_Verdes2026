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

export interface Presentacion {
  id: string;
  nombre: string;
  descripcion: string;
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  fechaClausura: Timestamp | null;
}

/**
 * Convierte un documento de Firestore
 * en nuestro modelo Presentacion.
 */
function mapPresentacion(
  document: QueryDocumentSnapshot<DocumentData>,
): Presentacion {
  const data = document.data();

  return {
    id: data.id ?? document.id,
    nombre: data.nombre ?? "",
    descripcion: data.descripcion ?? "",
    fechaCreacion: data.fechaCreacion ?? null,
    fechaActualizacion: data.fechaActualizacion ?? null,
    fechaClausura: data.fechaClausura ?? null,
  };
}

/**
 * Obtiene todas las presentaciones registradas.
 *
 * Incluye presentaciones clausuradas para
 * conservar información histórica.
 */
export async function obtenerPresentaciones(): Promise<
  Presentacion[]
> {
  const presentacionesRef = collection(
    db,
    "presentaciones",
  );

  const presentacionesQuery = query(
    presentacionesRef,
    orderBy("nombre", "asc"),
  );

  const snapshot = await getDocs(
    presentacionesQuery,
  );

  return snapshot.docs.map(mapPresentacion);
}

/**
 * Obtiene únicamente las presentaciones activas.
 *
 * Una presentación se considera activa cuando
 * fechaClausura es null.
 */
export async function obtenerPresentacionesActivas(): Promise<
  Presentacion[]
> {
  const presentaciones =
    await obtenerPresentaciones();

  return presentaciones.filter(
    (presentacion) =>
      presentacion.fechaClausura === null,
  );
}