export type AvailabilityScope =
  | "default"
  | "producto"
  | "categoria"
  | "grupo";

export type AvailabilityVariant = "soft" | "solid" | "outline";

export interface AvailabilityConfiguration {
  id: string;
  scope: AvailabilityScope;
  targetId: string;
  message: string;
  active: boolean;
  color: string;
  variant: AvailabilityVariant;
  priority: number;
  updatedAt?: unknown;
}

export interface AvailabilityProduct {
  id: string;
  categoria?: string;
  grupo?: string;
  grupos?: string[];
}

export interface ResolvedAvailability {
  message: string;
  color: string;
  variant: AvailabilityVariant;
  source: AvailabilityScope;
  configurationId: string | null;
}

export const DEFAULT_AVAILABILITY_MESSAGE = "Sin stock";
export const DEFAULT_AVAILABILITY_COLOR = "#b42318";

function dateValue(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return Number(value.toMillis()) || 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return Date.parse(value) || 0;
  }

  return 0;
}

function normalizeTarget(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sortConfigurations(
  left: AvailabilityConfiguration,
  right: AvailabilityConfiguration,
): number {
  return (
    right.priority - left.priority ||
    dateValue(right.updatedAt) - dateValue(left.updatedAt) ||
    left.id.localeCompare(right.id)
  );
}

/**
 * Resuelve el mensaje sin depender del orden en que Firestore devuelva
 * los documentos. La precedencia es: producto, grupo/categoría, default.
 * Dentro de un mismo nivel gana prioridad, fecha de actualización e ID.
 */
export function resolveAvailability(
  product: AvailabilityProduct,
  configurations: AvailabilityConfiguration[],
): ResolvedAvailability {
  const active = configurations.filter(
    (configuration) =>
      configuration.active &&
      configuration.message.trim(),
  );

  const individual = active
    .filter(
      (configuration) =>
        configuration.scope === "producto" &&
        configuration.targetId === product.id,
    )
    .sort(sortConfigurations)[0];

  if (individual) {
    return {
      message: individual.message.trim(),
      color: individual.color || DEFAULT_AVAILABILITY_COLOR,
      variant: individual.variant || "soft",
      source: "producto",
      configurationId: individual.id,
    };
  }

  const groups = new Set<string>();
  const category = normalizeTarget(product.categoria);
  const group = normalizeTarget(product.grupo);

  if (category) groups.add(category);
  if (group) groups.add(group);
  for (const value of product.grupos ?? []) {
    const normalized = normalizeTarget(value);
    if (normalized) groups.add(normalized);
  }

  const grouped = active
    .filter(
      (configuration) =>
        (configuration.scope === "categoria" ||
          configuration.scope === "grupo") &&
        groups.has(configuration.targetId),
    )
    .sort(sortConfigurations)[0];

  if (grouped) {
    return {
      message: grouped.message.trim(),
      color: grouped.color || DEFAULT_AVAILABILITY_COLOR,
      variant: grouped.variant || "soft",
      source: grouped.scope,
      configurationId: grouped.id,
    };
  }

  const fallback = active
    .filter((configuration) => configuration.scope === "default")
    .sort(sortConfigurations)[0];

  return {
    message: fallback?.message.trim() || DEFAULT_AVAILABILITY_MESSAGE,
    color: fallback?.color || DEFAULT_AVAILABILITY_COLOR,
    variant: fallback?.variant || "soft",
    source: "default",
    configurationId: fallback?.id ?? null,
  };
}
