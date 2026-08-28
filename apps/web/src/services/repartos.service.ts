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

import { db } from "@/lib/firebase";

/**
 * Estados posibles de un reparto.
 */
export type EstadoReparto =
  | "pendiente"
  | "aceptado"
  | "en_camino"
  | "entregado"
  | "cancelado";

/**
 * Información básica del reparto.
 */
export interface Reparto {
  id: string;

  /**
   * Pedido asociado al reparto.
   */
  pedidoId: string;

  /**
   * Usuario que realizó el pedido.
   */
  usuarioId: string;

  /**
   * Repartidor encargado.
   */
  repartidorId: string | null;

  estado: EstadoReparto;

  /**
   * Municipalidad donde se realiza la entrega.
   */
  IdMunicipalidad: string;

  /**
   * Dirección exacta de entrega.
   */
  direccionEntrega: string;

  fechaCreacion: Timestamp | null;

  fechaAceptacion: Timestamp | null;

  fechaEntrega: Timestamp | null;

  fechaCancelacion: Timestamp | null;

  ultimaActualizacion: Timestamp | null;
}

/**
 * Convierte un documento de Firestore
 * en nuestro modelo Reparto.
 */
function mapReparto(
  document: QueryDocumentSnapshot<DocumentData>,
): Reparto {
  const data = document.data();

  return {
    id: document.id,

    pedidoId: data.pedidoId ?? "",

    usuarioId: data.usuarioId ?? "",

    repartidorId:
      data.repartidorId ?? null,

    estado:
      data.estado ?? "pendiente",

    IdMunicipalidad:
      data.IdMunicipalidad ?? "",

    direccionEntrega:
      data.direccionEntrega ?? "",

    fechaCreacion:
      data.fechaCreacion ?? null,

    fechaAceptacion:
      data.fechaAceptacion ?? null,

    fechaEntrega:
      data.fechaEntrega ?? null,

    fechaCancelacion:
      data.fechaCancelacion ?? null,

    ultimaActualizacion:
      data.ultimaActualizacion ?? null,
  };
}

/**
 * Obtiene todos los repartos.
 *
 * Principalmente utilizado por el dashboard.
 */
export async function obtenerTodosLosRepartos(): Promise<
  Reparto[]
> {
  const repartosRef = collection(
    db,
    "repartos",
  );

  const repartosQuery = query(
    repartosRef,
    orderBy("fechaCreacion", "desc"),
  );

  const snapshot = await getDocs(
    repartosQuery,
  );

  return snapshot.docs.map(mapReparto);
}

/**
 * Obtiene los repartos asignados
 * a un repartidor específico.
 */
export async function obtenerRepartosRepartidor(
  repartidorId: string,
): Promise<Reparto[]> {
  if (!repartidorId) {
    return [];
  }

  const repartosRef = collection(
    db,
    "repartos",
  );

  const repartosQuery = query(
    repartosRef,
    where(
      "repartidorId",
      "==",
      repartidorId,
    ),
    orderBy("fechaCreacion", "desc"),
  );

  const snapshot = await getDocs(
    repartosQuery,
  );

  return snapshot.docs.map(mapReparto);
}

/**
 * Obtiene los repartos según su estado.
 */
export async function obtenerRepartosPorEstado(
  estado: EstadoReparto,
): Promise<Reparto[]> {
  const repartosRef = collection(
    db,
    "repartos",
  );

  const repartosQuery = query(
    repartosRef,
    where("estado", "==", estado),
    orderBy("fechaCreacion", "desc"),
  );

  const snapshot = await getDocs(
    repartosQuery,
  );

  return snapshot.docs.map(mapReparto);
}

/**
 * Obtiene los repartos pendientes
 * de asignación.
 */
export async function obtenerRepartosPendientes(): Promise<
  Reparto[]
> {
  return obtenerRepartosPorEstado(
    "pendiente",
  );
}