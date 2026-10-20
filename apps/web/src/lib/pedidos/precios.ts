export const TIPOS_PRECIO = [
  "precioVenta",
  "costoProduccion",
  "precioBase",
  "precioSugerido",
  "personalizado",
] as const;

export type TipoPrecio = (typeof TIPOS_PRECIO)[number];

export const etiquetaTipoPrecio: Record<TipoPrecio, string> = {
  precioVenta: "Precio de venta",
  costoProduccion: "Costo de producción",
  precioBase: "Precio base",
  precioSugerido: "Precio sugerido",
  personalizado: "Personalizado",
};

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function normalizeTipoPrecio(value: unknown): TipoPrecio {
  return TIPOS_PRECIO.includes(value as TipoPrecio)
    ? (value as TipoPrecio)
    : "precioVenta";
}

export function calcularPrecioLinea(
  product: Record<string, unknown>,
  tipoPrecio: unknown = "precioVenta",
  precioPersonalizado?: unknown,
) {
  const tipo = normalizeTipoPrecio(tipoPrecio);
  const precioBase =
    tipo === "personalizado"
      ? numberValue(precioPersonalizado ?? product.precioPersonalizado)
      : tipo === "costoProduccion"
      ? numberValue(product.costoPcc)
      : tipo === "precioBase"
        ? numberValue(product.precio)
        : tipo === "precioSugerido"
          ? numberValue(product.precioSugerido)
          : numberValue(product.precioVenta ?? product.precio);

  const porcentajeLogistica = numberValue(
    product.porcentajeLogistica,
  );
  const porcentajeTransporte = numberValue(
    product.porcentajeTransporte,
  );
  const logisticaUnitario =
    precioBase * (porcentajeLogistica / 100);
  const transporteUnitario =
    precioBase * (porcentajeTransporte / 100);

  return {
    tipoPrecio: tipo,
    precioBase,
    porcentajeLogistica,
    porcentajeTransporte,
    logisticaUnitario,
    transporteUnitario,
    precioUnitario:
      precioBase +
      logisticaUnitario +
      transporteUnitario,
  };
}
