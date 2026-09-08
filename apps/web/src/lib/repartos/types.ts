/*
 * ============================================================
 * Tipos del módulo de Repartos
 * ============================================================
 *
 * Estos tipos representan el esquema actual de los documentos
 * almacenados en Firestore dentro de la colección "pedidos".
 *
 * Los datos adicionales del cliente y repartidor se obtendrán
 * posteriormente desde la colección "usuarios" y/o Firebase Auth.
 */

/*
 * ============================================================
 * Estados
 * ============================================================
 */

export interface Reparto {
  id: string;

  pedido: Pedido;

  cliente: ClienteReparto;

  repartidor: RepartidorReparto | null;

  municipalidad: MunicipalidadReparto;

  costos: CostosReparto;

  modalidadEntrega: ModalidadEntrega;

  firma: FirmaRecibido | null;

  resumen?: RepartoResumen;
}

export const ESTADOS_REPARTO = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
] as const;

export type EstadoReparto =
  (typeof ESTADOS_REPARTO)[number];

/*
 * Estados generales de un pedido.
 *
 * "cancelado" existe en pedidos, pero no pertenece al flujo
 * activo de repartos.
 */

export const ESTADOS_PEDIDO = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

export type EstadoPedido =
  (typeof ESTADOS_PEDIDO)[number];

/*
 * ============================================================
 * Timestamp
 * ============================================================
 *
 * Firebase puede devolver timestamps de Firestore o valores
 * serializados por una API.
 */

export interface FirestoreTimestampLike {
  seconds?: number;
  nanoseconds?: number;
}

/*
 * ============================================================
 * Producto dentro de un pedido
 * ============================================================
 */

export interface ProductoPedido {
  productoId: string;

  code: string;

  nombre: string;

  cantidad: number;

  precioUnitario: number;

  subtotal: number;

  unidad: string;

  IdGranja: string;

  IdMunicipalidad: string;
}

/*
 * ============================================================
 * Pedido base
 * ============================================================
 *
 * Corresponde directamente al documento:
 *
 * pedidos/{pedidoId}
 */

export interface Pedido {
  id: string;

  usuarioId: string;

  productos: ProductoPedido[];

  subtotal: number;

  total: number;

  estado: EstadoPedido;

  reservaId: string;

  IdMunicipalidad: string;

  direccionEntrega: string;

  repartidorId: string | null;

  fechaCreacion:
    | FirestoreTimestampLike
    | string
    | null;

  ultimaActualizacion:
    | FirestoreTimestampLike
    | string
    | null;

  fechaCancelacion:
    | FirestoreTimestampLike
    | string
    | null;
}

/*
 * ============================================================
 * Información del cliente
 * ============================================================
 *
 * Esta información NO está actualmente dentro de "pedidos".
 * Se obtiene desde la información del usuario.
 */

export interface ClienteReparto {
  id: string;

  nombres: string;

  apellidos: string;

  nombreCompleto: string;

  correo: string;

  telefono: string;

  direccion: string;
}

/*
 * ============================================================
 * Información del repartidor
 * ============================================================
 *
 * El pedido únicamente almacena repartidorId.
 * El nombre y teléfono deberán resolverse mediante el usuario.
 */

export interface RepartidorReparto {
  id: string;

  nombres: string;

  apellidos: string;

  nombreCompleto: string;

  correo: string;

  telefono: string;
}

/*
 * ============================================================
 * Información de municipalidad
 * ============================================================
 *
 * El pedido actualmente guarda únicamente IdMunicipalidad.
 * El nombre debe resolverse mediante la colección
 * "municipalidades".
 */

export interface MunicipalidadReparto {
  id: string;

  nombre: string;
}

/*
 * ============================================================
 * Costos
 * ============================================================
 *
 * Actualmente el sistema solamente guarda:
 *
 * subtotal = suma de productos
 * total    = subtotal
 *
 * Dejamos los demás conceptos opcionales para poder incorporar
 * posteriormente entrega, logística y almacenamiento sin tener
 * que rediseñar todos los componentes.
 */

