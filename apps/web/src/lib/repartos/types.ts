/*
 * ============================================================
 * Tipos del módulo de Repartos
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

/*
 * ============================================================
 * Estados
 * ============================================================
 */

export const ESTADOS_REPARTO = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
] as const;

export type EstadoReparto =
  (typeof ESTADOS_REPARTO)[number];

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

  IdProductor: string;

  IdMunicipalidad: string;
}

/*
 * ============================================================
 * Modalidad de entrega
 * ============================================================
 */

export type ModalidadEntrega =
  | "domicilio"
  | "recogida";

/*
 * ============================================================
 * Punto de recogida
 * ============================================================
 *
 * Es una copia de la información del punto existente al
 * momento de crear el pedido.
 */

export interface PuntoRecogidaPedido {
  nombre: string;

  direccion: string;

  municipio: string;
}

/*
 * ============================================================
 * Pedido base
 * ============================================================
 */

export interface Pedido {
  id: string;

  usuarioId: string;

  productos: ProductoPedido[];

  subtotal: number;

  total: number;

  estado: EstadoPedido;

  reservaId: string;

  /*
   * Tipo de entrega seleccionado durante checkout.
   */
  tipoEntrega: ModalidadEntrega;

  /*
   * Datos utilizados únicamente para domicilio.
   */
  IdMunicipalidad: string;

  direccionEntrega: string;

  telefonoEntrega: string | null;

  /*
   * Datos utilizados únicamente para recogida.
   */
  IdPuntoRecogida: string | null;

  puntoRecogida: PuntoRecogidaPedido | null;

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
 */

export interface MunicipalidadReparto {
  id: string;

  nombre: string;
}

/*
 * ============================================================
 * Costos
 * ============================================================
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
 * Firma de recibido
 * ============================================================
 */

export interface FirmaRecibido {
  metodo?: "manuscrita" | "texto";

  valor?: string | null;

  firmaDataUrl?: string | null;

  fechaRecibido?:
    | FirestoreTimestampLike
    | string
    | null;

  recibidoPor?: string | null;
}

/*
 * ============================================================
 * Resumen para tarjetas colapsadas
 * ============================================================
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

export function esEstadoReparto(
  estado: string,
): estado is EstadoReparto {
  return (
    ESTADOS_REPARTO as readonly string[]
  ).includes(estado);
}

export function esEstadoPedido(
  estado: string,
): estado is EstadoPedido {
  return (
    ESTADOS_PEDIDO as readonly string[]
  ).includes(estado);
}
