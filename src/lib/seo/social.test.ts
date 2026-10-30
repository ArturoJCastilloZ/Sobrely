import { describe, expect, it } from "vitest";
import { metadatosSociales } from "./social";

describe("metadatosSociales", () => {
  const m = metadatosSociales({ titulo: "T", descripcion: "D", ruta: "/pricing" });

  it("declara la imagen en OG y en Twitter", () => {
    expect(m.openGraph?.images).toHaveLength(1);
    expect(m.twitter?.images).toEqual(["/opengraph-image"]);
  });

  it("usa el título, la descripción y la ruta de la página, no los de la home", () => {
    expect(m.openGraph).toMatchObject({ title: "T", description: "D", url: "/pricing" });
    expect(m.twitter).toMatchObject({ title: "T", description: "D" });
  });

  it("acepta una imagen propia y la usa en OG y Twitter", () => {
    const img = metadatosSociales({
      titulo: "T", descripcion: "D", ruta: "/x", imagen: { url: "/a.jpg", alt: "A" },
    });
    expect(img.openGraph?.images).toEqual([{ url: "/a.jpg", alt: "A" }]);
    expect(img.twitter?.images).toEqual(["/a.jpg"]);
  });

  it("«del-segmento» no declara imagen (la pone opengraph-image.tsx de la ruta)", () => {
    const seg = metadatosSociales({ titulo: "T", descripcion: "D", ruta: "/x", imagen: "del-segmento" });
    expect(seg.openGraph).not.toHaveProperty("images");
    expect(seg.twitter).not.toHaveProperty("images");
  });

  it("sinMarca quita og:site_name; por omisión es «Sobrely»", () => {
    expect(m.openGraph).toMatchObject({ siteName: "Sobrely" });
    const sin = metadatosSociales({ titulo: "T", descripcion: "D", ruta: "/x", sinMarca: true });
    expect(sin.openGraph).not.toHaveProperty("siteName");
  });

  it("solo marca publishedTime en artículos", () => {
    const art = metadatosSociales({
      titulo: "T", descripcion: "D", ruta: "/blog/x", tipo: "article", publicadoEn: "2026-01-01",
    });
    expect(art.openGraph).toMatchObject({ type: "article", publishedTime: "2026-01-01" });
    expect(m.openGraph).not.toHaveProperty("publishedTime");
  });
});
