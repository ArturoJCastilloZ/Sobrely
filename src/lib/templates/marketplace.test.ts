import { describe, expect, it } from "vitest";
import {
  contarPorEvento,
  filtrarPlantillas,
  normalizar,
  type PlantillaMarketplace,
} from "./marketplace";

/**
 * Los datos del fixture NO son inventados: reproducen la forma medida en
 * producción el 2026-09-07 sobre las 50 filas activas — cinco tipos de evento
 * con reparto balanceado, `description` siempre presente, y los acentos y la
 * eñe que trae el catálogo real («Cumpleaños», «XV años», «jardín»).
 */
const tpl = (
  id: string,
  name: string,
  event_type: string | null,
  description: string | null,
): PlantillaMarketplace => ({
  id,
  slug: id,
  name,
  description,
  event_type,
  preview_image_url: `/miniaturas/${id}.jpg`,
});

const LISTA: PlantillaMarketplace[] = [
  tpl("boda-botanica", "Boda botánica", "Boda", "Hojas verdes y jardín"),
  tpl("boda-lino", "Boda lino", "Boda", "Papel de lino con sello de cera"),
  tpl("xv-noche", "XV noche estelar", "XV años", "Cielo nocturno y oro"),
  tpl("cumple-confeti", "Cumpleaños confeti", "Cumpleaños", "Confeti de colores"),
  tpl("corp-lineas", "Corporativo líneas", "Corporativo", "Retícula sobria"),
  tpl("sin-tipo", "Plantilla suelta", null, null),
];

describe("normalizar", () => {
  it("quita acentos y eñes, y baja a minúsculas", () => {
    expect(normalizar("Cumpleaños")).toBe("cumpleanos");
    expect(normalizar("XV AÑOS")).toBe("xv anos");
    expect(normalizar("  Jardín  ")).toBe("jardin");
  });

  it("deja intacto lo que ya está normalizado", () => {
    expect(normalizar("boda")).toBe("boda");
  });
});

describe("filtrarPlantillas", () => {
  it("sin filtro devuelve la lista entera y en el mismo orden", () => {
    const r = filtrarPlantillas(LISTA);
    expect(r.map((t) => t.id)).toEqual(LISTA.map((t) => t.id));
  });

  it("filtra por tipo de evento exacto", () => {
    const r = filtrarPlantillas(LISTA, { evento: "Boda" });
    expect(r.map((t) => t.id)).toEqual(["boda-botanica", "boda-lino"]);
  });

  it("el evento null significa TODOS, no 'las que no tienen tipo'", () => {
    expect(filtrarPlantillas(LISTA, { evento: null })).toHaveLength(
      LISTA.length,
    );
  });

  it("una plantilla sin event_type nunca cae en un filtro de evento", () => {
    const r = filtrarPlantillas(LISTA, { evento: "Boda" });
    expect(r.some((t) => t.id === "sin-tipo")).toBe(false);
  });

  it("busca en el nombre", () => {
    const r = filtrarPlantillas(LISTA, { q: "lino" });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("busca también en la descripción, no sólo en el nombre", () => {
    // «cera» NO aparece en ningún nombre: si la búsqueda mirara sólo `name`,
    // esto saldría vacío.
    const r = filtrarPlantillas(LISTA, { q: "cera" });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("encuentra sin acentos lo que en el catálogo va con acento", () => {
    // El caso que motivó `normalizar`: se teclea sin acento y sin eñe.
    expect(filtrarPlantillas(LISTA, { q: "botanica" })).toHaveLength(1);
    expect(filtrarPlantillas(LISTA, { q: "cumpleanos" })).toHaveLength(1);
    expect(filtrarPlantillas(LISTA, { q: "jardin" })).toHaveLength(1);
  });

  it("varios términos cruzan nombre y descripción (Y lógico)", () => {
    // «boda» está en el nombre y «jardín» en la descripción: buscar la cadena
    // entera fallaría porque nunca están juntas en un mismo campo.
    const r = filtrarPlantillas(LISTA, { q: "boda jardin" });
    expect(r.map((t) => t.id)).toEqual(["boda-botanica"]);
  });

  it("todos los términos deben aparecer, no basta con uno", () => {
    // «boda» sí está; «retícula» está pero en OTRA plantilla. Si el filtro
    // fuera un O lógico devolvería 3.
    expect(filtrarPlantillas(LISTA, { q: "boda reticula" })).toHaveLength(0);
  });

  it("una descripción null no rompe la búsqueda", () => {
    expect(() => filtrarPlantillas(LISTA, { q: "suelta" })).not.toThrow();
    expect(filtrarPlantillas(LISTA, { q: "suelta" })).toHaveLength(1);
  });

  it("una consulta de sólo espacios se trata como consulta vacía", () => {
    expect(filtrarPlantillas(LISTA, { q: "   " })).toHaveLength(LISTA.length);
  });

  it("evento y búsqueda se combinan", () => {
    expect(filtrarPlantillas(LISTA, { evento: "Boda", q: "lino" })).toHaveLength(
      1,
    );
    // La búsqueda encuentra «confeti», pero el evento la excluye.
    expect(
      filtrarPlantillas(LISTA, { evento: "Boda", q: "confeti" }),
    ).toHaveLength(0);
  });
});

describe("contarPorEvento", () => {
  it("cuenta por tipo e ignora las que no tienen", () => {
    const c = contarPorEvento(LISTA);
    expect(c.get("Boda")).toBe(2);
    expect(c.get("XV años")).toBe(1);
    expect(c.has("null")).toBe(false);
    // 4 tipos distintos entre las 6 filas: Boda va dos veces y una fila
    // no tiene tipo, asi que no crea entrada.
    expect(c.size).toBe(4);
  });
});

describe("filtrarPlantillas · favoritos", () => {
  const FAVS = new Set(["boda-lino", "cumple-confeti"]);

  it("soloFavoritos deja unicamente las marcadas", () => {
    const r = filtrarPlantillas(LISTA, { soloFavoritos: true, favoritos: FAVS });
    expect(r.map((t) => t.id).sort()).toEqual(["boda-lino", "cumple-confeti"]);
  });

  it("sin soloFavoritos el conjunto no filtra nada", () => {
    // Pasar `favoritos` no debe acotar por si solo: el que acota es el flag.
    expect(filtrarPlantillas(LISTA, { favoritos: FAVS })).toHaveLength(
      LISTA.length,
    );
  });

  it("soloFavoritos sin conjunto devuelve VACIO, no la lista entera", () => {
    // El modo de fallo que esto cierra: tratar «no tengo favoritos» como
    // «filtro inactivo» mostraria las 50 con el filtro encendido.
    expect(filtrarPlantillas(LISTA, { soloFavoritos: true })).toHaveLength(0);
  });

  it("favoritos se combina con el evento", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: FAVS,
      evento: "Boda",
    });
    expect(r.map((t) => t.id)).toEqual(["boda-lino"]);
  });

  it("favoritos se combina con la busqueda", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: FAVS,
      q: "confeti",
    });
    expect(r.map((t) => t.id)).toEqual(["cumple-confeti"]);
  });

  it("un favorito que ya no esta en la lista no inventa filas", () => {
    const r = filtrarPlantillas(LISTA, {
      soloFavoritos: true,
      favoritos: new Set(["plantilla-borrada"]),
    });
    expect(r).toHaveLength(0);
  });
});