export interface CostosReparto {
  subtotalProductos: number;

  entrega?: number;

  logistica?: number;

  almacenamiento?: number;

  total: number;
}

/*
 * ============================================================
 * Modalidad de entrega
 * ============================================================
 *
 * Actualmente checkout solamente maneja entrega a domicilio.
 *
 * "recogida" queda contemplada para la futura implementación
 * de retiro en municipalidad/centro de distribución.
 */

export type ModalidadEntrega =
  | "domicilio"
  | "recogida";

/*
 * ============================================================
 * Firma de recibido
 * ============================================================
 */

export interface FirmaRecibido {
  metodo?: "manuscrita" | "texto";

  valor?: string | null;

  firmaDataUrl?: string | null;

  fechaRecibido?: FirestoreTimestampLike
    | string
    | null;

  recibidoPor?: string | null;
}

/*
 * ============================================================
 * Pedido enriquecido para Repartos
 * ============================================================
 *
 * Este es el objeto que utilizará principalmente la interfaz
 * del dashboard.
 *
 * Combina:
 *
 * pedido Firestore
 * + cliente
 * + repartidor
 * + municipalidad
 * + información calculada
 */

export interface Reparto {
  id: string;

  pedido: Pedido;

  cliente: ClienteReparto;

  repartidor: RepartidorReparto | null;

  municipalidad: MunicipalidadReparto;

  costos: CostosReparto;

  modalidadEntrega: ModalidadEntrega;

  firma: FirmaRecibido | null;
}

/*
 * ============================================================
 * Resumen para tarjetas colapsadas
 * ============================================================
 *
 * No necesitamos cargar/renderizar toda la información del
 * pedido en la tarjeta cuando está cerrada.
 */

export interface RepartoResumen {
  id: string;

  estado: EstadoPedido;

  clienteNombre: string;

  municipioNombre: string;

  repartidorNombre: string | null;

  cantidadProductos: number;

  cantidadUnidades: number;

  total: number;

  fechaCreacion:
    | FirestoreTimestampLike
    | string
    | null;
}

/*
 * ============================================================
 * Datos necesarios para cambiar el estado
 * ============================================================
 */

export interface ActualizarEstadoRepartoInput {
  estado: EstadoReparto;
}

/*
 * ============================================================
 * Datos necesarios para asignar repartidor
 * ============================================================
 */

export interface AsignarRepartidorInput {
  repartidorId: string;
}

/*
 * ============================================================
 * Respuesta estándar de API
 * ============================================================
 */

export interface RepartosApiResponse {
  success?: boolean;

  message?: string;

  data?: Reparto[] | Pedido[];
}

/*
 * ============================================================
 * Respuesta de un pedido individual
 * ============================================================
 */

export interface RepartoApiResponse {
  success?: boolean;

  message?: string;

  data?: Reparto | Pedido;
}

/*
 * ============================================================
 * Respuesta de actualización
 * ============================================================
 */

export interface ActualizarRepartoApiResponse {
  success?: boolean;

  message?: string;

  data?: {
    id?: string;

    estado?: EstadoPedido;

    repartidorId?: string | null;

    ultimaActualizacion?:
      | FirestoreTimestampLike
      | string
      | null;

    fechaCancelacion?:
      | FirestoreTimestampLike
      | string
      | null;
  };
}

/*
 * ============================================================
 * Utilidades de tipo
 * ============================================================
 */

/**
 * Comprueba si un estado pertenece al flujo activo
 * del módulo de repartos.
 */
export function esEstadoReparto(
  estado: string,
): estado is EstadoReparto {
  return (
    ESTADOS_REPARTO as readonly string[]
  ).includes(estado);
}

/**
 * Comprueba si un estado es un estado válido de pedido.
 */
export function esEstadoPedido(
  estado: string,
): estado is EstadoPedido {
  return (
    ESTADOS_PEDIDO as readonly string[]
  ).includes(estado);
}