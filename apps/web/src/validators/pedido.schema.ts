import { z } from "zod";

/**
 * Producto que el cliente intenta comprar.
 */
export const pedidoProductoSchema = z.object({
  productoId: z
    .string()
    .min(1, "El producto es obligatorio"),

  code: z
    .string()
    .min(1, "El código del producto es obligatorio"),

  nombre: z
    .string()
    .min(1, "El nombre del producto es obligatorio"),

  cantidad: z
    .number()
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor que cero"),

  precioUnitario: z
    .number()
    .nonnegative(
      "El precio no puede ser negativo",
    ),

  subtotal: z
    .number()
    .nonnegative(
      "El subtotal no puede ser negativo",
    ),

  unidad: z
    .string()
    .min(1, "La unidad es obligatoria"),

  IdGranja: z
    .string()
    .min(1, "La granja es obligatoria"),

  IdMunicipalidad: z
    .string()
    .min(
      1,
      "La municipalidad es obligatoria",
    ),
});

/**
 * Validación para crear un pedido.
 */
export const crearPedidoSchema = z.object({
  usuarioId: z
    .string()
    .min(1, "El usuario es obligatorio"),

  productos: z
    .array(pedidoProductoSchema)
    .min(
      1,
      "El pedido debe contener al menos un producto",
    ),

  subtotal: z
    .number()
    .nonnegative(
      "El subtotal no puede ser negativo",
    ),

  total: z
    .number()
    .nonnegative(
      "El total no puede ser negativo",
    ),

  IdMunicipalidad: z
    .string()
    .min(
      1,
      "La municipalidad de entrega es obligatoria",
    ),

  direccionEntrega: z
    .string()
    .min(
      5,
      "La dirección de entrega es demasiado corta",
    )
    .max(
      300,
      "La dirección de entrega es demasiado larga",
    ),
});

/**
 * Validación para cancelar un pedido.
 */
export const cancelarPedidoSchema = z.object({
  pedidoId: z
    .string()
    .min(1, "El pedido es obligatorio"),

  motivo: z
    .string()
    .max(
      500,
      "El motivo no puede superar los 500 caracteres",
    )
    .optional(),
});

/**
 * Tipos derivados de los schemas.
 */
export type PedidoProductoInput = z.infer<
  typeof pedidoProductoSchema
>;

export type CrearPedidoInput = z.infer<
  typeof crearPedidoSchema
>;

export type CancelarPedidoInput = z.infer<
  typeof cancelarPedidoSchema
>;