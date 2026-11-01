import { describe, expect, it } from "vitest";

import {
  normalizeMedioPago,
  paymentChange,
} from "../../../apps/web/src/lib/pagos";

describe("pagos", () => {
  it("normaliza los medios permitidos", () => {
    expect(normalizeMedioPago("Efectivo")).toBe("efectivo");
    expect(normalizeMedioPago("NEQUI")).toBe("nequi");
    expect(normalizeMedioPago("tarjeta")).toBeNull();
  });

  it("calcula el cambio sin errores de precisión monetaria", () => {
    expect(paymentChange(10000, 15000)).toBe(5000);
    expect(paymentChange(10000, 9999)).toBe(0);
  });
});
