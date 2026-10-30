import { describe, expect, it } from "vitest";
import { metadatosDeFicha } from "./ficha-plantilla";

const TPL = {
  slug: "baby-nubes-luna",
  name: "Nubes y luna",
  description: "Nubes suaves y una luna dormida.",
  event_type: "Baby shower",
  preview_image_url: "/previews/plantillas/baby-nubes-luna.jpg",
  estilo: "romantico" as const,
};

describe("metadatosDeFicha", () => {
  const m = metadatosDeFicha(TPL);

  it("la tarjeta es la de la ficha, no la de la home", () => {
    expect(m.openGraph).toMatchObject({
      url: "/plantillas/baby-nubes-luna",
      title: "Nubes y luna · Plantilla · Sobrely",
      images: [{ url: "/previews/plantillas/baby-nubes-luna.jpg", alt: "Plantilla Nubes y luna" }],
    });
    expect(m.twitter).toMatchObject({ images: ["/previews/plantillas/baby-nubes-luna.jpg"] });
  });

  it("descripción propia: tipo, estilo y la descripción de la plantilla", () => {
    expect(m.description).toBe(
      "Plantilla de invitación digital para Baby shower, estilo romántico. Nubes suaves y una luna dormida.",
    );
  });

  it("conserva noindex y declara canonical propio", () => {
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates).toEqual({ canonical: "/plantillas/baby-nubes-luna" });
  });

  it("sin miniatura cae a la imagen genérica en vez de quedarse sin imagen", () => {
    const sin = metadatosDeFicha({ ...TPL, preview_image_url: null, estilo: null, description: null });
    expect(sin.openGraph).toMatchObject({ images: [expect.objectContaining({ url: "/opengraph-image" })] });
    expect(sin.description).toBe("Plantilla de invitación digital para Baby shower.");
  });
});
