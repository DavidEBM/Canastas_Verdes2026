export const ESTADOS = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const TRANSICIONES: Record<
  Estado,
  readonly Estado[]
> = {
  pendiente: [
    "asignado",
    "cancelado",
  ],

  asignado: [
    "en_camino",
    "cancelado",
  ],

  en_camino: [
    "entregado",
  ],

  entregado: [],

  cancelado: [],
};

export function normalizeEstado(
  value: unknown,
): Estado | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return ESTADOS.includes(
    value as Estado,
  )
    ? (value as Estado)
    : null;
}

export function puedeTransicionar(
  estadoActual: Estado,
  nuevoEstado: Estado,
): boolean {
  if (
    estadoActual === nuevoEstado
  ) {
    return true;
  }

  return TRANSICIONES[
    estadoActual
  ].includes(nuevoEstado);
}