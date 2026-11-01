import { describe, expect, it } from "vitest";

import { resolveAvailability, type AvailabilityConfiguration } from "@/lib/availability";

const configuration = (value: Partial<AvailabilityConfiguration>): AvailabilityConfiguration => ({
  id: value.id ?? "config",
  scope: value.scope ?? "default",
  targetId: value.targetId ?? "__default__",
  message: value.message ?? "Mensaje",
  active: value.active ?? true,
  color: value.color ?? "#b42318",
  variant: value.variant ?? "soft",
  priority: value.priority ?? 0,
  updatedAt: value.updatedAt,
});

describe("resolveAvailability", () => {
  it("prioriza producto sobre categoría y default", () => {
    const result = resolveAvailability(
      { id: "p1", categoria: "Frutas" },
      [
        configuration({ id: "default", message: "Default" }),
        configuration({ id: "category", scope: "categoria", targetId: "Frutas", message: "Categoría" }),
        configuration({ id: "product", scope: "producto", targetId: "p1", message: "Producto" }),
      ],
    );

    expect(result.message).toBe("Producto");
    expect(result.source).toBe("producto");
  });

  it("aplica una sola configuración de grupo de forma determinista", () => {
    const result = resolveAvailability(
      { id: "p1", categoria: "Frutas" },
      [
        configuration({ id: "z", scope: "categoria", targetId: "Frutas", message: "Última por ID", priority: 2 }),
        configuration({ id: "a", scope: "categoria", targetId: "Frutas", message: "Mayor prioridad", priority: 3 }),
      ],
    );

    expect(result.message).toBe("Mayor prioridad");
  });

  it("ignora configuraciones desactivadas y conserva el fallback", () => {
    const result = resolveAvailability(
      { id: "p1", categoria: "Frutas" },
      [
        configuration({ id: "disabled", scope: "producto", targetId: "p1", message: "No debe aparecer", active: false }),
        configuration({ id: "default", message: "Sin disponibilidad" }),
      ],
    );

    expect(result.message).toBe("Sin disponibilidad");
    expect(result.source).toBe("default");
  });
});
