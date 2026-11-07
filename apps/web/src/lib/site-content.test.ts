import { describe, expect, it } from "vitest";

import {
  mergeSiteContent,
  normalizeSiteContent,
} from "@/lib/site-content";
import type { AliadosContent } from "@/lib/site-content";

describe("contenido editable del sitio", () => {
  it("conserva los valores predeterminados cuando Firestore aún no tiene documento", () => {
    const content = mergeSiteContent("productos", null);

    expect(content.heroTitleLead).toBe("Compra productos");
    expect(content.heroImage.url).toBe("/images/backgrounds/alimentos.webp");
  });

  it("mezcla una actualización parcial sin perder campos nuevos", () => {
    const content = mergeSiteContent("fincas", {
      heroTitle: "Visita nuestras fincas en temporada",
    });

    expect(content.heroTitle).toBe("Visita nuestras fincas en temporada");
    expect(content.heroImage.url).toBe("/images/backgrounds/banner-campo.webp");
  });

  it("rechaza enlaces e imágenes fuera de los proveedores permitidos", () => {
    const result = normalizeSiteContent("contacto", {
      ...mergeSiteContent("contacto", null),
      whatsappUrl: "javascript:alert(1)",
      heroImage: {
        url: "https://sitio-no-autorizado.example/image.jpg",
        publicId: null,
        alt: "",
      },
    });

    expect(result.errors).toHaveLength(2);
  });

  it("valida la velocidad y conserva la galería de aliados", () => {
    const content = mergeSiteContent("aliados", null);
    const result = normalizeSiteContent("aliados", {
      ...content,
      speed: 0.35,
      items: content.items.slice(0, 2),
    });

    expect(result.errors).toHaveLength(0);
    const allies = result.data as AliadosContent;
    expect(allies.speed).toBe(0.35);
    expect(allies.items).toHaveLength(2);
  });
});

