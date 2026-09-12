import { z } from "zod";

/**
 * Roles disponibles dentro del sistema.
 */
export const rolUsuarioSchema = z.enum([
  "consumidor",
  "repartidor",
  "admin",
]);

export type RolUsuario = z.infer<
  typeof rolUsuarioSchema
>;

/**
 * Datos básicos de un usuario.
 */
export const usuarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(
      2,
      "El nombre debe tener al menos 2 caracteres",
    )
    .max(
      100,
      "El nombre es demasiado largo",
    ),

  correo: z
    .string()
    .trim()
    .email("El correo electrónico no es válido"),

  telefono: z
    .string()
    .trim()
    .min(
      7,
      "El teléfono no es válido",
    )
    .max(
      20,
      "El teléfono es demasiado largo",
    ),

  rol: rolUsuarioSchema,

  activo: z.boolean(),

  IdMunicipalidad: z
    .string()
    .trim()
    .min(
      1,
      "La municipalidad es obligatoria",
    ),

  direccion: z
    .string()
    .trim()
    .max(
      300,
      "La dirección es demasiado larga",
    )
    .optional()
    .default(""),
});

/**
 * Tipo TypeScript generado desde el esquema.
 */
export type UsuarioInput = z.infer<
  typeof usuarioSchema
>;

/**
 * Datos permitidos durante el registro.
 *
 * El usuario NO puede elegir su propio rol.
 * Todo usuario nuevo comienza como consumidor.
 */
export const registroUsuarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(
      2,
      "El nombre debe tener al menos 2 caracteres",
    )
    .max(
      100,
      "El nombre es demasiado largo",
    ),

  correo: z
    .string()
    .trim()
    .email(
      "El correo electrónico no es válido",
    ),

  telefono: z
    .string()
    .trim()
    .min(
      7,
      "El teléfono no es válido",
    )
    .max(
      20,
      "El teléfono es demasiado largo",
    ),

  IdMunicipalidad: z
    .string()
    .trim()
    .min(
      1,
      "La municipalidad es obligatoria",
    ),

  direccion: z
    .string()
    .trim()
    .max(
      300,
      "La dirección es demasiado larga",
    )
    .optional()
    .default(""),
});

export type RegistroUsuarioInput =
  z.infer<typeof registroUsuarioSchema>;

/**
 * Actualización de información del usuario.
 *
 * El rol no se incluye aquí porque solamente
 * puede modificarse mediante la API administrativa.
 */
export const actualizarUsuarioSchema =
  usuarioSchema
    .omit({
      rol: true,
    })
    .partial();

export type ActualizarUsuarioInput =
  z.infer<
    typeof actualizarUsuarioSchema
  >;

/**
 * Cambio de rol.
 *
 * Esta validación será utilizada exclusivamente
 * por la API de administración.
 */
export const cambiarRolUsuarioSchema =
  z.object({
    usuarioId: z
      .string()
      .trim()
      .min(
        1,
        "El ID del usuario es obligatorio",
      ),

    rol: rolUsuarioSchema,
  });

export type CambiarRolUsuarioInput =
  z.infer<
    typeof cambiarRolUsuarioSchema
  >;