import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/**
 * Estados posibles de un pedido.
 */
export type EstadoPedido =
  | "pendiente"
  | "aceptado"
  | "preparando"
  | "en_reparto"
  | "entregado"
  | "cancelado";

/**
 * Producto incluido dentro de un pedido.
 *
 * Se conserva una copia de la información
 * importante para mantener el historial.
 */
export interface PedidoProducto {
  productoId: string;

  code: string;

  nombre: string;

  cantidad: number;

  precioUnitario: number;

  subtotal: number;

  /**
   * Referencia a la presentación utilizada
   * por el producto.
   */
  IdPresentacion: string;

  /**
   * Referencia a la granja productora.
   */
  IdGranja: string;

  /**
   * Municipalidad donde se encuentra
   * la granja productora.
   */
  IdMunicipalidad: string;
}

/**
 * Pedido almacenado en Firestore.
 */
export interface Pedido {
  id: string;

  usuarioId: string;

  productos: PedidoProducto[];

  subtotal: number;

  total: number;

  estado: EstadoPedido;

  fechaCreacion: Timestamp | null;

  ultimaActualizacion: Timestamp | null;

  fechaCancelacion: Timestamp | null;

  /**
   * Municipalidad correspondiente
   * al lugar de entrega.
   */
  IdMunicipalidad: string;

  direccionEntrega: string;

  repartidorId: string | null;
}

/**
 * Convierte un documento de Firestore
 * al modelo Pedido.
 */
function mapPedido(
  document: DocumentSnapshot<DocumentData>,
): Pedido {
  const data = document.data() ?? {};

  const productos: PedidoProducto[] =
    Array.isArray(data.productos)
      ? data.productos.map(
          (producto: DocumentData) => ({
            productoId:
              producto.productoId ?? "",

            code:
              producto.code ?? "",

            nombre:
              producto.nombre ?? "",

            cantidad: Number(
              producto.cantidad ?? 0,
            ),

            precioUnitario: Number(
              producto.precioUnitario ?? 0,
            ),

            subtotal: Number(
              producto.subtotal ?? 0,
            ),

            IdPresentacion:
              producto.IdPresentacion ?? "",

            IdGranja:
              producto.IdGranja ?? "",

            IdMunicipalidad:
              producto.IdMunicipalidad ?? "",
          }),
        )
      : [];

  return {
    id: document.id,

    usuarioId:
      data.usuarioId ?? "",

    productos,

    subtotal: Number(
      data.subtotal ?? 0,
    ),

    total: Number(
      data.total ?? 0,
    ),

    estado:
      data.estado ?? "pendiente",

    fechaCreacion:
      data.fechaCreacion ?? null,

    ultimaActualizacion:
      data.ultimaActualizacion ?? null,

    fechaCancelacion:
      data.fechaCancelacion ?? null,

    IdMunicipalidad:
      data.IdMunicipalidad ?? "",

    direccionEntrega:
      data.direccionEntrega ?? "",

    repartidorId:
      data.repartidorId ?? null,
  };
}

/**
 * Obtiene un pedido específico por su ID.
 *
 * Busca directamente el documento en:
 *
 * pedidos/{pedidoId}
 *
 * No requiere consultar todos los pedidos.
 */
export async function obtenerPedidoPorId(
  pedidoId: string,
): Promise<Pedido | null> {
  if (!pedidoId) {
    return null;
  }

  const pedidoRef = doc(
    db,
    "pedidos",
    pedidoId,
  );

  const snapshot =
    await getDoc(pedidoRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapPedido(snapshot);
}

/**
 * Obtiene los pedidos de un usuario.
 */
export async function obtenerPedidosUsuario(
  usuarioId: string,
): Promise<Pedido[]> {
  if (!usuarioId) {
    return [];
  }

  const pedidosRef = collection(
    db,
    "pedidos",
  );

  const pedidosQuery = query(
    pedidosRef,
    where(
      "usuarioId",
      "==",
      usuarioId,
    ),
    orderBy(
      "fechaCreacion",
      "desc",
    ),
  );

  const snapshot =
    await getDocs(pedidosQuery);

  return snapshot.docs.map(mapPedido);
}

/**
 * Obtiene un pedido específico
 * perteneciente a un usuario.
 *
 * Esta función es preferible para
 * consultar pedidos desde el área
 * del cliente, ya que además verifica
 * el usuarioId.
 */
export async function obtenerPedidoUsuario(
  pedidoId: string,
  usuarioId: string,
): Promise<Pedido | null> {
  if (!pedidoId || !usuarioId) {
    return null;
  }

  const pedidos =
    await obtenerPedidosUsuario(
      usuarioId,
    );

  return (
    pedidos.find(
      (pedido) =>
        pedido.id === pedidoId,
    ) ?? null
  );
}

/**
 * Obtiene todos los pedidos.
 *
 * Pensado principalmente para
 * administración.
 */
export async function obtenerTodosLosPedidos(): Promise<
  Pedido[]
> {
  const pedidosRef = collection(
    db,
    "pedidos",
  );

  const pedidosQuery = query(
    pedidosRef,
    orderBy(
      "fechaCreacion",
      "desc",
    ),
  );

  const snapshot =
    await getDocs(pedidosQuery);

  return snapshot.docs.map(mapPedido);
}

/**
 * Obtiene pedidos según su estado.
 */
export async function obtenerPedidosPorEstado(
  estado: EstadoPedido,
): Promise<Pedido[]> {
  const pedidosRef = collection(
    db,
    "pedidos",
  );

  const pedidosQuery = query(
    pedidosRef,
    where(
      "estado",
      "==",
      estado,
    ),
    orderBy(
      "fechaCreacion",
      "desc",
    ),
  );

  const snapshot =
    await getDocs(pedidosQuery);

  return snapshot.docs.map(mapPedido);
}