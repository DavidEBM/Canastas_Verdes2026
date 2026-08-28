import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface DashboardResumen {
  productosActivos: number;
  productosSinStock: number;
  pedidosPendientes: number;
  pedidosEnReparto: number;
  pedidosEntregados: number;
  repartosPendientes: number;
  repartosEnCamino: number;
}

/**
 * Obtiene el resumen general utilizado
 * por el dashboard.
 */
export async function obtenerResumenDashboard(): Promise<DashboardResumen> {
  const productosRef = collection(db, "productos");
  const pedidosRef = collection(db, "pedidos");
  const repartosRef = collection(db, "repartos");

  const [
    productosActivosSnapshot,
    productosSinStockSnapshot,
    pedidosPendientesSnapshot,
    pedidosEnRepartoSnapshot,
    pedidosEntregadosSnapshot,
    repartosPendientesSnapshot,
    repartosEnCaminoSnapshot,
  ] = await Promise.all([
    getCountFromServer(
      query(
        productosRef,
        where("activo", "==", true),
      ),
    ),

    getCountFromServer(
      query(
        productosRef,
        where("activo", "==", true),
        where("stock", "==", 0),
      ),
    ),

    getCountFromServer(
      query(
        pedidosRef,
        where("estado", "==", "pendiente"),
      ),
    ),

    getCountFromServer(
      query(
        pedidosRef,
        where("estado", "==", "en_reparto"),
      ),
    ),

    getCountFromServer(
      query(
        pedidosRef,
        where("estado", "==", "entregado"),
      ),
    ),

    getCountFromServer(
      query(
        repartosRef,
        where("estado", "==", "pendiente"),
      ),
    ),

    getCountFromServer(
      query(
        repartosRef,
        where("estado", "==", "en_camino"),
      ),
    ),
  ]);

  return {
    productosActivos:
      productosActivosSnapshot.data().count,

    productosSinStock:
      productosSinStockSnapshot.data().count,

    pedidosPendientes:
      pedidosPendientesSnapshot.data().count,

    pedidosEnReparto:
      pedidosEnRepartoSnapshot.data().count,

    pedidosEntregados:
      pedidosEntregadosSnapshot.data().count,

    repartosPendientes:
      repartosPendientesSnapshot.data().count,

    repartosEnCamino:
      repartosEnCaminoSnapshot.data().count,
  };
}

/**
 * Obtiene la cantidad de productos activos
 * que actualmente tienen stock disponible.
 */
export async function obtenerProductosConStock(): Promise<number> {
  const productosRef = collection(
    db,
    "productos",
  );

  const snapshot = await getCountFromServer(
    query(
      productosRef,
      where("activo", "==", true),
      where("stock", ">", 0),
    ),
  );

  return snapshot.data().count;
}

/**
 * Obtiene la cantidad total de productos
 * registrados, incluyendo los clausurados.
 */
export async function obtenerTotalProductos(): Promise<number> {
  const productosRef = collection(
    db,
    "productos",
  );

  const snapshot =
    await getCountFromServer(productosRef);

  return snapshot.data().count;
}

/**
 * Obtiene la cantidad total de pedidos.
 */
export async function obtenerTotalPedidos(): Promise<number> {
  const pedidosRef = collection(
    db,
    "pedidos",
  );

  const snapshot =
    await getCountFromServer(pedidosRef);

  return snapshot.data().count;
}

/**
 * Obtiene la cantidad total de repartos.
 */
export async function obtenerTotalRepartos(): Promise<number> {
  const repartosRef = collection(
    db,
    "repartos",
  );

  const snapshot =
    await getCountFromServer(repartosRef);

  return snapshot.data().count;
}