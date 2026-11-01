export const MEDIOS_PAGO = [
  "efectivo",
  "transferencia",
  "nequi",
] as const;

export type MedioPago = (typeof MEDIOS_PAGO)[number];

export function normalizeMedioPago(
  value: unknown,
): MedioPago | null {
  const medio =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  return MEDIOS_PAGO.includes(
    medio as MedioPago,
  )
    ? (medio as MedioPago)
    : null;
}

export function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function paymentChange(
  total: number,
  received: number,
): number {
  return Math.max(
    0,
    Math.round((received - total) * 100) / 100,
  );
}

export function paymentLabel(
  value: unknown,
): string {
  switch (normalizeMedioPago(value)) {
    case "efectivo":
      return "Efectivo";
    case "transferencia":
      return "Transferencia";
    case "nequi":
      return "Nequi";
    default:
      return "Sin registrar";
  }
}
