import { z } from "zod";

/**
 * Validación para crear o actualizar un producto.
 */
export const productoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(
      1,
      "El código del producto es obligatorio",
    )
    .max(
      50,
      "El código del producto es demasiado largo",
    ),

  nombre: z
    .string()
    .trim()
    .min(
      1,
      "El nombre del producto es obligatorio",
    )
    .max(
      150,
      "El nombre del producto es demasiado largo",
    ),

  descripcion: z
    .string()
    .trim()
    .max(
      1000,
      "La descripción es demasiado larga",
    ),

  precio: z
    .number()
    .finite()
    .nonnegative(
      "El precio no puede ser negativo",
    ),

  stock: z
    .number()
    .int(
      "El stock debe ser un número entero",
    )
    .nonnegative(
      "El stock no puede ser negativo",
    ),

  /**
   * Referencia a categorias.
   */
  IdCategoria: z
    .string()
    .trim()
    .min(
      1,
      "La categoría es obligatoria",
    ),

  /**
   * Referencia a presentaciones.
   */
  IdPresentacion: z
    .string()
    .trim()
    .min(
      1,
      "La presentación es obligatoria",
    ),

  /**
   * Referencia a la granja productora.
   */
  IdGranja: z
    .string()
    .trim()
    .min(
      1,
      "La granja es obligatoria",
    ),

  /**
   * Referencia a la municipalidad
   * donde está ubicada la granja.
   */
  IdMunicipalidad: z
    .string()
    .trim()
    .min(
      1,
      "La municipalidad es obligatoria",
    ),

  /**
   * Ruta del archivo dentro de
   * Firebase Storage.
   */
  imgPath: z
    .string()
    .trim()
    .min(
      1,
      "La ruta de la imagen es obligatoria",
    ),

  /**
   * Nombre del archivo almacenado.
   */
  imageName: z
    .string()
    .trim()
    .min(
      1,
      "El nombre de la imagen es obligatorio",
    ),

  activo: z.boolean(),

  /**
   * Se maneja como fecha opcional porque
   * Firebase puede utilizar Timestamp.
   */
  fechaCreacion: z
    .unknown()
    .nullable()
    .optional(),

  ultimaActualizacion: z
    .unknown()
    .nullable()
    .optional(),

  /**
   * null mientras el producto siga
   * disponible en la tienda.
   */
  fechaCierre: z
    .unknown()
    .nullable()
    .optional(),
});

/**
 * Tipo TypeScript derivado del schema.
 */
export type ProductoInput = z.infer<
  typeof productoSchema
>;